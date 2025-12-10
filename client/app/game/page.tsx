'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { useTokenBalance } from '@/lib/web3';
import { formatUnits } from 'viem';
import GameController from '@/components/game/GameController';
import ClaimPrizeOverlay from '@/components/game/ClaimPrizeOverlay';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';

// Create a loading component that uses translations
function GameLoading() {
  const tCommon = useTranslations('common');
  return (
    <div className="flex items-center justify-center h-[600px]">
      <p className="text-white text-xl">{tCommon('loading')}</p>
    </div>
  );
}

// Dynamically import PhaserGame with no SSR to avoid window/document issues
const PhaserGame = dynamic(() => import('@/components/game/PhaserGame'), {
  ssr: false,
  loading: () => <GameLoading />,
});

interface PrizeWon {
  id: string;
  name: string;
  rarity: string;
  prizeId: number;
  customTraits?: Record<string, string>;
}

export default function GamePage() {
  const t = useTranslations('game');
  const { address, chain } = useAccount();
  const { data: balance } = useTokenBalance(address, chain?.id);
  const [payForGrabFn, setPayForGrabFn] = useState<(() => Promise<boolean>) | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [prizeWon, setPrizeWon] = useState<PrizeWon | null>(null);
  const [replayData, setReplayData] = useState<any>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const handleGameReady = useCallback((payForGrab: () => Promise<boolean>) => {
    setPayForGrabFn(() => payForGrab);
  }, []);

  const handleGameStart = useCallback(() => {
    setShowOverlay(false);
    // Focus the game container after overlay hides (increased delay)
    setTimeout(() => {
      const container = document.getElementById('game-container');
      container?.focus();
      console.log('Game container focused');
    }, 200);
  }, []);

  const handleGameClick = useCallback(() => {
    // Fallback: focus on click
    const container = document.getElementById('game-container');
    container?.focus();
  }, []);

  const handleGameEnd = useCallback(() => {
    // Show overlay immediately when game ends
    setShowOverlay(true);
  }, []);

  const handlePrizeWon = useCallback((prize: PrizeWon, replay: any) => {
    console.log('Prize won:', prize);
    setPrizeWon(prize);
    setReplayData(replay);
  }, []);

  const handleCloseClaimOverlay = useCallback(() => {
    setPrizeWon(null);
    setReplayData(null);
    setShowOverlay(true); // Show the start overlay again
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Language Switcher - Top Left */}
      <div className="absolute top-4 left-4 z-[100]">
        <LanguageSwitcher />
      </div>

      {/* Balance Display - Top Right */}
      {address && balance !== undefined && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border-2 border-green-400">
          <div className="text-xs text-green-300 opacity-70">{t('yourBalance')}</div>
          <div className="text-lg font-bold text-green-400">
            {Math.floor(parseFloat(formatUnits(balance, 18)))} TALON
          </div>
        </div>
      )}

      <div className="text-center space-y-8 w-full max-w-6xl">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
          <button
            onClick={() => setShowHowToPlay(!showHowToPlay)}
            className="w-full flex items-center justify-between text-white text-xl hover:text-white/80 transition"
          >
            <span>🎯 {t('howToPlay')}</span>
            <span className="text-2xl">{showHowToPlay ? '−' : '+'}</span>
          </button>
          {showHowToPlay && (
            <div className="text-white/80 space-y-1 mt-2">
              <p>{t('arrowKeysLeftRight')}</p>
              <p>{t('arrowKeysForwardBackward')}</p>
              <p>{t('spaceToGrab')}</p>
              <p>{t('goal')}</p>
            </div>
          )}
        </div>

        {/* Game Container */}
        <div
          className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-purple-400 bg-black"
          onClick={handleGameClick}
        >
          {showOverlay && <GameController onGameReady={handleGameReady} onGameStart={handleGameStart} />}
          {prizeWon && replayData && (
            <ClaimPrizeOverlay
              prizeWon={prizeWon}
              replayData={replayData}
              onClose={handleCloseClaimOverlay}
            />
          )}
          <PhaserGame onGameEnd={handleGameEnd} onPrizeWon={handlePrizeWon} />
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="inline-block bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl border-2 border-white/30 transition"
          >
            ← {t('backToHome')}
          </Link>
          <Link
            href="/gallery"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl border-2 border-purple-400 transition"
          >
            {t('viewPrizeGallery')} →
          </Link>
        </div>
      </div>
    </div>
  );
}
