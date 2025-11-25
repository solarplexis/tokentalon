# TokenTalon Server

Node.js backend API for the TokenTalon claw machine game.

## Features

- **Game Session Management**: Track and validate game sessions
- **Blockchain Integration**: Interact with smart contracts via ethers.js
- **NFT Minting**: Secure NFT minting with oracle pattern
- **IPFS Storage**: Store replay data and images on IPFS
- **User Management**: Track user stats and leaderboards
- **API Endpoints**: RESTful API for client interactions

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Blockchain**: ethers.js
- **Storage**: IPFS (Pinata)

## Project Structure

```
server/
├── src/
│   ├── controllers/       # Route controllers
│   │   ├── gameController.ts
│   │   ├── nftController.ts
│   │   └── userController.ts
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   │   ├── blockchainService.ts
│   │   ├── ipfsService.ts
│   │   └── gameService.ts
│   ├── models/           # Database models
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utility functions
│   ├── config/           # Configuration
│   └── index.ts          # Application entry point
└── dist/                 # Compiled output
```

## Getting Started

### Development

```bash
# From the server directory
npm run dev
```

The server will start on http://localhost:3001

### Building

```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/tokentalon

# Blockchain Configuration
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here

# Smart Contract Addresses (after deployment)
GAME_TOKEN_ADDRESS=
CLAW_MACHINE_ADDRESS=
PRIZE_NFT_ADDRESS=

# IPFS Configuration
IPFS_API_URL=https://api.pinata.cloud
PINATA_API_KEY=
PINATA_SECRET_KEY=

# JWT Secret
JWT_SECRET=your_jwt_secret_here
```

## API Endpoints

### Health Check
```
GET /health
```

### Game Endpoints
```
POST /api/game/start        # Start a new game session
POST /api/game/submit-win   # Submit winning game data
GET  /api/game/:sessionId   # Get game session details
```

### NFT Endpoints
```
POST /api/nft/mint          # Mint NFT (protected)
GET  /api/nft/:tokenId      # Get NFT metadata
GET  /api/nft/user/:address # Get user's NFTs
```

### User Endpoints
```
GET  /api/user/:address     # Get user profile
GET  /api/user/:address/stats  # Get user stats
GET  /api/leaderboard       # Get leaderboard
```

## Services

### Blockchain Service
Handles all smart contract interactions:
- Token transfers
- NFT minting
- Contract queries

### IPFS Service
Manages decentralized storage:
- Upload replay data
- Upload prize images
- Pin files to IPFS

### Game Service
Manages game logic:
- Validate game sessions
- Process win claims
- Calculate rewards

## Security

- **Oracle Pattern**: Backend validates wins before minting
- **Helmet**: Security headers
- **CORS**: Configured for client domain
- **Rate Limiting**: Prevent abuse (to be implemented)
- **Input Validation**: Sanitize all inputs

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Database Models

### User
- Wallet address
- Stats (wins, losses, tokens spent)
- NFTs owned

### GameSession
- Session ID
- Player address
- Prize selected
- Claw data
- Result (win/loss)

### NFT
- Token ID
- Owner
- Metadata URI
- Mint transaction

## Learn More

- [Express Documentation](https://expressjs.com/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
