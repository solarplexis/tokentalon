# TokenTalon System Architecture

## Overview

TokenTalon is a blockchain-based claw machine game where players use TALON tokens to play and win NFT prizes. The entire application runs as a **single Next.js application** using App Router with server-side API routes, eliminating the need for a separate backend server.

## Architecture Principles

1. **Single Process Architecture**: Everything runs in one Next.js application for simplified deployment
2. **Server-Side Services**: Backend logic runs in Next.js API routes with access to server-only packages
3. **Blockchain Integration**: Direct smart contract interaction via ethers.js and viem
4. **Decentralized Storage**: Prize metadata and replay data stored on IPFS via Pinata
5. **AI-Generated NFTs**: Unique prize images created using OpenAI DALL-E

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Game Engine**: Phaser 3
- **Web3**: wagmi v2, viem
- **State Management**: React hooks + Context
- **Internationalization**: next-intl

### Backend (Next.js API Routes)
- **Runtime**: Node.js (Next.js server)
- **Blockchain**: ethers.js v6
- **IPFS**: Pinata SDK
- **AI Images**: OpenAI API (DALL-E)
- **Oracle**: Custom signature verification

### Infrastructure
- **Storage**: IPFS (Pinata)
- **RPC**: Public Sepolia nodes + Alchemy (optional)
- **Session Storage**: In-memory Map (production: Redis recommended)

## System Components

### 1. Frontend Application

```
client/app/
├── page.tsx                 # Home page with cabinet display
├── game/                    # Game page with Phaser canvas
├── gallery/                 # NFT gallery
└── api/                     # Next.js API routes (backend)
    ├── game/
    │   ├── start/          # Create game session
    │   ├── submit-win/     # Submit win & mint NFT
    │   ├── session/[id]/   # Get session info
    │   └── player/[addr]/  # Player stats
    └── nft/
        ├── owned/          # Get player's NFTs
        ├── [tokenId]/
        │   ├── metadata/   # NFT metadata
        │   ├── replay/     # Replay data
        │   └── info/       # NFT info
        └── collection/[addr]/ # Collection info
```

### 2. Backend Services (Server-Side)

Located in `client/lib/services/`, these run exclusively in API routes:

#### Game Service (`gameService.ts`)
- **Purpose**: Session management and blockchain game state
- **Key Functions**:
  - `createGameSession()` - Create new game session
  - `validateSession()` - Validate session ownership
  - `checkBlockchainGameSession()` - Query on-chain game state
  - `completeSession()` - Mark session complete
- **Storage**: In-memory Map (sessions expire after 1 hour)

#### Oracle Service (`oracleService.ts`)
- **Purpose**: Replay validation and voucher signing
- **Key Functions**:
  - `validateReplayData()` - Deterministic replay validation
  - `signWinVoucher()` - Sign voucher for on-chain prize claim
- **Security**: Uses `ORACLE_PRIVATE_KEY` for cryptographic signatures

#### IPFS Service (`ipfsService.ts`)
- **Purpose**: Decentralized storage for NFT metadata and replay data
- **Key Functions**:
  - `uploadReplayData()` - Upload game replay JSON
  - `uploadPrizeImage()` - Upload AI-generated prize image
  - `uploadPrizeMetadata()` - Upload ERC-721 metadata
  - `getFromIPFS()` - Retrieve content from IPFS
- **Features**:
  - **Exponential backoff retry**: 2s, 4s, 8s delays (max 10s)
  - **Smart error handling**: Won't retry on 401 auth errors
  - **All operations wrapped**: Resilient to transient Pinata issues

#### AI Image Service (`aiImageService.ts`)
- **Purpose**: Generate unique NFT images using DALL-E
- **Key Functions**:
  - `generatePrizeImage()` - Create unique AI image based on prize + traits
- **Process**:
  1. Read base prize image from filesystem
  2. Generate unique prompt with custom traits
  3. Call OpenAI DALL-E API
  4. Return image buffer for IPFS upload

### 3. Blockchain Integration

#### Smart Contracts
- **GameToken**: ERC-20 token with faucet and buyTokens
- **ClawMachine**: Game logic, session management, prize claiming
- **PrizeNFT**: ERC-721 NFT with voucher-based minting

#### Contract Interaction
- **Frontend**: Uses wagmi/viem for wallet transactions
- **Backend**: Uses ethers.js for reading contract state
- **Networks**: Sepolia testnet (primary), Polygon Amoy (secondary)

