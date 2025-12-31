import { NextRequest, NextResponse } from 'next/server';
import * as gameService from '@/lib/services/gameService';
import * as ipfsService from '@/lib/services/ipfsService';

/**
 * GET /api/nft/:tokenId/replay
 * Get replay data for an NFT
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;
    const { searchParams } = new URL(request.url);
    const network = (searchParams.get('network') || 'sepolia') as 'sepolia' | 'polygon' | 'amoy';

    const tokenIdNum = parseInt(tokenId);

    if (isNaN(tokenIdNum)) {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      );
    }

    // Get prize info to find replay hash
    const prizeInfo = await gameService.getNFTPrizeInfo(tokenIdNum, network);

    // Fetch replay data from IPFS
    const replayData = await ipfsService.getFromIPFS(prizeInfo.replayDataHash);

    return NextResponse.json({
      tokenId: tokenIdNum,
      prizeId: prizeInfo.prizeId,
      replayData
    });
  } catch (error: any) {
    console.error('Error getting replay data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get replay data' },
      { status: 500 }
    );
  }
}
