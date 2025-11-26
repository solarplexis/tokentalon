import { Router, Request, Response } from 'express';
import gameService from '../services/gameService';
import ipfsService from '../services/ipfsService';

const router = Router();

/**
 * GET /api/nft/:tokenId/metadata
 * Get NFT metadata (OpenSea compatible)
 */
router.get('/:tokenId/metadata', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { network = 'sepolia' } = req.query;

    const networkStr = network as 'sepolia' | 'polygon' | 'amoy';
    const tokenIdNum = parseInt(tokenId);

    if (isNaN(tokenIdNum)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    // Get prize info from contract
    const prizeInfo = await gameService.getNFTPrizeInfo(tokenIdNum, networkStr);

    // Get metadata from IPFS (if stored there)
    // For now, construct metadata from contract data
    const metadata = {
      name: `TokenTalon Prize #${prizeInfo.prizeId}`,
      description: 'A prize won from the TokenTalon blockchain claw machine game',
      image: `ipfs://QmPrizeImage${prizeInfo.prizeId}`, // Update with actual image hash
      external_url: `${process.env.FRONTEND_URL || 'https://tokentalon.com'}/prize/${tokenIdNum}`,
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

    return res.json(metadata);
  } catch (error: any) {
    console.error('Error getting NFT metadata:', error);
    return res.status(500).json({ error: error.message || 'Failed to get NFT metadata' });
  }
});

/**
 * GET /api/nft/:tokenId/replay
 * Get replay data for an NFT
 */
router.get('/:tokenId/replay', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { network = 'sepolia' } = req.query;

    const networkStr = network as 'sepolia' | 'polygon' | 'amoy';
    const tokenIdNum = parseInt(tokenId);

    if (isNaN(tokenIdNum)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    // Get prize info to find replay hash
    const prizeInfo = await gameService.getNFTPrizeInfo(tokenIdNum, networkStr);

    // Fetch replay data from IPFS
    const replayData = await ipfsService.getFromIPFS(prizeInfo.replayDataHash);

    return res.json({
      tokenId: tokenIdNum,
      prizeId: prizeInfo.prizeId,
      replayData
    });
  } catch (error: any) {
    console.error('Error getting replay data:', error);
    return res.status(500).json({ error: error.message || 'Failed to get replay data' });
  }
});

/**
 * GET /api/nft/:tokenId/info
 * Get full NFT prize info
 */
router.get('/:tokenId/info', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { network = 'sepolia' } = req.query;

    const networkStr = network as 'sepolia' | 'polygon' | 'amoy';
    const tokenIdNum = parseInt(tokenId);

    if (isNaN(tokenIdNum)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    const prizeInfo = await gameService.getNFTPrizeInfo(tokenIdNum, networkStr);

    return res.json({
      tokenId: tokenIdNum,
      ...prizeInfo
    });
  } catch (error: any) {
    console.error('Error getting NFT info:', error);
    return res.status(500).json({ error: error.message || 'Failed to get NFT info' });
  }
});

/**
 * GET /api/nft/collection/:address
 * Get all NFTs owned by an address
 */
router.get('/collection/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { network = 'sepolia' } = req.query;

    const networkStr = network as 'sepolia' | 'polygon' | 'amoy';

    // Get all token IDs owned by address
    const tokenIds = await gameService.getPlayerNFTs(address, networkStr);

    // Get info for each NFT
    const nfts = await Promise.all(
      tokenIds.map(async (tokenId) => {
        const info = await gameService.getNFTPrizeInfo(tokenId, networkStr);
        return {
          tokenId,
          ...info
        };
      })
    );

    return res.json({
      address,
      network: networkStr,
      count: nfts.length,
      nfts
    });
  } catch (error: any) {
    console.error('Error getting NFT collection:', error);
    return res.status(500).json({ error: error.message || 'Failed to get NFT collection' });
  }
});

export default router;
