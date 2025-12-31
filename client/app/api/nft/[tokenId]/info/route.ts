import { NextRequest, NextResponse } from 'next/server';
import * as gameService from '@/lib/services/gameService';

/**
 * GET /api/nft/:tokenId/info
 * Get full NFT prize info
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

    const prizeInfo = await gameService.getNFTPrizeInfo(tokenIdNum, network);

    return NextResponse.json({
      tokenId: tokenIdNum,
      ...prizeInfo
    });
  } catch (error: any) {
    console.error('Error getting NFT info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get NFT info' },
      { status: 500 }
    );
  }
}
