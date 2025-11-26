'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '@/lib/phaser/config';
import { useGameFlow } from '@/lib/web3/useGameFlow';
import { useAccount } from 'wagmi';

interface PhaserGameProps {
  onGameEnd?: () => void;
}

export default function PhaserGame({ onGameEnd }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { chain } = useAccount();
  const { payForGrab } = useGameFlow(chain?.id);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Initialize Phaser game
    const config = {
      ...gameConfig,
      parent: containerRef.current,
    };

    gameRef.current = new Phaser.Game(config);

    // Make payForGrab and onGameEnd available to game scenes
    if (gameRef.current) {
      gameRef.current.registry.set('payForGrab', payForGrab);
      if (onGameEnd) {
        gameRef.current.registry.set('onGameEnd', onGameEnd);
      }
    }

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [payForGrab, onGameEnd]);

  return (
    <div
      id="game-container"
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
    />
  );
}
