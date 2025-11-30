'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { useNFTGallery } from '@/lib/web3/useNFTGallery';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { TransferNFTModal } from '@/components/gallery/TransferNFTModal';

export default function GalleryPage() {
  const t = useTranslations('gallery');
  const { isConnected } = useAccount();
  const { nfts, isLoading, balance, refetch } = useNFTGallery();
  const [transferModal, setTransferModal] = useState<{ tokenId: string; name: string } | null>(null);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Language Switcher - Top Left */}
      <div className="absolute top-4 left-4 z-[100]">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-7xl space-y-8 py-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold text-white">🏆 {t('title')}</h1>
            {isConnected && (
              <p className="text-xl text-purple-200 mt-2">
                {t('nftsCollected', { count: balance })}
              </p>
            )}
          </div>
          <Link
            href="/"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl border-2 border-white/30 transition-colors"
          >
            ← {t('backToHome')}
          </Link>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <p className="text-xl text-purple-200">
              {t('connectWalletPrompt')}
            </p>
            <WalletConnect />
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
              <p className="text-white text-lg">{t('loading')}</p>
            </div>
          </div>
        ) : balance === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <p className="text-xl text-purple-200">
              {t('noPrizesYet')}
            </p>
            <Link
              href="/game"
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105"
            >
              🎮 {t('playNow')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft) => (
              <NFTCard
                key={nft.tokenId}
                nft={nft}
                onTransfer={() => setTransferModal({ tokenId: nft.tokenId, name: nft.metadata?.name || `Prize #${nft.tokenId}` })}
              />
            ))}
          </div>
        )}

        {/* Transfer Modal */}
        {transferModal && (
          <TransferNFTModal
            tokenId={transferModal.tokenId}
            nftName={transferModal.name}
            onClose={() => setTransferModal(null)}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </div>
  );
}

function NFTCard({ nft, onTransfer }: { nft: any; onTransfer: () => void }) {
  const t = useTranslations('gallery');
  const imageUrl = nft.metadata?.image?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border-2 border-white/20 hover:border-white/40 transition-all transform hover:scale-105">
      <div className="aspect-square relative bg-gradient-to-br from-purple-500/20 to-blue-500/20">
        {nft.isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : nft.error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/50 text-center p-4">{nft.error}</p>
          </div>
        ) : nft.metadata?.image ? (
          <Image
            src={imageUrl || ''}
            alt={nft.metadata?.name || `NFT #${nft.tokenId}`}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/50">{t('noImage')}</p>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-xl font-bold text-white truncate">
            {nft.metadata?.name || `${t('prize')} #${nft.tokenId}`}
          </h3>
          <p className="text-sm text-purple-200">{t('tokenId')}: {nft.tokenId}</p>
        </div>
        
        {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
          <div className="space-y-1">
            {nft.metadata.attributes
              .filter((attr: any) =>
                !['Prize ID', 'Difficulty', 'Tokens Spent'].includes(attr.trait_type)
              )
              .slice(0, 3)
              .map((attr: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-purple-300">{attr.trait_type}:</span>
                  <span className="text-white font-semibold">{attr.value}</span>
                </div>
              ))}
          </div>
        )}

        {/* Transfer Button */}
        <button
          onClick={onTransfer}
          className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
          {t('sendNFT')}
        </button>
      </div>
    </div>
  );
}
