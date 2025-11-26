'use client';

import { useState, useCallback } from 'react';
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
  sessionId: bigint | null;
  isPlaying: boolean;
  isApproving: boolean;
  isStarting: boolean;
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

  const { writeContract: approveWrite, data: approveHash } = useWriteContract();
  const { writeContract: startGameWrite, data: startGameHash } = useWriteContract();
  
  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isStartGameConfirming, isSuccess: isStartGameSuccess } = useWaitForTransactionReceipt({ 
    hash: startGameHash 
  });

  const [state, setState] = useState<GameState>({
    sessionId: null,
    isPlaying: false,
    isApproving: false,
    isStarting: false,
    needsApproval: false,
    error: null,
  });

  // Check if approval is needed
  const checkApproval = useCallback(() => {
    if (allowance && gameCost) {
      const needsApproval = allowance < gameCost;
      setState(prev => ({ ...prev, needsApproval }));
      return needsApproval;
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
        args: [clawMachineAddress, gameCost * BigInt(100)], // Approve for 100 games
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isApproving: false, 
        error: error instanceof Error ? error.message : 'Approval failed' 
      }));
    }
  }, [gameCost, approveWrite, tokenAddress, clawMachineAddress]);

  // Start game
  const startGame = useCallback(async () => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    try {
      setState(prev => ({ ...prev, isStarting: true, error: null }));

      // Start game on blockchain
      startGameWrite({
        address: clawMachineAddress,
        abi: CLAWMACHINE_ABI,
        functionName: 'startGame',
      });

      return null; // Will be updated when transaction confirms
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isStarting: false, 
        error: error instanceof Error ? error.message : 'Failed to start game' 
      }));
      return null;
    }
  }, [address, startGameWrite, clawMachineAddress]);

  // Submit win to backend
  const submitWin = useCallback(async (
    sessionId: bigint,
    prizeId: number,
    replayData: any
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await fetch(API_ENDPOINTS.game.submitWin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.toString(),
          player: address,
          prizeId,
          replayData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit win to backend');
      }

      return await response.json();
    } catch (error) {
      console.error('Submit win error:', error);
      throw error;
    }
  }, [address]);

  // Claim prize on blockchain
  const claimPrize = useCallback(async (
    sessionId: bigint,
    prizeId: number,
    replayDataCID: string,
    signature: string
  ) => {
    const { writeContract } = useWriteContract();
    
    try {
      writeContract({
        address: clawMachineAddress,
        abi: CLAWMACHINE_ABI,
        functionName: 'claimPrize',
        args: [sessionId, prizeId, replayDataCID, signature as `0x${string}`],
      });
    } catch (error) {
      console.error('Claim prize error:', error);
      throw error;
    }
  }, [clawMachineAddress]);

  return {
    state,
    balance,
    gameCost,
    checkApproval,
    approveTokens,
    startGame,
    submitWin,
    claimPrize,
    isApproveConfirming,
    isStartGameConfirming,
    isStartGameSuccess,
  };
}
