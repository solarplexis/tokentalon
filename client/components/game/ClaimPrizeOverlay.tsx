'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { useGameFlow } from '@/lib/web3/useGameFlow';

interface PrizeWon {
  id: string;
  name: string;
  rarity: string;
  prizeId: number;
  customTraits?: Record<string, string>;
}

interface ClaimPrizeOverlayProps {
  prizeWon: PrizeWon;
  replayData: any;
  onClose: () => void;
}

export default function ClaimPrizeOverlay({
  prizeWon,
  replayData,
  onClose
}: ClaimPrizeOverlayProps) {
  const { chain } = useAccount();
  const { submitWin, claimPrize, state } = useGameFlow(chain?.id);
  const [isMounted, setIsMounted] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rarity colors
  const rarityConfig = {
    common: {
      bg: 'bg-gray-500',
      border: 'border-gray-400',
      text: 'Common'
    },
    uncommon: {
      bg: 'bg-green-500',
      border: 'border-green-400',
      text: 'Uncommon'
    },
    rare: {
      bg: 'bg-blue-500',
      border: 'border-blue-400',
      text: 'Rare'
    },
    legendary: {
      bg: 'bg-purple-500',
      border: 'border-purple-400',
      text: 'Legendary'
    }
  };

  const rarityStyle = rarityConfig[prizeWon.rarity.toLowerCase() as keyof typeof rarityConfig] || rarityConfig.common;

  const handleClaim = async () => {
    try {
      setIsClaiming(true);
      setError(null);

      console.log('🎁 Submitting win to backend...');

      // Step 1: Submit win to backend to get voucher
      const winData = await submitWin(prizeWon.prizeId, replayData);

      if (!winData || !winData.voucher) {
        throw new Error('Failed to get voucher from backend');
      }

      console.log('✅ Voucher received:', winData);
      console.log('🎟️ Claiming prize on blockchain...');

      // Step 2: Claim prize on blockchain with voucher
      const success = await claimPrize(
        winData.prizeId,
        winData.metadata.uri,
        winData.metadata.replayDataHash,
        winData.metadata.difficulty,
        winData.voucher.nonce,
        winData.voucher.signature
      );

      if (success) {
        console.log('🎉 Prize claimed successfully!');
        setIsSuccess(true);
      } else {
        throw new Error('Failed to claim prize on blockchain');
      }
    } catch (err) {
      console.error('Failed to claim prize:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim prize');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClose = () => {
    setIsMounted(false);
    setTimeout(onClose, 300); // Delay to allow fade out animation
  };

  if (!isMounted) {
    return null;
  }

  // Get prize image path
  const prizeImagePath = `/assets/images/prizes/${prizeWon.id.replace('prize_', '')}.png`;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl border-4 border-yellow-400 p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
        {/* Congratulations Header */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold text-yellow-400 mb-2">
            CONGRATULATIONS!
          </h2>
          <p className="text-white/70 text-sm">You won a prize!</p>
        </div>

        {/* Prize Image */}
        <div className="flex justify-center mb-6 bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="relative w-48 h-48">
            <Image
              src={prizeImagePath}
              alt={prizeWon.name}
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Prize Name */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-white capitalize mb-3">
            {prizeWon.name}
          </h3>

          {/* Rarity Badge */}
          <div className={`inline-block ${rarityStyle.bg} ${rarityStyle.border} border-2 px-6 py-2 rounded-full`}>
            <span className="text-white font-bold text-lg">
              {rarityStyle.text.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <div className="mb-4 bg-green-500/20 border border-green-500 text-green-200 px-4 py-2 rounded-lg text-sm">
            🎊 Prize claimed successfully! Check your gallery.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClaim}
            disabled={isClaiming || isSuccess}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg transform transition hover:scale-105 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isClaiming && (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSuccess ? '✓ Claimed!' : isClaiming ? 'Claiming...' : 'Claim as NFT'}
          </button>

          <button
            onClick={handleClose}
            disabled={isClaiming}
            className="flex-1 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg transform transition hover:scale-105 disabled:scale-100"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
