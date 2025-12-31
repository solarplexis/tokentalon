import { PinataSDK } from 'pinata';

/**
 * IPFS Service using Pinata
 * Handles uploading prize metadata, images, and replay data to IPFS
 */

// Initialize Pinata
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || '',
  pinataGateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
});

/**
 * Retry helper with exponential backoff
 * Retries a function with exponential backoff on failure
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 10000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication errors (401)
      if (error.statusCode === 401 || error.details?.code === 'AUTH_ERROR') {
        console.error(`❌ Authentication error for ${operationName}, not retrying:`, error.message);
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error(`❌ ${operationName} failed after ${maxRetries + 1} attempts:`, error.message);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      console.warn(`⚠️  ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      console.warn(`   Error:`, error.message);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

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
 * Upload replay data JSON to IPFS with retry logic
 */
export async function uploadReplayData(replayData: ReplayData): Promise<string> {
  return retryWithBackoff(
    async () => {
      const blob = new Blob([JSON.stringify(replayData)], { type: 'application/json' });
      const file = new File([blob], 'replay-data.json', { type: 'application/json' });
      const upload = await pinata.upload.public.file(file);
      // console.log('✅ Replay data uploaded to IPFS:', upload.cid);
      return upload.cid;
    },
    3, // maxRetries
    2000, // initialDelay (2s)
    10000, // maxDelay (10s)
    'Upload replay data to IPFS'
  );
}

/**
 * Upload prize image to IPFS with retry logic
 * Accepts Buffer (from AI generation) or file path
 */
export async function uploadPrizeImage(imageData: Buffer | string, prizeId: number): Promise<string> {
  if (!Buffer.isBuffer(imageData)) {
    throw new Error('File path upload not yet implemented');
  }

  return retryWithBackoff(
    async () => {
      // Upload Buffer directly (AI-generated image)
      const blob = new Blob([imageData], { type: 'image/png' });
      const file = new File([blob], `prize-${prizeId}.png`, { type: 'image/png' });
      const upload = await pinata.upload.public.file(file);
      // console.log('✅ Prize image uploaded to IPFS:', upload.cid);
      return upload.cid;
    },
    3, // maxRetries
    2000, // initialDelay (2s)
    10000, // maxDelay (10s)
    `Upload prize #${prizeId} image to IPFS`
  );
}

/**
 * Create and upload complete prize metadata to IPFS with retry logic
 */
export async function uploadPrizeMetadata(
  prizeId: number,
  prizeName: string,
  prizeDescription: string,
  prizeImageHash: string,
  replayDataHash: string,
  difficulty: number,
  tokensSpent: number,
  customTraits?: Record<string, string>,
  rarity?: string
): Promise<string> {
  // Prepare metadata outside retry loop
  const baseAttributes = [
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
      value: rarity ? rarity.charAt(0).toUpperCase() + rarity.slice(1) : (difficulty >= 8 ? 'Legendary' : difficulty >= 6 ? 'Epic' : difficulty >= 4 ? 'Rare' : 'Common')
    }
  ];

  // Add custom traits as attributes
  const customAttributes = customTraits
    ? Object.entries(customTraits).map(([category, value]) => ({
        trait_type: category.split('_').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '), // Convert snake_case to Title Case
        value: value.replace(/_/g, ' ') // Convert snake_case to readable
      }))
    : [];

  const metadata: PrizeMetadata = {
    name: prizeName,
    description: prizeDescription,
    image: `ipfs://${prizeImageHash}`,
    external_url: `${process.env.FRONTEND_URL || 'https://tokentalon.com'}/prize/${prizeId}`,
    attributes: [...baseAttributes, ...customAttributes],
    replay_data: `ipfs://${replayDataHash}`
  };

  return retryWithBackoff(
    async () => {
      const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const file = new File([blob], `prize-${prizeId}-metadata.json`, { type: 'application/json' });
      const upload = await pinata.upload.public.file(file);
      // console.log('✅ Prize metadata uploaded to IPFS:', upload.cid);
      return upload.cid;
    },
    3, // maxRetries
    2000, // initialDelay (2s)
    10000, // maxDelay (10s)
    `Upload prize #${prizeId} metadata to IPFS`
  );
}

/**
 * Retrieve content from IPFS via Pinata gateway with retry logic
 */
export async function getFromIPFS(cid: string): Promise<any> {
  return retryWithBackoff(
    async () => {
      const gatewayUrl = `https://silver-managing-eel-9.mypinata.cloud/ipfs/${cid}`;
      const response = await fetch(gatewayUrl);

      if (!response.ok) {
        throw new Error(`Gateway request failed: ${response.statusText}`);
      }

      const data = await response.json();
      // console.log('✅ Retrieved content from IPFS:', cid);
      return data;
    },
    3, // maxRetries
    2000, // initialDelay (2s)
    10000, // maxDelay (10s)
    `Retrieve from IPFS (${cid})`
  );
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
    // console.log('✅ Pinata connection successful:', upload.cid);
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
