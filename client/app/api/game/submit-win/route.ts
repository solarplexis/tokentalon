import { NextRequest, NextResponse } from 'next/server';
import * as gameService from '@/lib/services/gameService';
import * as oracleService from '@/lib/services/oracleService';
import * as ipfsService from '@/lib/services/ipfsService';
import * as aiImageService from '@/lib/services/aiImageService';
import * as prizeMapper from '@/lib/utils/prizeMapper';

/**
 * POST /api/game/submit-win
 * Submit a win and get signed voucher for prize claim
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      walletAddress,
      replayData,
      prizeId,
      network = 'sepolia'
    } = body;

    // Validate required fields (sessionId kept for replay validation, but not validated as active session)
    if (!sessionId || !walletAddress || !replayData || !prizeId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: sessionId, walletAddress, replayData, prizeId'
        },
        { status: 400 }
      );
    }

    // Note: Session validation removed since contract no longer uses sessions
    // sessionId is still used for replay data validation to prevent replay attacks

    // Validate replay data deterministically
    const validation = await oracleService.validateReplayData(replayData, sessionId);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.reason || 'Invalid replay data' },
        { status: 400 }
      );
    }

    // Upload replay data to IPFS
    const replayHash = await ipfsService.uploadReplayData(replayData);

    // Get prize info and image path
    const prizeInfo = prizeMapper.getPrizeInfo(prizeId);
    const prizeImagePath = prizeMapper.getPrizeImagePath(prizeId);

    // Use prize's inherent rarity from prizes.json
    const rarity = prizeInfo.rarity || 'common';
    const difficulty = validation.difficulty || 5;

    // Use custom traits from frontend (already generated and displayed to user)
    const customTraits = body.customTraits || {};

    console.log(`🎨 Generating unique AI image for prize #${prizeId} (${prizeInfo.key}, ${rarity})...`);
    console.log(`📁 Base prize: ${prizeInfo.key}`);
    console.log(`✨ Custom traits:`, customTraits);

    // Generate unique AI image (Vision step removed to stay under Netlify timeout)
    const imageBuffer = await aiImageService.generatePrizeImage({
      basePrizeName: prizeInfo.key,
      basePrizeType: prizeInfo.key.replace('prize_', '').replace(/_/g, ' '),
      basePrizeImagePath: prizeImagePath,
      customTraits,
      rarity,
      difficulty,
      tokensSpent: replayData.tokensSpent || 10,
      playerAddress: walletAddress,
      timestamp: Date.now()
    });

    console.log(`📤 Uploading AI-generated image to IPFS...`);
    const prizeImageHash = await ipfsService.uploadPrizeImage(imageBuffer, prizeId);
    // console.log(`✅ Image uploaded: ipfs://${prizeImageHash}`);

    // Generate readable prize name with rarity
    const prizeName = prizeMapper.getPrizeName(prizeInfo.key);
    const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    const nftName = `${rarityLabel} ${prizeName}`; // e.g., "Epic Nemo" or "Legendary Dragon Egg"

    // Upload prize metadata to IPFS
    const metadataHash = await ipfsService.uploadPrizeMetadata(
      prizeId,
      nftName,
      `A ${rarity} prize from the TokenTalon Claw Machine featuring ${prizeName}`,
      prizeImageHash,
      replayHash,
      difficulty,
      replayData.tokensSpent || 10,
      customTraits, // Include custom traits in metadata
      rarity // Pass the actual prize rarity
    );

    const metadataUri = `ipfs://${metadataHash}`;

    // Generate nonce and create voucher
    const nonce = oracleService.generateNonce();
    const voucher = {
      playerAddress: walletAddress,
      prizeId,
      metadataUri,
      replayDataHash: replayHash,
      difficulty: validation.difficulty || 5,
      nonce
    };

    // Sign voucher with oracle
    const signedVoucher = await oracleService.signWinVoucher(voucher, network);

    // Mark session as completed
    gameService.completeSession(sessionId, prizeId);

    return NextResponse.json({
      success: true,
      voucher: {
        voucherHash: signedVoucher.voucherHash,
        signature: signedVoucher.signature,
        nonce: signedVoucher.nonce
      },
      metadata: {
        uri: metadataUri,
        replayDataHash: replayHash,
        difficulty: validation.difficulty
      },
      prizeId,
      customTraits // Include generated traits for frontend display
    });
  } catch (error: any) {
    console.error('Error submitting win:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit win' },
      { status: 500 }
    );
  }
}
