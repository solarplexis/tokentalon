import { NextRequest, NextResponse } from 'next/server';
import * as gameService from '@/lib/services/gameService';

/**
 * GET /api/game/player/:address
 * Get player info (balance, NFTs, active session)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const network = (searchParams.get('network') || 'sepolia') as 'sepolia' | 'polygon' | 'amoy';

    // Get blockchain data
    const [tokenBalance, nftTokenIds, blockchainSession] = await Promise.all([
      gameService.getPlayerTokenBalance(address, network),
      gameService.getPlayerNFTs(address, network),
      gameService.checkBlockchainGameSession(address, network)
    ]);

    return NextResponse.json({
      address,
      network,
      tokenBalance,
      nftCount: nftTokenIds.length,
      nftTokenIds,
      activeGame: {
        active: blockchainSession.active,
        tokensEscrowed: blockchainSession.tokensEscrowed.toString(),
        timestamp: blockchainSession.timestamp.toString()
      }
    });
  } catch (error: any) {
    console.error('Error getting player info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get player info' },
      { status: 500 }
    );
  }
}
