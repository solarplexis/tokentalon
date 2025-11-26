'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useGameFlow } from '@/lib/web3/useGameFlow';
import { formatUnits } from 'viem';

interface GameControllerProps {
  onGameReady: (payForGrab: () => Promise<boolean>) => void;
  onGameStart: () => void;
}

export default function GameController({ onGameReady, onGameStart }: GameControllerProps) {
  const { address, chain, isConnected } = useAccount();
  const { 
    state, 
    balance, 
    gameCost, 
    checkApproval, 
    approveTokens, 
    payForGrab,
    isApproveSuccess,
    isPayForGrabSuccess 
  } = useGameFlow(chain?.id);
  
  const [gameStarted, setGameStarted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [justApproved, setJustApproved] = useState(false);

  const hasEnoughBalance = balance && gameCost && balance >= gameCost;
  const needsApproval = checkApproval();

  // Prevent hydration errors by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Pass payForGrab to parent when game is ready
  useEffect(() => {
    if (gameStarted) {
      onGameReady(payForGrab);
    }
  }, [gameStarted, onGameReady]); // Remove payForGrab from deps to prevent infinite loop

  // Mark game as started when payForGrab transaction succeeds
  useEffect(() => {
    if (isPayForGrabSuccess && isInitializing) {
      console.log('Payment succeeded, game ready to play');
      setGameStarted(true);
      setIsInitializing(false);
      onGameStart(); // Notify parent to hide overlay
    }
  }, [isPayForGrabSuccess, isInitializing, onGameStart]);

  // Mark game as started after approval succeeds
  useEffect(() => {
    if (isApproveSuccess && justApproved) {
      console.log('Approval succeeded, ready to pay for game');
      setJustApproved(false);
      setIsInitializing(false); // Reset so button shows "Play for 10 TALON"
    }
  }, [isApproveSuccess, justApproved]);

  const handleStartGame = async () => {
    if (!isConnected || !hasEnoughBalance) return;

    setIsInitializing(true);

    try {
      // Handle approval if needed
      if (needsApproval) {
        console.log('Approving tokens...');
        setJustApproved(true);
        await approveTokens();
        // After approval succeeds, useEffect will call payForGrab
        return;
      }

      // If already approved, pay for the game
      console.log('Paying for game...');
      await payForGrab();
      
    } catch (error) {
      console.error('Failed to start game:', error);
      setIsInitializing(false);
    }
  };

  // Don't show overlay if game is started
  if (gameStarted) {
    return null;
  }

  // Don't render until mounted to prevent hydration errors
  if (!isMounted) {
    return null;
  }

  // Show overlay with start button
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center space-y-6 p-8 bg-gradient-to-br from-purple-900/90 to-blue-900/90 rounded-2xl border-4 border-purple-400 max-w-md">
        <h2 className="text-4xl font-bold text-white">🎮 Ready to Play?</h2>
        
        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-white/80">Connect your wallet to start playing</p>
            <button
              disabled
              className="w-full bg-gray-500 cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-xl"
            >
              Connect Wallet First
            </button>
          </div>
        ) : !hasEnoughBalance ? (
          <div className="space-y-4">
            <p className="text-white/80">
              You need at least {gameCost ? formatUnits(gameCost, 18) : '10'} TALON to play
            </p>
            <p className="text-white/60">
              Current balance: {balance ? formatUnits(balance, 18) : '0'} TALON
            </p>
            <button
              disabled
              className="w-full bg-gray-500 cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-xl"
            >
              Insufficient Balance
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-white/80">
              Each claw grab costs {gameCost ? formatUnits(gameCost, 18) : '10'} TALON
            </p>
            <p className="text-green-400 font-semibold">
              Your balance: {balance ? formatUnits(balance, 18) : '0'} TALON
            </p>
            
            {state.error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
                {state.error}
              </div>
            )}

            <button
              onClick={handleStartGame}
              disabled={isInitializing || state.isApproving || state.isPaying}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-wait text-white font-bold py-6 px-8 rounded-xl text-2xl shadow-lg transform transition hover:scale-105 disabled:scale-100 flex items-center justify-center gap-3"
            >
              {(isInitializing || state.isApproving || state.isPaying) && (
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {state.isApproving
                ? 'Processing Approval...'
                : needsApproval 
                  ? 'Approve Game Play'
                  : (state.isPaying || isInitializing)
                    ? 'Processing Payment...'
                    : `Play for ${gameCost ? formatUnits(gameCost, 18) : '10'} TALON`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
