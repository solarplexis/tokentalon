import { ethers } from 'ethers';
import { getOracleWallet } from '../config/blockchain';

/**
 * Oracle Service
 * Handles signature generation for prize claims
 * This is the core security mechanism that prevents cheating
 */

export interface WinVoucher {
  playerAddress: string;
  prizeId: number;
  metadataUri: string;
  replayDataHash: string;
  difficulty: number;
  nonce: number;
}

export interface SignedVoucher {
  voucherHash: string;
  signature: string;
  nonce: number;
}

/**
 * Create a win voucher hash
 * Must match the hash generation in ClawMachine.sol
 */
export function createVoucherHash(voucher: WinVoucher): string {
  return ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'string', 'string', 'uint8', 'uint256'],
    [
      voucher.playerAddress,
      voucher.prizeId,
      voucher.metadataUri,
      voucher.replayDataHash,
      voucher.difficulty,
      voucher.nonce
    ]
  );
}

/**
 * Sign a win voucher with oracle private key
 * Returns signature that can be verified on-chain
 */
export async function signWinVoucher(
  voucher: WinVoucher,
  network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia'
): Promise<SignedVoucher> {
  try {
    // Get oracle wallet
    const oracleWallet = getOracleWallet(network);

    // Create voucher hash
    const voucherHash = createVoucherHash(voucher);

    // Sign the hash
    const signature = await oracleWallet.signMessage(ethers.getBytes(voucherHash));

    return {
      voucherHash,
      signature,
      nonce: voucher.nonce
    };
  } catch (error) {
    console.error('Error signing win voucher:', error);
    throw new Error('Failed to sign win voucher');
  }
}

/**
 * Verify a signature (for testing purposes)
 * In production, verification happens on-chain
 */
export function verifySignature(
  voucherHash: string,
  signature: string,
  expectedSigner: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(
      ethers.getBytes(voucherHash),
      signature
    );
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Generate a unique nonce for voucher
 * Uses timestamp + random to ensure uniqueness
 */
export function generateNonce(): number {
  return Date.now() + Math.floor(Math.random() * 1000000);
}

/**
 * Validate replay data deterministically
 * This is where game physics validation would occur
 */
export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  prizeId?: number;
  difficulty?: number;
}

export async function validateReplayData(
  replayData: any,
  sessionId: string
): Promise<ValidationResult> {
  try {
    // TODO: Implement actual physics replay validation
    // For now, basic validation checks
    
    if (!replayData || !replayData.physicsData) {
      return {
        isValid: false,
        reason: 'Invalid replay data structure'
      };
    }

    if (replayData.sessionId !== sessionId) {
      return {
        isValid: false,
        reason: 'Session ID mismatch'
      };
    }

    if (replayData.result !== 'won') {
      return {
        isValid: false,
        reason: 'Player did not win'
      };
    }

    // Validate physics data exists
    const { clawPath, prizePosition, grabForce, dropHeight } = replayData.physicsData;
    
    if (!clawPath || !Array.isArray(clawPath) || clawPath.length === 0) {
      return {
        isValid: false,
        reason: 'Invalid claw path data'
      };
    }

    if (!prizePosition || typeof prizePosition.x === 'undefined') {
      return {
        isValid: false,
        reason: 'Invalid prize position data'
      };
    }

    // Calculate difficulty based on physics parameters
    const difficulty = calculateDifficulty(grabForce, dropHeight, clawPath.length);

    return {
      isValid: true,
      prizeId: replayData.prizeId,
      difficulty
    };
  } catch (error) {
    console.error('Error validating replay data:', error);
    return {
      isValid: false,
      reason: 'Validation error occurred'
    };
  }
}

/**
 * Calculate difficulty score (1-10) based on game physics
 */
function calculateDifficulty(
  grabForce: number,
  dropHeight: number,
  pathLength: number
): number {
  // Simple difficulty calculation
  // In production, this would be more sophisticated
  
  let difficulty = 1;
  
  // Higher drop height = harder
  if (dropHeight > 100) difficulty += 2;
  else if (dropHeight > 50) difficulty += 1;
  
  // Lower grab force = harder
  if (grabForce < 0.5) difficulty += 3;
  else if (grabForce < 0.7) difficulty += 2;
  else if (grabForce < 0.9) difficulty += 1;
  
  // Longer path = more skill
  if (pathLength > 100) difficulty += 2;
  else if (pathLength > 50) difficulty += 1;
  
  return Math.min(10, Math.max(1, difficulty));
}

export default {
  createVoucherHash,
  signWinVoucher,
  verifySignature,
  generateNonce,
  validateReplayData
};
