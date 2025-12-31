import { NextRequest, NextResponse } from 'next/server';
import * as gameService from '@/lib/services/gameService';

/**
 * POST /api/game/start
 * Start a new game session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, network = 'sepolia' } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate network
    if (!['sepolia', 'polygon', 'amoy'].includes(network)) {
      return NextResponse.json(
        { error: 'Invalid network' },
        { status: 400 }
      );
    }

    // Check if player already has active session on blockchain
    const blockchainSession = await gameService.checkBlockchainGameSession(
      walletAddress,
      network
    );

    if (!blockchainSession.active) {
      return NextResponse.json(
        {
          error: 'No active game on blockchain. Please call startGame() on the ClawMachine contract first.'
        },
        { status: 400 }
      );
    }

    // Create session in backend
    const session = gameService.createGameSession(walletAddress, network);

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      timestamp: session.timestamp,
      tokensEscrowed: blockchainSession.tokensEscrowed.toString()
    });
  } catch (error: any) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start game' },
      { status: 500 }
    );
  }
}
