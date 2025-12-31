import { ethers } from 'ethers';
import { getContracts, getProvider } from '@/lib/config/blockchain';

/**
 * Game Service
 * Handles game session management and blockchain interaction
 */

export interface GameSession {
  sessionId: string;
  playerAddress: string;
  timestamp: number;
  active: boolean;
  prizeId?: number;
  network: 'sepolia' | 'polygon' | 'amoy';
}

// In-memory session store (in production, use Redis or database)
const activeSessions = new Map<string, GameSession>();

/**
 * Create a new game session
 */
export function createGameSession(
  playerAddress: string,
  network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia'
): GameSession {
  const sessionId = generateSessionId(playerAddress);
  
  const session: GameSession = {
    sessionId,
    playerAddress: playerAddress.toLowerCase(),
    timestamp: Date.now(),
    active: true,
    network
  };

  activeSessions.set(sessionId, session);
  
  console.log(`🎮 Created game session: ${sessionId} for ${playerAddress}`);
  
  return session;
}

/**
 * Get session by ID
 */
export function getGameSession(sessionId: string): GameSession | null {
  return activeSessions.get(sessionId) || null;
}

/**
 * Validate session is active and belongs to player
 */
export function validateSession(
  sessionId: string,
  playerAddress: string
): { valid: boolean; reason?: string } {
  const session = activeSessions.get(sessionId);

  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }

  if (!session.active) {
    return { valid: false, reason: 'Session is not active' };
  }

  if (session.playerAddress.toLowerCase() !== playerAddress.toLowerCase()) {
    return { valid: false, reason: 'Session does not belong to player' };
  }

  // Check if session is expired (1 hour timeout)
  const ONE_HOUR = 60 * 60 * 1000;
  if (Date.now() - session.timestamp > ONE_HOUR) {
    session.active = false;
    return { valid: false, reason: 'Session expired' };
  }

  return { valid: true };
}

/**
 * Mark session as completed
 */
export function completeSession(sessionId: string, prizeId: number): boolean {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return false;
  }

  session.active = false;
  session.prizeId = prizeId;
  
  console.log(`✅ Completed game session: ${sessionId} - Prize ${prizeId}`);
  
  return true;
}

/**
 * Check if player has active game on blockchain
 */
export async function checkBlockchainGameSession(
  playerAddress: string,
  network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia'
): Promise<{
  active: boolean;
  tokensEscrowed: bigint;
  timestamp: bigint;
}> {
  try {
    const contracts = getContracts(network);
    const sessionData = await contracts.clawMachine.getGameSession(playerAddress);
    
    return {
      active: sessionData.active,
      tokensEscrowed: sessionData.tokensEscrowed,
      timestamp: sessionData.timestamp
    };
  } catch (error) {
    console.error('Error checking blockchain game session:', error);
    throw new Error('Failed to check blockchain game session');
  }
}

/**
 * Get player's token balance
 */
export async function getPlayerTokenBalance(
  playerAddress: string,
  network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia'
): Promise<string> {
  try {
    const contracts = getContracts(network);
    const balance = await contracts.gameToken.balanceOf(playerAddress);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting player token balance:', error);
    throw new Error('Failed to get player token balance');
  }
}

/**
 * Get player's NFT collection
 */
export async function getPlayerNFTs(
  playerAddress: string,
  network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia'
): Promise<number[]> {
  try {
    const contracts = getContracts(network);
    const tokenIds = await contracts.prizeNFT.tokensOfOwner(playerAddress);
    return tokenIds.map((id: bigint) => Number(id));
  } catch (error) {
    console.error('Error getting player NFTs:', error);
    throw new Error('Failed to get player NFTs');
  }
}

/**
 * Get NFT prize info
 */
export async function getNFTPrizeInfo(
  tokenId: number,
  network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia'
): Promise<{
  prizeId: number;
  replayDataHash: string;
  difficulty: number;
  tokensSpent: string;
  timestamp: number;
}> {
  try {
    const contracts = getContracts(network);
    const prizeInfo = await contracts.prizeNFT.getPrizeInfo(tokenId);
    
    return {
      prizeId: Number(prizeInfo.prizeId),
      replayDataHash: prizeInfo.replayDataHash,
      difficulty: prizeInfo.difficulty,
      tokensSpent: ethers.formatEther(prizeInfo.tokensSpent),
      timestamp: Number(prizeInfo.timestamp)
    };
  } catch (error) {
    console.error('Error getting NFT prize info:', error);
    throw new Error('Failed to get NFT prize info');
  }
}

/**
 * Monitor for game start events
 */
export async function monitorGameEvents(
  network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia',
  callback: (event: any) => void
): Promise<void> {
  try {
    const provider = getProvider(network);
    const contracts = getContracts(network, provider);

    // Listen for GameStarted events
    contracts.clawMachine.on('GameStarted', (player, tokensEscrowed, event) => {
      console.log(`🎮 Game started: ${player} - ${ethers.formatEther(tokensEscrowed)} tokens`);
      callback({
        type: 'GameStarted',
        player,
        tokensEscrowed: ethers.formatEther(tokensEscrowed),
        event
      });
    });

    // Listen for PrizeClaimed events
    contracts.clawMachine.on('PrizeClaimed', (player, tokenId, prizeId, voucherHash, event) => {
      console.log(`🏆 Prize claimed: ${player} - Token ${tokenId} - Prize ${prizeId}`);
      callback({
        type: 'PrizeClaimed',
        player,
        tokenId: Number(tokenId),
        prizeId: Number(prizeId),
        voucherHash,
        event
      });
    });

    console.log(`👂 Monitoring game events on ${network}...`);
  } catch (error) {
    console.error('Error monitoring game events:', error);
    throw new Error('Failed to monitor game events');
  }
}

/**
 * Generate unique session ID
 */
function generateSessionId(playerAddress: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${playerAddress.slice(0, 8)}-${timestamp}-${random}`;
}

/**
 * Clean up expired sessions (run periodically)
 */
export function cleanupExpiredSessions(): number {
  const ONE_HOUR = 60 * 60 * 1000;
  let cleaned = 0;

  for (const [sessionId, session] of activeSessions.entries()) {
    if (Date.now() - session.timestamp > ONE_HOUR) {
      activeSessions.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
  }

  return cleaned;
}

export default {
  createGameSession,
  getGameSession,
  validateSession,
  completeSession,
  checkBlockchainGameSession,
  getPlayerTokenBalance,
  getPlayerNFTs,
  getNFTPrizeInfo,
  monitorGameEvents,
  cleanupExpiredSessions
};
