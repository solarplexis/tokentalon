# Backend Integration Guide

This guide walks through the complete backend integration for TokenTalon, including setup, deployment, and testing.

## Phase 2: Backend Integration - Complete ✅

### What We Built

1. **Blockchain Configuration** (`config/blockchain.ts`)
   - Contract ABIs for GameToken, PrizeNFT, ClawMachine
   - Multi-network support (Sepolia, Polygon, Amoy)
   - Provider and contract instance factories
   - Oracle wallet management

2. **IPFS Service** (`services/ipfsService.ts`)
   - Pinata SDK integration
   - Replay data upload
   - Prize metadata upload
   - IPFS content retrieval

3. **Oracle Service** (`services/oracleService.ts`)
   - Win voucher creation and signing
   - Signature verification
   - Nonce generation
   - Replay data validation
   - Difficulty calculation

4. **Game Service** (`services/gameService.ts`)
   - Session management (in-memory)
   - Blockchain game state queries
   - Player balance and NFT queries
   - Event monitoring

5. **API Routes**
   - Game endpoints (`routes/gameRoutes.ts`)
   - NFT endpoints (`routes/nftRoutes.ts`)

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

**Required Variables:**

```env
# Backend Oracle Key (generate new wallet for production!)
ORACLE_PRIVATE_KEY=0x...

# Pinata IPFS
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=gateway.pinata.cloud

# Network
NETWORK=sepolia

# Will be filled after contract deployment
SEPOLIA_GAMETOKEN_ADDRESS=
SEPOLIA_PRIZENFT_ADDRESS=
SEPOLIA_CLAWMACHINE_ADDRESS=
```

### 3. Deploy Smart Contracts

```bash
cd ../common

# Make sure you have Sepolia ETH in your wallet
# Update hardhat.config.ts with your private key

npm run deploy:sepolia
```

This will output contract addresses. Copy them to your `server/.env` file.

### 4. Update Environment with Contract Addresses

After deployment, update `server/.env`:

```env
SEPOLIA_GAMETOKEN_ADDRESS=0x...
SEPOLIA_PRIZENFT_ADDRESS=0x...
SEPOLIA_CLAWMACHINE_ADDRESS=0x...
```

### 5. Test Backend Services

```bash
cd server
npm run test:services
```

This validates:
- ✅ Environment variables
- ✅ Blockchain configuration
- ✅ IPFS/Pinata connection
- ✅ Oracle service functionality

### 6. Start Backend Server

```bash
npm run dev
```

Server runs at `http://localhost:3001`

## API Flow

### Complete Game Flow

```
1. Player connects wallet (frontend)
   ↓
2. Player approves GameToken spending
   ↓
3. Player calls ClawMachine.startGame() (blockchain)
   ↓
4. POST /api/game/start (backend creates session)
   ↓
5. Player plays game (Phaser frontend)
   ↓
6. Player wins! (game records replay data)
   ↓
7. POST /api/game/submit-win (backend validates & signs)
   ← Returns: signed voucher + metadata URI
   ↓
8. Player calls ClawMachine.claimPrize() (blockchain)
   ← Contract verifies signature & mints NFT
   ↓
9. GET /api/nft/:tokenId/metadata (view prize)
```

## Testing the Integration

### 1. Test with Hardhat Local Network

```bash
# Terminal 1 - Start local blockchain
cd common
npx hardhat node

# Terminal 2 - Deploy contracts locally
npm run deploy:local

# Terminal 3 - Start backend
cd ../server
# Update .env with local contract addresses
npm run dev

# Terminal 4 - Make test requests
curl http://localhost:3001/health
curl http://localhost:3001/api
```

### 2. Test Game Flow

