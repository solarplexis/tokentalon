import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'TokenTalon Server is running' });
});

// API routes placeholder
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'TokenTalon API',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      game: '/api/game',
      nft: '/api/nft',
      user: '/api/user'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`⚡️ TokenTalon Server running on port ${PORT}`);
  console.log(`🎮 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
