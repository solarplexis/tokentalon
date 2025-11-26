import { Router, Request, Response } from 'express';
import gameService from '../services/gameService';
import oracleService from '../services/oracleService';
import ipfsService from '../services/ipfsService';

const router = Router();

/**
 * POST /api/game/start
 * Start a new game session
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { walletAddress, network = 'sepolia' } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate network
    if (!['sepolia', 'polygon', 'amoy'].includes(network)) {
      return res.status(400).json({ error: 'Invalid network' });
    }

    // Check if player already has active session on blockchain
    const blockchainSession = await gameService.checkBlockchainGameSession(
      walletAddress,
      network
    );

    if (!blockchainSession.active) {
      return res.status(400).json({
        error: 'No active game on blockchain. Please call startGame() on the ClawMachine contract first.'
      });
    }

    // Create session in backend
    const session = gameService.createGameSession(walletAddress, network);

    res.json({
      success: true,
      sessionId: session.sessionId,
      timestamp: session.timestamp,
      tokensEscrowed: blockchainSession.tokensEscrowed.toString()
    });
  } catch (error: any) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: error.message || 'Failed to start game' });
  }
});

/**
 * POST /api/game/submit-win
 * Submit a win and get signed voucher for prize claim
 */
router.post('/submit-win', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      walletAddress,
      replayData,
      prizeId,
      prizeImageHash,
      network = 'sepolia'
    } = req.body;

    // Validate required fields
    if (!sessionId || !walletAddress || !replayData || !prizeId) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, walletAddress, replayData, prizeId'
      });
    }

    // Validate session
    const sessionValidation = gameService.validateSession(sessionId, walletAddress);
    if (!sessionValidation.valid) {
      return res.status(400).json({ error: sessionValidation.reason });
    }

    // Validate replay data deterministically
    const validation = await oracleService.validateReplayData(replayData, sessionId);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.reason || 'Invalid replay data' });
    }

    // Upload replay data to IPFS
    const replayHash = await ipfsService.uploadReplayData(replayData);

    // Upload prize metadata to IPFS
    const metadataHash = await ipfsService.uploadPrizeMetadata(
      prizeId,
      `Prize #${prizeId}`,
      'TokenTalon Claw Machine Prize',
      prizeImageHash,
      replayHash,
      validation.difficulty || 5,
      replayData.tokensSpent || 10
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

    res.json({
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
      prizeId
    });
  } catch (error: any) {
    console.error('Error submitting win:', error);
    res.status(500).json({ error: error.message || 'Failed to submit win' });
  }
});

/**
 * GET /api/game/session/:sessionId
 * Get game session info
 */
router.get('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = gameService.getGameSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.sessionId,
      playerAddress: session.playerAddress,
      timestamp: session.timestamp,
      active: session.active,
      prizeId: session.prizeId,
      network: session.network
    });
  } catch (error: any) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: error.message || 'Failed to get session' });
  }
});

/**
 * GET /api/game/player/:address
 * Get player info (balance, NFTs, active session)
 */
router.get('/player/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { network = 'sepolia' } = req.query;

    const networkStr = network as 'sepolia' | 'polygon' | 'amoy';

    // Get blockchain data
    const [tokenBalance, nftTokenIds, blockchainSession] = await Promise.all([
      gameService.getPlayerTokenBalance(address, networkStr),
      gameService.getPlayerNFTs(address, networkStr),
      gameService.checkBlockchainGameSession(address, networkStr)
    ]);

    res.json({
      address,
      network: networkStr,
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
    res.status(500).json({ error: error.message || 'Failed to get player info' });
  }
});

export default router;
