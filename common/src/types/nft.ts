/**
 * NFT-related type definitions
 */

export interface NFTMetadata {
  name: string;
  description: string;
  image: string; // IPFS URL
  attributes: NFTAttribute[];
  replay_data: string; // IPFS URL to replay JSON
  animation_url?: string; // Optional video/animation
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'string' | 'number' | 'boost_percentage' | 'boost_number' | 'date';
}

export interface MintRequest {
  walletAddress: string;
  sessionId: string;
  prizeId: string;
  metadata: NFTMetadata;
  replayDataCID: string; // IPFS CID for replay data
  imageDataCID: string; // IPFS CID for prize image
}

export interface NFT {
  tokenId: string;
  owner: string;
  metadata: NFTMetadata;
  mintedAt: number;
  transactionHash: string;
}
