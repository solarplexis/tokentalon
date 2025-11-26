'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { useNFTGallery } from '@/lib/web3/useNFTGallery';
import { WalletConnect } from '@/components/wallet/WalletConnect';

export default function GalleryPage() {
  const { isConnected } = useAccount();
  const { nfts, isLoading, balance } = useNFTGallery();

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="w-full max-w-7xl space-y-8 py-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold text-white">🏆 NFT Gallery</h1>
            {isConnected && (
              <p className="text-xl text-purple-200 mt-2">
                {balance} {balance === 1 ? 'NFT' : 'NFTs'} collected
              </p>
            )}
          </div>
          <Link
            href="/"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl border-2 border-white/30 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <p className="text-xl text-purple-200">
              Connect your wallet to view your NFT collection
            </p>
            <WalletConnect />
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
              <p className="text-white text-lg">Loading your collection...</p>
            </div>
          </div>
        ) : balance === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <p className="text-xl text-purple-200">
              You haven't collected any prizes yet
            </p>
            <Link
              href="/game"
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105"
            >
              🎮 Play Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft) => (
              <NFTCard key={nft.tokenId} nft={nft} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NFTCard({ nft }: { nft: any }) {
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
            <p className="text-white/50">No image</p>
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-xl font-bold text-white truncate">
            {nft.metadata?.name || `Prize #${nft.tokenId}`}
          </h3>
          <p className="text-sm text-purple-200">Token ID: {nft.tokenId}</p>
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
      </div>
    </div>
  );
}
