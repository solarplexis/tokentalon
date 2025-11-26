'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { getRandomCabinet, type Cabinet } from '@/lib/cabinets';
import { WalletConnect, TokenAcquisition } from '@/components/wallet';
import { useTokenBalance, useGameCost } from '@/lib/web3';

export function HomeContent() {
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const { address, isConnected, chain } = useAccount();
  const { data: balance, isLoading: isLoadingBalance, error: balanceError } = useTokenBalance(address, chain?.id);
  const { data: gameCost, isLoading: isLoadingGameCost, error: gameCostError } = useGameCost(chain?.id);

  console.log('HomeContent Debug:', {
    address,
    isConnected,
    chainId: chain?.id,
    balance: balance?.toString(),
    gameCost: gameCost?.toString(),
    isLoadingBalance,
    isLoadingGameCost,
    balanceError: balanceError?.message,
    gameCostError: gameCostError?.message,
  });

  const hasEnoughTokens = balance && gameCost && balance >= gameCost;

  useEffect(() => {
    setCabinet(getRandomCabinet());
  }, []);

  if (!cabinet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Wallet Connection in Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <WalletConnect />
      </div>

      <main className="flex flex-col items-center gap-8 max-w-6xl w-full">
        {/* Header */}
        <div className="text-center space-y-4">
          <p className="text-xl text-purple-200">
            Web3 Claw Machine - Win NFT Prizes!
          </p>
        </div>

        {/* Cabinet Display */}
        <div className="relative w-full h-[70vh]">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-4 border-purple-400 bg-black">
            <Image
              src={cabinet.image}
              alt={cabinet.name}
              fill
              className="object-contain"
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
          {isConnected && hasEnoughTokens ? (
            <Link
              href="/game"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-xl text-center text-xl shadow-lg transform transition hover:scale-105"
            >
              Play Now
            </Link>
          ) : (
            <button
              disabled
              className="flex-1 bg-gray-500 cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-center text-xl shadow-lg opacity-50"
              title={!isConnected ? "Connect wallet to play" : "Need more tokens to play"}
            >
              Play Now
            </button>
          )}
          <Link
            href="/gallery"
            className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-xl text-center text-xl border-2 border-white/30 shadow-lg transform transition hover:scale-105"
          >
            View Gallery
          </Link>
        </div>

        {/* Token Acquisition Section */}
        <div className="w-full max-w-md mt-8">
          <TokenAcquisition />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white border border-white/20">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="text-lg font-bold mb-2">Connect Wallet</h3>
            <p className="text-sm text-purple-200">
              Use your Web3 wallet to spend tokens and play
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white border border-white/20">
            <div className="text-4xl mb-2">🎮</div>
            <h3 className="text-lg font-bold mb-2">Grab a Prize</h3>
            <p className="text-sm text-purple-200">
              Control the claw and try to grab your favorite prize
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white border border-white/20">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="text-lg font-bold mb-2">Win NFTs</h3>
            <p className="text-sm text-purple-200">
              Successful grabs mint unique NFTs with replay data
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 text-white/60 text-sm">
        <p>Powered by blockchain technology</p>
      </footer>
    </div>
  );
}
