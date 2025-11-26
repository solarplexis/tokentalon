import { PinataSDK } from 'pinata';
import dotenv from 'dotenv';

dotenv.config();

/**
 * IPFS Service using Pinata
 * Handles uploading prize metadata, images, and replay data to IPFS
 */

// Initialize Pinata
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || '',
  pinataGateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
});

export interface PrizeMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  replay_data: string;
}

export interface ReplayData {
  sessionId: string;
  prizeId: number;
  difficulty: number;
  timestamp: number;
  playerAddress: string;
  tokensSpent: number;
  physicsData: {
    clawPath: Array<{ x: number; y: number; z: number; timestamp: number }>;
    prizePosition: { x: number; y: number; z: number };
    grabForce: number;
    dropHeight: number;
  };
  result: 'won' | 'lost';
}

/**
 * Upload replay data JSON to IPFS
 */
export async function uploadReplayData(replayData: ReplayData): Promise<string> {
  try {
    const blob = new Blob([JSON.stringify(replayData)], { type: 'application/json' });
    const file = new File([blob], 'replay-data.json', { type: 'application/json' });
    const upload = await pinata.upload.public.file(file);
    return upload.cid;
  } catch (error) {
    console.error('Error uploading replay data to IPFS:', error);
    throw new Error('Failed to upload replay data to IPFS');
  }
}

/**
 * Upload prize image to IPFS (if not already cached)
 */
export async function uploadPrizeImage(_imagePath: string): Promise<string> {
  try {
    // In production, you would upload the actual image file
    // For now, we'll assume images are pre-uploaded and return the hash
    // TODO: Implement actual file upload
    throw new Error('Image upload not yet implemented - use pre-uploaded images');
  } catch (error) {
    console.error('Error uploading image to IPFS:', error);
    throw error;
  }
}

/**
 * Create and upload complete prize metadata to IPFS
 */
export async function uploadPrizeMetadata(
  prizeId: number,
  prizeName: string,
  prizeDescription: string,
  prizeImageHash: string,
  replayDataHash: string,
  difficulty: number,
  tokensSpent: number
): Promise<string> {
  try {
    const metadata: PrizeMetadata = {
      name: `${prizeName} #${prizeId}`,
      description: prizeDescription,
      image: `ipfs://${prizeImageHash}`,
      external_url: `${process.env.FRONTEND_URL || 'https://tokentalon.com'}/prize/${prizeId}`,
      attributes: [
        {
          trait_type: 'Prize ID',
          value: prizeId
        },
        {
          trait_type: 'Difficulty',
          value: difficulty
        },
        {
          trait_type: 'Tokens Spent',
          value: tokensSpent
        },
        {
          trait_type: 'Rarity',
          value: difficulty >= 8 ? 'Legendary' : difficulty >= 6 ? 'Epic' : difficulty >= 4 ? 'Rare' : 'Common'
        }
      ],
      replay_data: `ipfs://${replayDataHash}`
    };

    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const file = new File([blob], `prize-${prizeId}-metadata.json`, { type: 'application/json' });
    const upload = await pinata.upload.public.file(file);
    return upload.cid;
  } catch (error) {
    console.error('Error uploading prize metadata to IPFS:', error);
    throw new Error('Failed to upload prize metadata to IPFS');
  }
}

/**
 * Retrieve content from IPFS via Pinata gateway
 */
export async function getFromIPFS(cid: string): Promise<any> {
  try {
    const gatewayUrl = `https://silver-managing-eel-9.mypinata.cloud/ipfs/${cid}`;
    const response = await fetch(gatewayUrl);
    
    if (!response.ok) {
      throw new Error(`Gateway request failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw new Error('Failed to retrieve content from IPFS');
  }
}

/**
 * Validate Pinata configuration
 */
export function validatePinataConfig(): boolean {
  if (!process.env.PINATA_JWT) {
    console.error('❌ PINATA_JWT not configured');
    return false;
  }
  
  return true;
}

/**
 * Test Pinata connection
 */
export async function testPinataConnection(): Promise<boolean> {
  try {
    // Simple test upload
    const testData = { test: 'TokenTalon IPFS test', timestamp: Date.now() };
    const blob = new Blob([JSON.stringify(testData)], { type: 'application/json' });
    const file = new File([blob], 'test.json', { type: 'application/json' });
    const upload = await pinata.upload.public.file(file);
    console.log('✅ Pinata connection successful:', upload.cid);
    return true;
  } catch (error) {
    console.error('❌ Pinata connection failed:', error);
    return false;
  }
}

export default {
  uploadReplayData,
  uploadPrizeImage,
  uploadPrizeMetadata,
  getFromIPFS,
  validatePinataConfig,
  testPinataConnection
};
