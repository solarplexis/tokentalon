'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '@/lib/phaser/config';
import { useGameFlow } from '@/lib/web3/useGameFlow';
import { useAccount } from 'wagmi';

interface PrizeWon {
  id: string;
  name: string;
  rarity: string;
  prizeId: number;
  customTraits?: Record<string, string>;
}

interface PhaserGameProps {
  onGameEnd?: () => void;
  onPrizeWon?: (prizeWon: PrizeWon, replayData: any) => void;
}

export default function PhaserGame({ onGameEnd, onPrizeWon }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { address, chain } = useAccount();
  const { payForGrab, submitWin, claimPrize } = useGameFlow(chain?.id);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Initialize Phaser game
    const config = {
      ...gameConfig,
      parent: containerRef.current,
    };

    gameRef.current = new Phaser.Game(config);

    // Make functions available to game scenes
    if (gameRef.current) {
      gameRef.current.registry.set('payForGrab', payForGrab);
      gameRef.current.registry.set('submitWin', submitWin);
      gameRef.current.registry.set('claimPrize', claimPrize);
      gameRef.current.registry.set('playerAddress', address || '0x0000000000000000000000000000000000000000');
      if (onGameEnd) {
        gameRef.current.registry.set('onGameEnd', onGameEnd);
      }
      if (onPrizeWon) {
        gameRef.current.registry.set('onPrizeWon', onPrizeWon);
      }
    }

    // Focus the container to receive keyboard input (multiple attempts)
    const focusAttempts = [100, 300, 500];
    focusAttempts.forEach(delay => {
      setTimeout(() => {
        containerRef.current?.focus();
        console.log('Focus attempt at', delay, 'ms');
      }, delay);
    });

    // Add click listener to ensure focus on click
    const handleClick = () => {
      containerRef.current?.focus();
      console.log('Game container focused via click');
    };
    
    containerRef.current?.addEventListener('click', handleClick);

    // Cleanup on unmount
    return () => {
      containerRef.current?.removeEventListener('click', handleClick);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [address, payForGrab, submitWin, claimPrize, onGameEnd, onPrizeWon]);

  return (
    <div
      id="game-container"
      ref={containerRef}
      className="w-full h-full flex items-center justify-center cursor-pointer"
      tabIndex={0}
      style={{ outline: 'none' }}
      title="Click to focus, then use arrow keys to play"
    />
  );
}