### 4. Game Flow

```
┌─────────────┐
│   Player    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  1. Connect Wallet (wagmi)      │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  2. Approve/Pay Tokens          │
│     (ClawMachine.payForGrab)    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  3. POST /api/game/start        │
│     - Check blockchain session  │
│     - Create backend session    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  4. Play Game (Phaser)          │
│     - Record replay data        │
│     - Calculate result          │
└──────┬──────────────────────────┘
       │
       ▼ (if won)
┌─────────────────────────────────┐
│  5. POST /api/game/submit-win   │
│     ├─ Validate replay data     │
│     ├─ Generate AI image        │
│     ├─ Upload to IPFS           │
│     │  ├─ Replay data           │
│     │  ├─ Prize image           │
│     │  └─ Metadata              │
│     └─ Sign voucher             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  6. Claim Prize (ClaimOverlay)  │
│     ClawMachine.claimPrize()    │
│     - Verify voucher signature  │
│     - Mint NFT to player        │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  7. View in Gallery             │
│     - Fetch NFTs from contract  │
│     - Display metadata + image  │
└─────────────────────────────────┘
```

### 5. NFT Gallery Architecture

#### Discovery Strategy
Due to free-tier RPC limitations, NFT discovery uses a hybrid approach:

1. **PrizeClaimed Events**: Query last 1000 blocks (~2-3 hours) for recent NFTs
2. **Transfer Events**: Fallback to catch transferred NFTs
3. **Contract Queries**: Get tokenURI for each discovered NFT
4. **Batched Fetching**: Process 5 URIs at a time with 100ms delay (rate limiting)

#### Caching Strategy
```typescript
// Server-side cache (API route)
const CACHE_TTL = 2000; // 2 seconds

// Client-side refetch triggers
- useEffect dependency: address, chainId, refetchTrigger
- Visibility change: Auto-refetch when tab becomes visible
- Manual refetch: After NFT transfer
```

#### RPC Provider Selection
- **Default**: publicnode.com (1000 block limit)
- **Alchemy Free**: 10 block limit (too restrictive)
- **Recommendation**: Alchemy Growth plan for production ($49/mo)

### 6. Data Flow Diagrams

#### Prize Claim Flow
```
Player → submitWin API
         ├─ validateReplayData()
         ├─ generatePrizeImage()
         │  └─ OpenAI DALL-E
         ├─ uploadReplayData() ───┐
         ├─ uploadPrizeImage()  ───┼─→ IPFS (Pinata)
         ├─ uploadMetadata()    ───┘
         └─ signWinVoucher()
            └─ returns {voucher, metadata}

Player → claimPrize (blockchain)
         └─ ClawMachine verifies voucher
            └─ PrizeNFT mints to player
```

#### NFT Gallery Flow
```
Player → /gallery page
         └─ useNFTGallery hook
            └─ GET /api/nft/owned
               ├─ Check cache (2s TTL)
               ├─ balanceOf(player)
               ├─ Scan PrizeClaimed events (1000 blocks)
               ├─ Scan Transfer events (fallback)
               ├─ Batch fetch tokenURIs (5 at a time)
               └─ Return {balance, nfts[]}

Client → Fetch IPFS metadata
         └─ gateway.pinata.cloud/ipfs/{cid}
            └─ Display {name, image, attributes}
```

## Security Considerations

### 1. Replay Protection
- Session IDs used to prevent replay attacks
- Deterministic validation ensures same inputs = same result
- Voucher signatures expire (time-based nonce)

### 2. Oracle Security
- Private key stored in environment variable (server-side only)
- Voucher includes: prizeId, metadataURI, replayHash, difficulty, nonce
- On-chain signature verification prevents tampering

### 3. Environment Variables
Server-side only (never exposed to client):
```env
ORACLE_PRIVATE_KEY=     # Oracle signing key
PINATA_JWT=             # IPFS upload credentials
OPENAI_API_KEY=         # AI image generation
ALCHEMY_API_KEY=        # RPC (optional)
```

