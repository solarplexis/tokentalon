import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import gameRoutes from './routes/gameRoutes';
import nftRoutes from './routes/nftRoutes';
import { validateConfig } from './config/blockchain';
import { validatePinataConfig } from './services/ipfsService';
import { cleanupExpiredSessions } from './services/gameService';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;
const NETWORK = (process.env.NETWORK || 'sepolia') as 'sepolia' | 'polygon' | 'amoy';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'TokenTalon Server is running',
    network: NETWORK,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'TokenTalon API',
    version: '0.1.0',
    network: NETWORK,
    endpoints: {
      health: '/health',
      game: {
        start: 'POST /api/game/start',
        submitWin: 'POST /api/game/submit-win',
        session: 'GET /api/game/session/:sessionId',
        player: 'GET /api/game/player/:address'
      },
      nft: {
        metadata: 'GET /api/nft/:tokenId/metadata',
        replay: 'GET /api/nft/:tokenId/replay',
        info: 'GET /api/nft/:tokenId/info',
        collection: 'GET /api/nft/collection/:address'
      }
    }
  });
});

// Mount routes
app.use('/api/game', gameRoutes);
app.use('/api/nft', nftRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Validate configuration on startup
function validateStartupConfig(): boolean {
  console.log('🔍 Validating configuration...');
  
  const blockchainValid = validateConfig(NETWORK);
  const ipfsValid = validatePinataConfig();
  
  if (!blockchainValid) {
    console.warn('⚠️  Blockchain configuration incomplete - some features may not work');
  }
  
  if (!ipfsValid) {
    console.error('❌ IPFS configuration incomplete - prize minting will fail');
    return false;
  }
  
  return true;
}

// Cleanup expired sessions every hour
setInterval(() => {
  cleanupExpiredSessions();
}, 60 * 60 * 1000);

// Start server
validateStartupConfig();

app.listen(PORT, () => {
  console.log(`⚡️ TokenTalon Server running on port ${PORT}`);
  console.log(`🎮 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Network: ${NETWORK}`);
  console.log(`📡 Ready to accept requests`);
});

export default app;
