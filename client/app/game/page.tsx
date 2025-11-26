'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { useTokenBalance } from '@/lib/web3';
import { formatUnits } from 'viem';
import GameController from '@/components/game/GameController';

// Dynamically import PhaserGame with no SSR to avoid window/document issues
const PhaserGame = dynamic(() => import('@/components/game/PhaserGame'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <p className="text-white text-xl">Loading game...</p>
    </div>
  ),
});

export default function GamePage() {
  const { address, chain } = useAccount();
  const { data: balance } = useTokenBalance(address, chain?.id);
  const [payForGrabFn, setPayForGrabFn] = useState<(() => Promise<boolean>) | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  const handleGameReady = useCallback((payForGrab: () => Promise<boolean>) => {
    setPayForGrabFn(() => payForGrab);
  }, []);

  const handleGameStart = useCallback(() => {
    setShowOverlay(false);
  }, []);

  const handleGameEnd = useCallback(() => {
    // Show overlay immediately when game ends
    setShowOverlay(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Balance Display - Top Right */}
      {address && balance !== undefined && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border-2 border-green-400">
          <div className="text-xs text-green-300 opacity-70">Your Balance</div>
          <div className="text-lg font-bold text-green-400">
            {formatUnits(balance, 18)} TALON
          </div>
        </div>
      )}

      <div className="text-center space-y-8 w-full max-w-6xl">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
          <h2 className="text-white text-xl mb-2">🎯 How to Play</h2>
          <div className="text-white/80 space-y-1">
            <p>← → Arrow Keys: Move the claw left/right</p>
            <p>↑ ↓ Arrow Keys: Move the claw forward/backward</p>
            <p>SPACE: Drop the claw to grab a prize</p>
            <p>Goal: Grab a prize and bring it to the center drop zone!</p>
          </div>
        </div>

        {/* Game Container */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-purple-400 bg-black">
          {showOverlay && <GameController onGameReady={handleGameReady} onGameStart={handleGameStart} />}
          <PhaserGame onGameEnd={handleGameEnd} />
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="inline-block bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl border-2 border-white/30 transition"
          >
            ← Back to Home
          </Link>
          <Link
            href="/gallery"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl border-2 border-purple-400 transition"
          >
            View Prize Gallery →
          </Link>
        </div>
      </div>
    </div>
  );
}
