'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

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
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
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
          <PhaserGame />
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
