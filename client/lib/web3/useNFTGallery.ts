'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  replay_data?: string;
}

export interface NFT {
  tokenId: string;
  tokenURI: string;
  metadata?: NFTMetadata;
  isLoading: boolean;
  error?: string;
}

export function useNFTGallery(chainId: number = sepolia.id) {
  const { address } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!address) {
      setNfts([]);
      setBalance(0);
      return;
    }

    const fetchNFTs = async () => {
      setIsLoading(true);
      try {
        // Add cache buster to ensure fresh data when address changes
        const cacheBuster = Date.now();
        // Fetch NFTs from backend API that queries events
        const response = await fetch(`/api/nft/owned?address=${address}&chainId=${chainId}&t=${cacheBuster}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch NFTs');
        }
        
        const data = await response.json();
        setBalance(data.balance || 0);
        
        if (data.nfts && data.nfts.length > 0) {
          // Initialize NFTs with loading state
          const nftList: NFT[] = data.nfts.map((nft: any) => ({
            tokenId: nft.tokenId,
            tokenURI: nft.tokenURI,
            isLoading: true
          }));
          
          setNfts(nftList);
          
          // Fetch metadata for each NFT
          data.nfts.forEach((nft: any) => {
            fetchMetadata(nft.tokenId, nft.tokenURI);
          });
        } else {
          setNfts([]);
        }
      } catch (error) {
        console.error('Error fetching NFTs:', error);
        setNfts([]);
        setBalance(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [address, chainId]);

  const fetchMetadata = async (tokenId: string, uri: string) => {
    try {
      if (!uri) {
        console.warn(`No URI for token ${tokenId}`);
        setNfts(prev => prev.map(nft => 
          nft.tokenId === tokenId 
            ? { ...nft, isLoading: false, error: 'No metadata URI' }
            : nft
        ));
        return;
      }

      // Convert IPFS URI to HTTP gateway
      const metadataUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      
      const response = await fetch(metadataUrl);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      
      const metadata: NFTMetadata = await response.json();
      
      // Update NFT with metadata
      setNfts(prev => prev.map(nft => 
        nft.tokenId === tokenId 
          ? { ...nft, metadata, isLoading: false }
          : nft
      ));
    } catch (error) {
      console.error(`Error fetching metadata for token ${tokenId}:`, error);
      setNfts(prev => prev.map(nft => 
        nft.tokenId === tokenId 
          ? { ...nft, isLoading: false, error: 'Failed to load metadata' }
          : nft
      ));
    }
  };

  return {
    nfts,
    isLoading,
    balance,
    refetch: () => {
      if (address) {
        setNfts([]);
      }
    }
  };
}
