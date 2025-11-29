'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { getRandomCabinet, type Cabinet } from '@/lib/cabinets';
import { WalletConnect, TokenAcquisition } from '@/components/wallet';
import { useTokenBalance, useGameCost, useTokenAllowance, CONTRACTS } from '@/lib/web3';
import { useRouter } from 'next/navigation';
import { useGameFlow } from '@/lib/web3/useGameFlow';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';

export function HomeContent() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const { address, isConnected, chain } = useAccount();
  const { data: balance, isLoading: isLoadingBalance, error: balanceError } = useTokenBalance(address, chain?.id);
  const { data: gameCost, isLoading: isLoadingGameCost, error: gameCostError } = useGameCost(chain?.id);
  const router = useRouter();
  const { state: gameState, startGame, forfeitGame, isStartGameSuccess, checkApproval } = useGameFlow(chain?.id);
  
  // Check actual allowance
  const clawMachineAddress = chain?.id === 11155111 
    ? CONTRACTS.sepolia.clawMachine 
    : CONTRACTS.polygonAmoy.clawMachine;
  const { data: allowance } = useTokenAllowance(address, clawMachineAddress, chain?.id);

  // Check approval status on mount
  useEffect(() => {
    if (address && chain?.id) {
      const needsApproval = checkApproval();
      console.log('Approval check:', { needsApproval });
    }
  }, [address, chain?.id, checkApproval]);

  // Navigate to game when transaction is confirmed
  useEffect(() => {
    if (isStartGameSuccess && gameState.isPlaying) {
      router.push('/game');
    }
  }, [isStartGameSuccess, gameState.isPlaying, router]);

  console.log('HomeContent Debug:', {
    address,
    isConnected,
    chainId: chain?.id,
    balance: balance?.toString(),
    gameCost: gameCost?.toString(),
    allowance: allowance?.toString(), // Raw allowance value
    clawMachineAddress, // Add this to verify correct contract
    isLoadingBalance,
    isLoadingGameCost,
    balanceError: balanceError?.message,
    gameCostError: gameCostError?.message,
    gameState: {
      hasActiveSession: gameState.hasActiveSession,
      needsApproval: gameState.needsApproval,
      isApproving: gameState.isApproving,
      isStarting: gameState.isStarting,
      isForfeitng: gameState.isForfeitng,
      error: gameState.error,
    },
  });

  const hasEnoughTokens = balance && gameCost && balance >= gameCost;

  const handlePlayNow = () => {
    console.log('Navigating to game page');
    router.push('/game');
  };

  useEffect(() => {
    setCabinet(getRandomCabinet());
  }, []);

  if (!cabinet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white text-2xl">{tCommon('loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Language Switcher in Top Left */}
      <div className="absolute top-4 left-4 z-[100]">
        <LanguageSwitcher />
      </div>

      {/* Wallet Connection in Top Right */}
      <div className="absolute top-4 right-4 z-[100]">
        <WalletConnect />
      </div>

      {/* Token Acquisition - Floating Right Below Wallet */}
      <div className="hidden lg:block absolute top-32 right-4 w-96 z-10">
        <TokenAcquisition />
      </div>

      <main className="flex flex-col items-center gap-8 max-w-4xl w-full">
        {/* Header */}
        <div className="text-center space-y-4">
          <p className="text-xl text-purple-200">
            {t('subtitle')}
          </p>
        </div>

        {/* Cabinet Display */}
        <div className="relative w-full h-[70vh]">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-4 border-purple-400 bg-black">
            <Image
              src={cabinet.image}
              alt={cabinet.name}
              fill
              className="object-cover"
              priority
              onError={(e) => {
                // Fallback if image doesn't exist
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900 text-white text-2xl">Cabinet Image Here</div>';
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          {/* Error Display - Moved above buttons */}
          {gameState.error && (
            <div className="w-full bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
              {gameState.error}
            </div>
          )}
          
          {isConnected ? (
            <button
              onClick={handlePlayNow}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-xl text-center text-xl shadow-lg transform transition hover:scale-105"
            >
              {t('playGame')}
            </button>
          ) : (
            <button
              disabled
              className="flex-1 bg-gray-500 cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-center text-xl shadow-lg opacity-50"
              title={t('connectWalletToPlay')}
            >
              {t('connectWalletToPlay')}
            </button>
          )}
          <Link
            href="/gallery"
            className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-xl text-center text-xl border-2 border-white/30 shadow-lg transform transition hover:scale-105"
          >
            {t('viewGallery')}
          </Link>
        </div>

        {/* Token Acquisition for Mobile */}
        <div className="lg:hidden w-full max-w-md">
          <TokenAcquisition />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white border border-white/20">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="text-lg font-bold mb-2">{t('infoCard1Title')}</h3>
            <p className="text-sm text-purple-200">
              {t('infoCard1Description')}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white border border-white/20">
            <div className="text-4xl mb-2">🎮</div>
            <h3 className="text-lg font-bold mb-2">{t('infoCard2Title')}</h3>
            <p className="text-sm text-purple-200">
              {t('infoCard2Description')}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white border border-white/20">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="text-lg font-bold mb-2">{t('infoCard3Title')}</h3>
            <p className="text-sm text-purple-200">
              {t('infoCard3Description')}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 text-white/60 text-sm">
        <p>{t('footer')}</p>
      </footer>
    </div>
  );
}
