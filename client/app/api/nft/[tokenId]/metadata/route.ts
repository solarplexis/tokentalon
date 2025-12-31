import { NextRequest, NextResponse } from 'next/server';
import * as gameService from '@/lib/services/gameService';

/**
 * GET /api/nft/:tokenId/metadata
 * Get NFT metadata (OpenSea compatible)
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

    // Get prize info from contract
    const prizeInfo = await gameService.getNFTPrizeInfo(tokenIdNum, network);

    // Get metadata from IPFS (if stored there)
    // For now, construct metadata from contract data
    const metadata = {
      name: `TokenTalon Prize #${prizeInfo.prizeId}`,
      description: 'A prize won from the TokenTalon blockchain claw machine game',
      image: `ipfs://QmPrizeImage${prizeInfo.prizeId}`, // Update with actual image hash
      external_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || 'https://tokentalon.com'}/prize/${tokenIdNum}`,
      attributes: [
        {
          trait_type: 'Prize ID',
          value: prizeInfo.prizeId
        },
        {
          trait_type: 'Difficulty',
          value: prizeInfo.difficulty
        },
        {
          trait_type: 'Tokens Spent',
          value: prizeInfo.tokensSpent
        },
        {
          trait_type: 'Rarity',
          value: prizeInfo.difficulty >= 8 ? 'Legendary' :
            prizeInfo.difficulty >= 6 ? 'Epic' :
              prizeInfo.difficulty >= 4 ? 'Rare' : 'Common'
        },
        {
          display_type: 'date',
          trait_type: 'Won At',
          value: prizeInfo.timestamp
        }
      ],
      replay_data: `ipfs://${prizeInfo.replayDataHash}`
    };

    return NextResponse.json(metadata);
  } catch (error: any) {
    console.error('Error getting NFT metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get NFT metadata' },
      { status: 500 }
    );
  }
}
