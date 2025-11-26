'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
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

  // Check for active game session
  const { data: activeSession, refetch: refetchSession } = useReadContract({
    address: clawMachineAddress,
    abi: CLAWMACHINE_ABI,
    functionName: 'activeSessions',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract: approveWrite, data: approveHash, error: approveError } = useWriteContract();
  const { writeContract: startGameWrite, data: startGameHash, error: startGameError } = useWriteContract();
  const { writeContract: payForGrabWrite, data: payForGrabHash, error: payForGrabError } = useWriteContract();
  const { writeContract: forfeitWrite, data: forfeitHash, error: forfeitError } = useWriteContract();
  
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess, isError: isApproveError } = useWaitForTransactionReceipt({ hash: approveHash });
  const { 
    isLoading: isStartGameConfirming, 
    isSuccess: isStartGameSuccess, 
    isError: isStartGameError,
    error: startGameReceiptError 
  } = useWaitForTransactionReceipt({ 
    hash: startGameHash 
  });
  const { 
    isLoading: isPayForGrabConfirming, 
    isSuccess: isPayForGrabSuccess, 
    isError: isPayForGrabError,
    error: payForGrabReceiptError 
  } = useWaitForTransactionReceipt({ 
    hash: payForGrabHash 
  });
  const { isLoading: isForfeitConfirming, isSuccess: isForfeitSuccess, isError: isForfeitError } = useWaitForTransactionReceipt({ 
    hash: forfeitHash 
  });

  // Debug logging for startGame transaction states
  useEffect(() => {
    console.log('StartGame transaction state:', {
      hash: startGameHash,
      isConfirming: isStartGameConfirming,
      isSuccess: isStartGameSuccess,
      isError: isStartGameError,
      writeError: startGameError?.message,
      receiptError: startGameReceiptError,
    });
  }, [startGameHash, isStartGameConfirming, isStartGameSuccess, isStartGameError, startGameError, startGameReceiptError]);

  const [state, setState] = useState<GameState>({
    sessionId: null,
    isPlaying: false,
    isApproving: false,
    isStarting: false,
    isForfeitng: false,
    needsApproval: false,
    hasActiveSession: false,
    error: null,
  });

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

  // Update state when start game confirms
  useEffect(() => {
    if (isStartGameSuccess) {
      console.log('Start game successful! Hash:', startGameHash);
      setState(prev => ({ ...prev, isStarting: false, isPlaying: true }));
    }
  }, [isStartGameSuccess, startGameHash]);

  // Handle start game errors
  useEffect(() => {
    if (startGameError || isStartGameError) {
      console.error('Start game error:', {
        writeError: startGameError,
        receiptError: isStartGameError,
        receiptErrorDetails: startGameReceiptError,
        message: startGameError?.message || startGameReceiptError?.message,
      });
      setState(prev => ({ 
        ...prev, 
        isStarting: false, 
        error: startGameError?.message || startGameReceiptError?.message || 'Failed to start game' 
      }));
    }
  }, [startGameError, isStartGameError, startGameReceiptError]);

  // Reset isStarting if no hash after 5 seconds (user rejected)
  useEffect(() => {
    if (state.isStarting && !startGameHash) {
      const timeout = setTimeout(() => {
        setState(prev => {
          if (prev.isStarting && !startGameHash) {
            return { ...prev, isStarting: false, error: 'Transaction was not submitted' };
          }
          return prev;
        });
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [state.isStarting, startGameHash]);

  // Update approval state
  useEffect(() => {
    if (allowance !== undefined && gameCost !== undefined) {
      const needsApproval = allowance < gameCost;
      setState(prev => ({ ...prev, needsApproval }));
    }
  }, [allowance, gameCost]);

  // Update active session state
  useEffect(() => {
    if (activeSession && Array.isArray(activeSession)) {
      const hasActive = activeSession[2] === true; // active is the 3rd element
      setState(prev => ({ ...prev, hasActiveSession: hasActive }));
    }
  }, [activeSession]);

  // Update state when forfeit confirms
  useEffect(() => {
    if (isForfeitSuccess) {
      setState(prev => ({ ...prev, isForfeitng: false, hasActiveSession: false }));
      refetchSession();
    }
  }, [isForfeitSuccess, refetchSession]);

  // Handle forfeit errors
  useEffect(() => {
    if (forfeitError || isForfeitError) {
      setState(prev => ({ 
        ...prev, 
        isForfeitng: false, 
        error: forfeitError?.message || 'Failed to forfeit game' 
      }));
    }
  }, [forfeitError, isForfeitError]);

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
        args: [clawMachineAddress, gameCost * BigInt(100)], // Approve for 100 games
        gas: BigInt(100000), // Set reasonable gas limit
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isApproving: false, 
        error: error instanceof Error ? error.message : 'Approval failed' 
      }));
    }
  }, [gameCost, approveWrite, tokenAddress, clawMachineAddress]);

  // Forfeit active game
  const forfeitGame = useCallback(async (): Promise<boolean> => {
    if (!address) return false;

    try {
      setState(prev => ({ ...prev, isForfeitng: true, error: null }));
      
      forfeitWrite({
        address: clawMachineAddress,
        abi: CLAWMACHINE_ABI,
        functionName: 'forfeitGame',
        gas: BigInt(100000),
      });

      return true;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isForfeitng: false,
        error: error instanceof Error ? error.message : 'Failed to forfeit game' 
      }));
      return false;
    }
  }, [address, forfeitWrite, clawMachineAddress]);

  // Start game
  const startGame = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return false;
    }

    try {
      // Check if approval is needed first
      if (checkApproval()) {
        setState(prev => ({ ...prev, isApproving: true, error: null }));
        await approveTokens();
        return false; // Return false so caller knows to wait for approval
      }

      setState(prev => ({ ...prev, isStarting: true, error: null }));

      // Start game on blockchain
      console.log('Attempting startGame with:', {
        contract: clawMachineAddress,
        from: address,
        balance: balance?.toString(),
        allowance: allowance?.toString(),
        gameCost: gameCost?.toString(),
        hasEnoughBalance: balance && gameCost ? balance >= gameCost : false,
      });

      // Double-check balance before submitting
      if (!balance || !gameCost || balance < gameCost) {
        setState(prev => ({ 
          ...prev, 
          isStarting: false, 
          error: `Insufficient balance: ${balance?.toString()} < ${gameCost?.toString()}` 
        }));
        return false;
      }

      startGameWrite({
        address: clawMachineAddress,
        abi: CLAWMACHINE_ABI,
        functionName: 'startGame',
        gas: BigInt(200000), // Reasonable gas limit for startGame
      });

      console.log('startGame transaction submitted');

      return true; // Transaction submitted
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isStarting: false,
        isApproving: false,
        error: error instanceof Error ? error.message : 'Failed to start game' 
      }));
      return false;
    }
  }, [address, startGameWrite, clawMachineAddress, checkApproval, approveTokens, forfeitGame, balance, gameCost]);

  // Pay for a claw grab
  const payForGrab = useCallback(async (): Promise<boolean> => {
    if (!address) {
      console.error('Wallet not connected');
      return false;
    }

    if (!balance || !gameCost || balance < gameCost) {
      console.error('Insufficient balance for grab');
      return false;
    }

    try {
      console.log('Paying for grab...', {
        balance: balance?.toString(),
        cost: gameCost?.toString(),
      });

      payForGrabWrite({
        address: clawMachineAddress,
        abi: CLAWMACHINE_ABI,
        functionName: 'payForGrab',
        gas: BigInt(150000),
      });

      return true;
    } catch (error) {
      console.error('Pay for grab failed:', error);
      return false;
    }
  }, [address, payForGrabWrite, clawMachineAddress, balance, gameCost]);

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
    forfeitGame,
    startGame,
    payForGrab,
    submitWin,
    claimPrize,
    isApproveConfirming,
    isStartGameConfirming,
    isStartGameSuccess,
    isPayForGrabSuccess,
  };
}
