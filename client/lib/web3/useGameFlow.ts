'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  useTokenBalance,
  useTokenAllowance,
  useGameCost,
  CONTRACTS,
  CLAWMACHINE_ABI,
  GAMETOKEN_ABI,
  API_ENDPOINTS,
} from '@/lib/web3';
import { sepolia } from 'wagmi/chains';

export interface GameState {
  isApproving: boolean;
  isPaying: boolean;
  needsApproval: boolean;
  error: string | null;
}

export function useGameFlow(chainId: number = sepolia.id) {
  const { address } = useAccount();
  const { data: balance } = useTokenBalance(address, chainId);
  const { data: gameCost } = useGameCost(chainId);
  
  const clawMachineAddress = chainId === sepolia.id 
    ? CONTRACTS.sepolia.clawMachine 
    : CONTRACTS.polygonAmoy.clawMachine;
  
  const tokenAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.gameToken
    : CONTRACTS.polygonAmoy.gameToken;

  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(
    address,
    clawMachineAddress,
    chainId
  );

  const { writeContract: approveWrite, data: approveHash, error: approveError } = useWriteContract();
  const { writeContract: payForGrabWrite, data: payForGrabHash, error: payForGrabError } = useWriteContract();
  
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess, isError: isApproveError } = useWaitForTransactionReceipt({ hash: approveHash });
  const { 
    isLoading: isPayForGrabConfirming, 
    isSuccess: isPayForGrabSuccess, 
    isError: isPayForGrabError,
    error: payForGrabReceiptError 
  } = useWaitForTransactionReceipt({ 
    hash: payForGrabHash 
  });

  const [state, setState] = useState<GameState>({
    isApproving: false,
    isPaying: false,
    needsApproval: false,
    error: null,
  });

  // Update approval state
  useEffect(() => {
    if (allowance !== undefined && gameCost !== undefined) {
      const needsApproval = allowance < gameCost;
      setState(prev => ({ ...prev, needsApproval }));
    }
  }, [allowance, gameCost]);

  // Update state when approve confirms
  useEffect(() => {
    if (isApproveSuccess) {
      setState(prev => ({ ...prev, isApproving: false, needsApproval: false }));
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  // Handle approve errors
  useEffect(() => {
    if (approveError || isApproveError) {
      setState(prev => ({ 
        ...prev, 
        isApproving: false, 
        error: approveError?.message || 'Approval failed' 
      }));
    }
  }, [approveError, isApproveError]);

  // Update state when payForGrab confirms
  useEffect(() => {
    if (isPayForGrabSuccess) {
      console.log('PayForGrab successful! Hash:', payForGrabHash);
      setState(prev => ({ ...prev, isPaying: false }));
    }
  }, [isPayForGrabSuccess, payForGrabHash]);

  // Handle payForGrab errors
  useEffect(() => {
    if (payForGrabError || isPayForGrabError) {
      console.error('PayForGrab error:', {
        writeError: payForGrabError,
        receiptError: isPayForGrabError,
        receiptErrorDetails: payForGrabReceiptError,
        message: payForGrabError?.message || payForGrabReceiptError?.message,
      });
      setState(prev => ({ 
        ...prev, 
        isPaying: false, 
        error: payForGrabError?.message || payForGrabReceiptError?.message || 'Failed to pay for grab' 
      }));
    }
  }, [payForGrabError, isPayForGrabError, payForGrabReceiptError]);

  // Check if approval is needed
  const checkApproval = useCallback(() => {
    if (allowance && gameCost) {
      return allowance < gameCost;
    }
    return true;
  }, [allowance, gameCost]);

  // Approve tokens
  const approveTokens = useCallback(async () => {
    if (!gameCost) return;

    try {
      setState(prev => ({ ...prev, isApproving: true, error: null }));
      
      approveWrite({
        address: tokenAddress,
        abi: GAMETOKEN_ABI,
        functionName: 'approve',
        args: [clawMachineAddress, gameCost * BigInt(100)], // Approve for 100 grabs
        gas: BigInt(100000),
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isApproving: false, 
        error: error instanceof Error ? error.message : 'Approval failed' 
      }));
    }
  }, [gameCost, approveWrite, tokenAddress, clawMachineAddress]);

  // Pay for grab
  const payForGrab = useCallback(async (): Promise<boolean> => {
    if (!address) {
      console.error('Wallet not connected');
      return false;
    }

    if (!balance || !gameCost || balance < gameCost) {
      console.error('Insufficient balance:', balance?.toString(), '<', gameCost?.toString());
      setState(prev => ({ ...prev, error: 'Insufficient token balance' }));
      return false;
    }

    if (checkApproval()) {
      console.error('Tokens not approved');
      setState(prev => ({ ...prev, error: 'Please approve tokens first' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, isPaying: true, error: null }));

      console.log('Calling payForGrab on contract:', clawMachineAddress);
      
      payForGrabWrite({
        address: clawMachineAddress,
        abi: CLAWMACHINE_ABI,
        functionName: 'payForGrab',
        gas: BigInt(150000),
      });

      return true;
    } catch (error) {
      console.error('PayForGrab error:', error);
      setState(prev => ({ 
        ...prev, 
        isPaying: false,
        error: error instanceof Error ? error.message : 'Failed to pay for grab' 
      }));
      return false;
    }
  }, [address, balance, gameCost, checkApproval, payForGrabWrite, clawMachineAddress]);

  // Submit win to backend
  const submitWin = useCallback(async (prizeId: number, replayData: unknown) => {
    if (!address) return null;

    try {
      const response = await fetch(API_ENDPOINTS.submitWin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          prizeId,
          replayData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit win');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit win:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to submit win' 
      }));
      return null;
    }
  }, [address]);

  // Claim prize with signature
  const claimPrize = useCallback(async (
    prizeId: number,
    metadataUri: string,
    replayDataHash: string,
    difficulty: number,
    nonce: number,
    signature: string
  ): Promise<boolean> => {
    if (!address) {
      console.error('Wallet not connected');
      return false;
    }

    try {
      console.log('Claiming prize with params:', {
        prizeId,
        metadataUri,
        replayDataHash,
        difficulty,
        nonce,
        signature,
      });

      payForGrabWrite({
        address: clawMachineAddress,
        abi: CLAWMACHINE_ABI,
        functionName: 'claimPrize',
        args: [
          BigInt(prizeId),
          metadataUri,
          replayDataHash,
          difficulty,
          BigInt(nonce),
          signature as `0x${string}`
        ],
        gas: BigInt(300000),
      });

      return true;
    } catch (error) {
      console.error('Claim prize error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to claim prize' 
      }));
      return false;
    }
  }, [address, payForGrabWrite, clawMachineAddress]);

  return {
    state,
    balance,
    gameCost,
    checkApproval,
    approveTokens,
    payForGrab,
    submitWin,
    claimPrize,
    isApproveSuccess,
    isPayForGrabSuccess,
  };
}
