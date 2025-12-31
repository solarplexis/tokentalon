import { NextRequest, NextResponse } from 'next/server';
import * as gameService from '@/lib/services/gameService';

/**
 * GET /api/nft/collection/:address
 * Get all NFTs owned by an address
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const network = (searchParams.get('network') || 'sepolia') as 'sepolia' | 'polygon' | 'amoy';

    // Get all token IDs owned by address
    const tokenIds = await gameService.getPlayerNFTs(address, network);

    // Get info for each NFT
    const nfts = await Promise.all(
      tokenIds.map(async (tokenId) => {
        const info = await gameService.getNFTPrizeInfo(tokenId, network);
        return {
          tokenId,
          ...info
        };
      })
    );

    return NextResponse.json({
      address,
      network,
      count: nfts.length,
      nfts
    });
  } catch (error: any) {
    console.error('Error getting NFT collection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get NFT collection' },
      { status: 500 }
    );
  }
}