Client-side (prefixed with NEXT_PUBLIC_):
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_SEPOLIA_RPC_URL=
```

### 4. Rate Limiting
- IPFS uploads: Exponential backoff (2s, 4s, 8s)
- RPC calls: Batched with delays
- Frontend: Disabled buttons during transactions

## Deployment Architecture

### Single Application Deployment
```
┌────────────────────────────────────┐
│      Next.js Application           │
│  ┌──────────────────────────────┐  │
│  │   Frontend (SSR/SSG)         │  │
│  │   - React components         │  │
│  │   - Phaser game              │  │
│  │   - wagmi Web3               │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │   API Routes (Server-side)   │  │
│  │   - Game services            │  │
│  │   - Oracle signing           │  │
│  │   - IPFS uploads             │  │
│  │   - AI image generation      │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
         │              │
         ▼              ▼
    ┌─────────┐    ┌─────────┐
    │  IPFS   │    │ Sepolia │
    │ Pinata  │    │   RPC   │
    └─────────┘    └─────────┘
```

### Recommended Production Setup
- **Hosting**: Vercel (automatic Next.js optimization)
- **Session Store**: Redis (replace in-memory Map)
- **RPC**: Alchemy Growth plan or dedicated node
- **IPFS**: Pinata Pro for better reliability
- **Monitoring**: Add logging service (Datadog, Sentry)

## Configuration Files

### next.config.ts
```typescript
{
  serverExternalPackages: ['pino', 'ethers', 'openai', 'pinata'],
  turbopack: {},
  // Turbopack requires serverExternalPackages for native modules
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020", // Required for BigInt support
    "lib": ["ES2020"],
    // ...
  }
}
```

## Performance Optimizations

### 1. Image Optimization
- Next.js Image component with `sizes` prop
- IPFS gateway URLs for NFT images
- Lazy loading with `priority` for above-fold

### 2. Font Loading
- Google Fonts with `display: "swap"`
- Prevents preload warnings
- Improves FCP (First Contentful Paint)

### 3. Caching Strategy
- Server-side: 2s cache for NFT queries
- Client-side: Stale-while-revalidate pattern
- Auto-refetch on visibility change

### 4. API Route Optimization
- Dynamic rendering: `export const dynamic = 'force-dynamic'`
- No caching for real-time data: `export const revalidate = 0`
- Batched RPC calls to avoid rate limits

## Future Improvements

### Scalability
- [ ] Replace in-memory sessions with Redis
- [ ] Add database for game history/leaderboards
- [ ] Implement GraphQL API for complex queries
- [ ] Add CDN for static assets

### Features
- [ ] Multiplayer tournaments
- [ ] NFT marketplace integration
- [ ] Social features (share wins)
- [ ] Achievement system

### Performance
- [ ] Implement service worker for offline play
- [ ] Add WebSocket for real-time updates
- [ ] Optimize Phaser asset loading
- [ ] Implement progressive image loading

### Monitoring
- [ ] Add APM (Application Performance Monitoring)
- [ ] Error tracking (Sentry)
- [ ] Analytics (game completion rates)
- [ ] Smart contract event indexing (The Graph)

## Development Guidelines

### Adding New Features
1. **Plan first**: Consider if it needs server-side processing
2. **API route or client component**: Server-side for secrets/blockchain
3. **Test locally**: Ensure works with Sepolia testnet
4. **Environment variables**: Add to `.env.example`

### Debugging
- Server logs: Check Next.js console output
- Client errors: Browser DevTools console
- Blockchain: Use Sepolia Etherscan
- IPFS: Check Pinata dashboard

### Testing Strategy
- **Frontend**: Component testing with React Testing Library
- **API Routes**: Integration tests with MSW
- **Smart Contracts**: Hardhat tests (separate repo)
- **E2E**: Playwright for full game flow

## Troubleshooting

### Common Issues

**NFTs not appearing in gallery**
- Check cache TTL (2s) - wait and refresh
- Verify NFT was claimed within last 2-3 hours (1000 blocks)
- Check RPC provider rate limits
- Manually refetch using visibility change

**IPFS upload failures**
- Check PINATA_JWT environment variable
- Verify Pinata account quota
- Review retry logic (exponential backoff)
- Check network connectivity

**Oracle signature verification fails**
- Ensure ORACLE_PRIVATE_KEY matches contract oracle address
- Check voucher nonce hasn't been used
- Verify network (sepolia vs amoy)

**Game session errors**
- Check blockchain session: call `getGameSession(address)`
- Ensure tokens approved and paid
- Verify session not expired (1 hour timeout)

## Conclusion

TokenTalon's consolidated architecture provides a robust, scalable foundation for a blockchain game. By running everything in a single Next.js application, we've simplified deployment while maintaining clear separation of concerns through API routes and service modules. The system is designed to handle the unique challenges of blockchain gaming: asynchronous transactions, decentralized storage, and real-time game state management.
