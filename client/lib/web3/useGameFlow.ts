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
  const { writeContract: claimPrizeWrite, data: claimPrizeHash, error: claimPrizeError } = useWriteContract();
  
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess, isError: isApproveError } = useWaitForTransactionReceipt({ hash: approveHash });
  const { 
    isLoading: isPayForGrabConfirming, 
    isSuccess: isPayForGrabSuccess, 
    isError: isPayForGrabError,
    error: payForGrabReceiptError 
  } = useWaitForTransactionReceipt({ 
    hash: payForGrabHash 
  });
  const { 
    isLoading: isClaimPrizeConfirming, 
    isSuccess: isClaimPrizeSuccess, 
    isError: isClaimPrizeError 
  } = useWaitForTransactionReceipt({ 
    hash: claimPrizeHash 
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

  // Log transaction hash immediately when available
  useEffect(() => {
    if (claimPrizeHash) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⏳ NFT CLAIM TRANSACTION SUBMITTED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Transaction Hash:', claimPrizeHash);
      console.log('🔗 Etherscan:', `https://sepolia.etherscan.io/tx/${claimPrizeHash}`);
      console.log('⏳ Waiting for confirmation...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }, [claimPrizeHash]);

  // Log token ID when claimPrize succeeds
  useEffect(() => {
    if (isClaimPrizeSuccess && claimPrizeHash) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 NFT MINTED SUCCESSFULLY!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Transaction Hash:', claimPrizeHash);
      console.log('🔗 Etherscan:', `https://sepolia.etherscan.io/tx/${claimPrizeHash}`);
      console.log('');
      console.log('📦 TO IMPORT NFT TO METAMASK:');
      console.log('   1. Open MetaMask → NFTs tab → Import NFT');
      console.log('   2. Contract: 0x6e3703Fa98a6cEA8086599ef407cB863e7425759');
      console.log('   3. Token ID: Check Etherscan link above, look for "Logs" tab');
      console.log('      The token ID is in the PrizeClaimed event (tokenId field)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }, [isClaimPrizeSuccess, claimPrizeHash]);

  // Handle claimPrize errors
  useEffect(() => {
    if (claimPrizeError || isClaimPrizeError) {
      console.error('ClaimPrize error:', claimPrizeError);
    }
  }, [claimPrizeError, isClaimPrizeError]);

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
  const submitWin = useCallback(async (prizeId: number, replayData: any) => {
    if (!address) return null;

    try {
      // Use sessionId from replayData (generated when recording started)
      const sessionId = replayData.sessionId || `session_${address}_${Date.now()}`;
      
      // Backend will generate unique AI image for this prize
      const response = await fetch(API_ENDPOINTS.game.submitWin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          walletAddress: address,
          prizeId,
          replayData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Backend error:', errorData);
        throw new Error(errorData.error || `Failed to submit win: ${response.status}`);
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
        account: address,
      });
      
      console.log('Contract address:', clawMachineAddress);

      claimPrizeWrite({
        address: clawMachineAddress,
        abi: CLAWMACHINE_ABI,
        functionName: 'claimPrize',
        args: [
          BigInt(prizeId),
          metadataUri,
          replayDataHash,
          Number(difficulty), // Ensure it's a plain number for uint8
          BigInt(nonce),
          signature as `0x${string}`
        ],
        gas: BigInt(500000), // Increased from 300000 to prevent out-of-gas
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
  }, [address, claimPrizeWrite, clawMachineAddress]);

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