```bash
# Start a game session (after calling startGame() on contract)
curl -X POST http://localhost:3001/api/game/start \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x...",
    "network": "sepolia"
  }'

# Submit a win (simplified - real replay data more complex)
curl -X POST http://localhost:3001/api/game/submit-win \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "...",
    "walletAddress": "0x...",
    "prizeId": 1,
    "prizeImageHash": "QmImage123",
    "replayData": {
      "sessionId": "...",
      "prizeId": 1,
      "difficulty": 5,
      "timestamp": 1234567890,
      "playerAddress": "0x...",
      "tokensSpent": 10,
      "physicsData": {
        "clawPath": [],
        "prizePosition": {"x": 0, "y": 0, "z": 0},
        "grabForce": 0.8,
        "dropHeight": 75
      },
      "result": "won"
    },
    "network": "sepolia"
  }'
```

### 3. Test NFT Endpoints

```bash
# Get player info
curl "http://localhost:3001/api/game/player/0x...?network=sepolia"

# Get NFT metadata
curl "http://localhost:3001/api/nft/0/metadata?network=sepolia"

# Get NFT collection
curl "http://localhost:3001/api/nft/collection/0x...?network=sepolia"
```

## Security Considerations

### Oracle Private Key
- **NEVER commit to git**
- Use environment variables only
- In production, use AWS Secrets Manager or HashiCorp Vault
- Rotate keys periodically

### Replay Validation
- Current implementation is basic
- Production should re-run full physics simulation
- Validate timing, paths, forces match expected values
- Consider adding checksums or signatures to replay data

### Rate Limiting
- Add rate limiting middleware (express-rate-limit)
- Prevent spam attacks on signature generation
- Limit requests per wallet address

### Session Security
- Current in-memory storage not production-ready
- Use Redis for distributed session storage
- Add session expiration and cleanup
- Validate session ownership strictly

## Production Checklist

- [ ] Deploy contracts to mainnet (Polygon recommended)
- [ ] Set up proper key management (Secrets Manager)
- [ ] Add rate limiting middleware
- [ ] Implement Redis for session storage
- [ ] Add request validation schemas (Zod/Joi)
- [ ] Set up monitoring (Datadog, New Relic)
- [ ] Add structured logging (Winston, Pino)
- [ ] Configure CORS for production domain
- [ ] Set up SSL/TLS certificates
- [ ] Implement health check endpoint monitoring
- [ ] Add database for permanent storage (PostgreSQL)
- [ ] Set up automated backups
- [ ] Configure CI/CD pipeline
- [ ] Load testing with realistic traffic
- [ ] Security audit of smart contracts
- [ ] Penetration testing of API

## Troubleshooting

### "ORACLE_PRIVATE_KEY not found"
- Make sure `.env` file exists in server directory
- Check the private key is valid (0x... format)
- Don't include quotes around the value

### "Pinata connection failed"
- Verify PINATA_JWT is correct
- Check Pinata dashboard for API status
- Ensure JWT has upload permissions

### "Invalid oracle signature"
- Oracle address in ClawMachine must match address derived from ORACLE_PRIVATE_KEY
- Check oracle address: `cast wallet address --private-key $ORACLE_PRIVATE_KEY`
- Update ClawMachine.setOracleAddress() if needed

### "No active game session"
- Player must call startGame() on contract first
- Then create backend session via /api/game/start
- Check blockchain game session: ClawMachine.getGameSession()

## Next Steps

1. ✅ Backend integration complete
2. ⏳ Frontend Web3 integration
3. ⏳ Phaser game integration with blockchain
4. ⏳ End-to-end testing
5. ⏳ Deployment to Sepolia testnet
6. ⏳ Production deployment to Polygon

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│  (Next.js +     │
│   Phaser)       │
└────────┬────────┘
         │ HTTP + Web3
         ↓
┌─────────────────┐      ┌──────────────┐
│  Backend API    │◄────►│   Pinata     │
│  (Express +     │      │   (IPFS)     │
│   Oracle)       │      └──────────────┘
└────────┬────────┘
         │ Web3 (ethers.js)
         ↓
┌─────────────────┐
│   Blockchain    │
│  GameToken      │
│  PrizeNFT       │
│  ClawMachine    │
└─────────────────┘
```

## Support

For questions or issues:
1. Check this guide first
2. Review BLOCKCHAIN_PLAN.md for architecture details
3. Check smart contract tests for expected behavior
4. Review API endpoint documentation in server/README.md
