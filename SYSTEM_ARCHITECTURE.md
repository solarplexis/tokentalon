# TokenTalon System Architecture & Design Document

**Version:** 1.0
**Last Updated:** December 2025
**Author:** System Documentation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Layers](#2-architecture-layers)
3. [Smart Contracts Layer](#3-smart-contracts-layer)
4. [Backend Services Layer](#4-backend-services-layer)
5. [Frontend Application Layer](#5-frontend-application-layer)
6. [Data Flow & Interactions](#6-data-flow--interactions)
7. [Component Hierarchy](#7-component-hierarchy)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Key Design Patterns](#9-key-design-patterns)
10. [Security Considerations](#10-security-considerations)
11. [File Structure Reference](#11-file-structure-reference)

---

## 1. System Overview

TokenTalon is a blockchain-based claw machine game that combines traditional arcade gameplay with Web3 technology, NFTs, and cryptocurrency. Players use TALON tokens to operate a virtual claw machine, and successful grabs result in minted NFT prizes with embedded replay data.

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                                │
│  (Web Browser with Crypto Wallet - MetaMask, WalletConnect)    │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   FRONTEND LAYER                                 │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Next.js    │  │   Phaser 3   │  │  Wagmi/Viem  │         │
│  │   (React)    │  │ Game Engine  │  │ Web3 Hooks   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  Components: Game UI, Wallet, Gallery, Admin Panel              │
└────────────────────────┬────────────────────────────────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
┌───────────▼──┐    ┌───▼───────┐   │
│   Backend    │    │ Blockchain │   │
│   Server     │    │  Network   │   │
│  (Node.js)   │    │ (Sepolia/  │   │
│              │    │  Polygon)  │   │
│  ┌────────┐ │    │            │   │
│  │ Oracle │ │    └─────┬──────┘   │
│  │Service │ │          │          │
│  └────────┘ │          │          │
│  ┌────────┐ │    ┌─────▼──────┐   │
│  │  AI    │ │    │  Smart     │   │
│  │ Image  │ │    │ Contracts  │   │
│  │Service │ │    │            │   │
│  └────────┘ │    │ GameToken  │   │
│  ┌────────┐ │    │ ClawMachine│   │
│  │  IPFS  │ │    │ PrizeNFT   │   │
│  │Service │ │    └────────────┘   │
│  └────────┘ │                     │
└──────────────┘                     │
            │                        │
            └────────────────────────┘
            IPFS (Pinata Gateway)
```

### 1.2 Technology Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- Phaser 3 (Game Engine)
- wagmi v2 (Web3 React Hooks)
- viem (Ethereum interactions)
- next-intl (Internationalization)

**Backend:**
- Node.js with Express
- TypeScript
- ethers.js (Contract interactions)
- Pinata SDK (IPFS storage)
- OpenAI API (AI image generation)

**Smart Contracts:**
- Solidity 0.8.20+
- OpenZeppelin Contracts
- Hardhat (Development & Deployment)

**Infrastructure:**
- IPFS (Pinata) for NFT metadata storage
- Ethereum Sepolia Testnet
- Polygon Amoy Testnet

---

## 2. Architecture Layers

TokenTalon follows a **three-tier architecture** with clear separation of concerns:

### 2.1 Layer Responsibilities

| Layer | Responsibility | Technologies |
|-------|---------------|--------------|
| **Smart Contracts** | State management, token economy, NFT minting, game payment verification | Solidity, OpenZeppelin |
| **Backend Services** | Oracle validation, IPFS management, AI generation, metadata creation | Node.js, Express |
| **Frontend Application** | User interface, game rendering, wallet integration, blockchain interaction | React, Next.js, Phaser |

### 2.2 Communication Flow

```
Frontend → RPC Provider → Blockchain (Read blockchain state)
Frontend → Wallet → Blockchain (Send transactions)
Frontend ← Backend → IPFS (Metadata & images)
Backend → Blockchain (Oracle signature verification)
```

---

## 3. Smart Contracts Layer

The blockchain layer consists of three main contracts that work together to create a trustless game economy.

### 3.1 Contract Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GameToken (ERC-20)                    │
│  ┌────────────────────────────────────────────────┐    │
│  │ • Token minting & burning                       │    │
│  │ • Faucet system (testnet)                      │    │
│  │ • Token purchase with ETH                      │    │
│  │ • Supply management (10M cap)                  │    │
│  └────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────┘
                 │ transferFrom()
                 │
┌────────────────▼────────────────────────────────────────┐
│                  ClawMachine (Game Logic)                │
│  ┌────────────────────────────────────────────────┐    │
│  │ • Payment collection (payForGrab)              │    │
│  │ • Grab count tracking                          │    │
│  │ • Oracle signature verification                │    │
│  │ • Prize claiming (claimPrize)                  │    │
│  │ • Voucher replay protection                    │    │
│  └────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────┘
                 │ mintPrize()
                 │
┌────────────────▼────────────────────────────────────────┐
│                   PrizeNFT (ERC-721)                     │
│  ┌────────────────────────────────────────────────┐    │
│  │ • NFT minting with metadata                    │    │
│  │ • Prize info storage (difficulty, timestamp)   │    │
│  │ • Replay data hash storage (IPFS CID)          │    │
│  │ • Token ownership & transfers                  │    │
│  │ • Role-based access (MINTER_ROLE)              │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Contract Details

#### 3.2.1 GameToken.sol

**Purpose:** ERC-20 token serving as in-game currency

**Key Functions:**
- `buyTokens()` - Purchase tokens with ETH at configurable price
- `claimFaucet()` - Free testnet tokens (5-minute cooldown)
- `mint(address, uint256)` - Owner minting (respects MAX_SUPPLY)
- `setTokenPrice(uint256)` - Update token price
- `setFaucetAmount(uint256)` - Configure faucet distribution
- `setFaucetCooldown(uint256)` - Configure claim frequency
- `setFaucetEnabled(bool)` - Enable/disable faucet
- `withdraw()` - Withdraw ETH from token sales

**State Variables:**
```solidity
uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18
uint256 public tokenPrice               // Wei per token
uint256 public faucetAmount             // Tokens per claim
uint256 public faucetCooldown           // Seconds between claims
bool public faucetEnabled               // Faucet on/off
mapping(address => uint256) public lastFaucetClaim
```

**Access Control:**
- Ownable pattern (single admin)
- Public purchase/claim functions
- Owner-only configuration

#### 3.2.2 ClawMachine.sol

**Purpose:** Game orchestrator handling payments and prize distribution

**Key Functions:**
- `payForGrab()` - Accept payment for one game attempt
- `claimPrize(...)` - Verify oracle signature and mint NFT
- `setCostPerPlay(uint256)` - Update game cost
- `setOracleAddress(address)` - Update backend oracle
- `withdrawTokens()` - Withdraw accumulated revenue

**Oracle Pattern:**
```solidity
// Backend signs voucher containing:
bytes32 voucherHash = keccak256(abi.encodePacked(
    player,          // Winner address
    prizeId,         // Prize type ID
    metadataUri,     // IPFS metadata URL
    replayDataHash,  // IPFS replay data CID
    difficulty,      // 1-10 difficulty score
    nonce            // Unique ID (prevents replay)
));

// Contract verifies oracle signature
require(
    voucherHash.toEthSignedMessageHash().recover(signature) == oracleAddress,
    "Invalid oracle signature"
);
```

**State Variables:**
```solidity
GameToken public immutable gameToken
PrizeNFT public immutable prizeNFT
address public oracleAddress
uint256 public costPerPlay
mapping(bytes32 => bool) public usedVouchers       // Replay protection
mapping(address => uint256) public grabCounts      // Track attempts
```

**Security Features:**
- Voucher replay protection
- Oracle signature verification
- Immutable contract references
- Reentrancy-safe design

#### 3.2.3 PrizeNFT.sol

**Purpose:** ERC-721 NFTs representing won prizes with embedded metadata

**Key Functions:**
- `mintPrize(...)` - Create new prize NFT (MINTER_ROLE only)
- `getPrizeInfo(tokenId)` - Retrieve all prize metadata
- `tokensOfOwner(address)` - Get all NFTs for an address
- `grantMinterRole(address)` - Authorize minters (admin only)

**Metadata Storage:**
```solidity
mapping(uint256 => uint256) public tokenToPrizeId      // Prize type
mapping(uint256 => string) public tokenToReplayData    // IPFS CID
mapping(uint256 => uint8) public tokenToDifficulty     // 1-10 score
mapping(uint256 => uint256) public tokenToTimestamp    // Win time
mapping(uint256 => uint256) public tokenToTokensSpent  // Cost to win
```

**Access Control:**
- Role-based (AccessControl)
- DEFAULT_ADMIN_ROLE: Contract owner
- MINTER_ROLE: ClawMachine contract

**NFT Metadata Structure (IPFS JSON):**
```json
{
  "name": "Prize #123",
  "description": "TokenTalon prize won...",
  "image": "ipfs://Qm...",
  "attributes": [
    {"trait_type": "Prize ID", "value": "42"},
    {"trait_type": "Difficulty", "value": "7"},
    {"trait_type": "Tokens Spent", "value": "150"},
    {"trait_type": "Rarity", "value": "Rare"},
    {"trait_type": "Won On", "value": "2024-12-01"}
  ],
  "replayData": "ipfs://Qm..."
}
```

### 3.3 Contract Deployment Flow

```
1. Deploy GameToken
   └─> Set initial supply and token price

2. Deploy PrizeNFT
   └─> Grant DEFAULT_ADMIN_ROLE to deployer

3. Deploy ClawMachine
   ├─> Pass GameToken address
   ├─> Pass PrizeNFT address
   ├─> Set oracle address (backend server)
   └─> Set cost per play

4. Configure Roles
   └─> Grant MINTER_ROLE on PrizeNFT to ClawMachine

5. Update Frontend Config
   └─> Auto-update client/lib/contracts/addresses.ts
```

**Deployment Script:** `common/scripts/deploy.ts`

**Address Management:**
- Deployed addresses stored in: `common/deployments/<network>/<contract>.json`
- Auto-synced to frontend: `client/lib/contracts/addresses.ts`

---

## 4. Backend Services Layer

The Node.js backend provides off-chain services that complement the blockchain layer.

### 4.1 Backend Architecture

```
server/src/
├── index.ts              # Express app entry point
├── routes/
│   ├── gameRoutes.ts     # Game session endpoints
│   └── nftRoutes.ts      # NFT metadata endpoints
├── services/
│   ├── oracleService.ts  # Win verification & signing
│   ├── ipfsService.ts    # Pinata IPFS integration
│   ├── aiImageService.ts # OpenAI image generation
│   └── gameService.ts    # Game state management
├── config/
│   └── env.ts            # Environment configuration
└── utils/
    └── web3.ts           # Ethers.js utilities
```

### 4.2 Service Responsibilities

#### 4.2.1 Oracle Service (`oracleService.ts`)

**Purpose:** Verify game wins and sign vouchers for on-chain claiming

**Key Functions:**
```typescript
async function verifyWinAndSign(params: {
  player: string;
  prizeId: number;
  gameState: GameState;
  replayData: ReplayData;
}): Promise<{
  signature: string;
  voucher: VoucherData;
}> {
  // 1. Validate game state (physics, timing, no cheating)
  // 2. Calculate difficulty score
  // 3. Upload replay data to IPFS
  // 4. Create voucher hash
  // 5. Sign voucher with oracle private key
  // 6. Return signature for on-chain verification
}
```

**Security Measures:**
- Private key stored in environment variable (never exposed)
- Voucher nonce generation (prevent replay)
- Game state validation (detect cheating)
- Rate limiting on signature requests

**Oracle Wallet:**
- Dedicated Ethereum address
- Only used for signing (never holds funds)
- Address registered in ClawMachine contract

#### 4.2.2 IPFS Service (`ipfsService.ts`)

**Purpose:** Manage NFT metadata and replay data storage on IPFS via Pinata

**Key Functions:**
```typescript
async function uploadNFTMetadata(metadata: NFTMetadata): Promise<string>
async function uploadReplayData(replay: ReplayData): Promise<string>
async function uploadImage(imageBuffer: Buffer): Promise<string>
async function pinFile(file: File): Promise<PinataResponse>
```

**Metadata Structure:**
```typescript
interface NFTMetadata {
  name: string;              // "Prize #123"
  description: string;       // Prize description
  image: string;             // IPFS URL
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  replayData: string;        // IPFS CID for replay
}

interface ReplayData {
  prizeId: number;
  difficulty: number;
  timestamp: number;
  playerActions: Action[];   // Timestamped inputs
  prizePositions: Position[];
  clawPath: PathPoint[];
}
```

**IPFS Workflow:**
```
1. Game win occurs (frontend)
2. Frontend sends replay data to backend
3. Backend validates win
4. Upload replay JSON to IPFS → Get CID1
5. Generate/retrieve prize image
6. Upload image to IPFS → Get CID2
7. Create metadata JSON with CID1 and CID2
8. Upload metadata to IPFS → Get CID3
9. Sign voucher with CID3
10. Return signature to frontend
11. Frontend calls claimPrize(signature, CID3, ...)
```

#### 4.2.3 AI Image Service (`aiImageService.ts`)

**Purpose:** Generate unique prize images using OpenAI DALL-E

**Key Functions:**
```typescript
async function generatePrizeImage(params: {
  prizeType: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  seed?: number;
}): Promise<Buffer>
```

**Generation Flow:**
```
1. Determine prize category (toy, electronics, plush, etc.)
2. Build DALL-E prompt based on rarity
3. Call OpenAI API
4. Download generated image
5. Optionally: Apply post-processing (watermark, resize)
6. Upload to IPFS
7. Cache image URL by prizeId
```

**Rarity Modifiers:**
- Common: Simple items, basic colors
- Uncommon: Enhanced details, better composition
- Rare: Complex designs, special effects
- Legendary: Unique, highly detailed, animated concepts

#### 4.2.4 Game Service (`gameService.ts`)

**Purpose:** Validate game physics and detect cheating

**Functions:**
```typescript
function validateGameState(state: GameState): boolean
function calculateDifficulty(replay: ReplayData): number  // 1-10
function detectCheating(replay: ReplayData): CheatReport
```

**Validation Checks:**
- Claw position bounds checking
- Physics simulation replay
- Timestamp sequence validation
- Input rate limiting (detect bot patterns)
- Prize collision detection

### 4.3 API Endpoints

#### Game Routes (`/api/game`)

```
POST /api/game/start
  - Initialize new game session
  - Return: { sessionId, costInTokens }

POST /api/game/verify-win
  - Body: { player, prizeId, replayData }
  - Validate win and generate signature
  - Return: { signature, voucher, metadataUri }

GET /api/game/prizes
  - Return list of available prizes
  - Return: { prizes: Prize[] }
```

#### NFT Routes (`/api/nft`)

```
GET /api/nft/metadata/:cid
  - Fetch metadata from IPFS
  - Return: NFTMetadata

POST /api/nft/generate-image
  - Body: { prizeId, rarity }
  - Generate AI image for prize
  - Return: { imageUrl }
```

---

## 5. Frontend Application Layer

The Next.js application provides the user interface and game experience.

### 5.1 Application Structure

```
client/
├── app/                    # Next.js App Router
│   ├── [locale]/           # Internationalization routes
│   │   ├── page.tsx        # Home page
│   │   ├── game/
│   │   │   └── page.tsx    # Game page
│   │   ├── gallery/
│   │   │   └── page.tsx    # NFT gallery
│   │   └── admin/
│   │       └── page.tsx    # Admin dashboard
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
│
├── components/             # React components
│   ├── game/               # Game-specific UI
│   │   ├── GameCanvas.tsx        # Phaser game container
│   │   ├── GameController.tsx    # Game state & controls
│   │   ├── ClaimPrizeOverlay.tsx # Win modal
│   │   └── PrizeDisplay.tsx      # Prize showcase
│   ├── wallet/             # Web3 wallet components
│   │   ├── WalletConnect.tsx     # Connect button
│   │   ├── TokenBalance.tsx      # Balance display
│   │   └── TokenAcquisition.tsx  # Buy/claim tokens
│   ├── gallery/            # NFT gallery components
│   │   ├── NFTCard.tsx           # Individual NFT display
│   │   └── TransferNFTModal.tsx  # Transfer interface
│   ├── admin/              # Admin panel components
│   │   ├── AdminDashboard.tsx    # Main admin view
│   │   ├── SystemStats.tsx       # Contract statistics
│   │   └── FaucetControls.tsx    # Faucet configuration
│   └── i18n/               # Internationalization
│       └── LanguageSwitcher.tsx  # Language selector
│
├── lib/                    # Utilities and hooks
│   ├── web3/               # Web3 integration
│   │   ├── config.ts             # Wagmi configuration
│   │   ├── hooks.ts              # Custom Web3 hooks
│   │   ├── useGameFlow.ts        # Game interaction flow
│   │   ├── useNFTGallery.ts      # NFT fetching
│   │   └── abis.ts               # Contract ABIs
│   ├── contracts/
│   │   └── addresses.ts          # Auto-generated addresses
│   ├── game/               # Phaser game logic
│   │   ├── scenes/               # Game scenes
│   │   ├── objects/              # Game objects
│   │   └── config.ts             # Phaser config
│   └── i18n/
│       └── LocaleProvider.tsx    # I18n context
│
├── messages/               # Translation files
│   ├── en.json             # English translations
│   └── es.json             # Spanish translations
│
└── public/                 # Static assets
    ├── prizes/             # Prize images
    └── icons/              # UI icons
```

### 5.2 Key Frontend Components

#### 5.2.1 Game Flow Components

**GameController.tsx**
- Manages game session lifecycle
- Handles token approval and payment
- Orchestrates win verification
- Triggers NFT claim process

```typescript
// Simplified flow
const GameController = () => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won'>('idle');
  const { approveTokens, payForGrab } = useGameFlow();

  const startGame = async () => {
    await approveTokens(costPerPlay);
    await payForGrab();
    setGameState('playing');
  };

  const handleWin = async (prizeId: number, replayData: ReplayData) => {
    const voucher = await verifyWin({ prizeId, replayData });
    await claimPrize(voucher);
    setGameState('won');
  };
};
```

**GameCanvas.tsx**
- Phaser 3 game container
- Physics simulation
- Input handling
- Replay recording

**ClaimPrizeOverlay.tsx**
- Win celebration UI
- NFT preview
- Claim button with transaction status
- Gallery link

#### 5.2.2 Wallet Integration

**WalletConnect.tsx**
- Wallet connection UI
- Supports MetaMask, WalletConnect
- Network switching (Sepolia/Polygon)
- Disconnect functionality

```typescript
const WalletConnect = () => {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();

  return isConnected ? (
    <button onClick={() => disconnect()}>
      {address?.slice(0, 6)}...{address?.slice(-4)}
    </button>
  ) : (
    <button onClick={() => connect({ connector: connectors[0] })}>
      Connect Wallet
    </button>
  );
};
```

**TokenAcquisition.tsx**
- Faucet claim interface (testnet)
- Token purchase with ETH
- Cooldown timer display
- Balance updates

#### 5.2.3 NFT Gallery

**useNFTGallery.ts**
- Fetches user's NFTs from PrizeNFT contract
- Loads metadata from IPFS
- Caches images
- Real-time balance updates

```typescript
export function useNFTGallery() {
  const { address } = useAccount();
  const { data: tokenIds } = useReadContract({
    address: PRIZE_NFT_ADDRESS,
    abi: PRIZE_NFT_ABI,
    functionName: 'tokensOfOwner',
    args: [address],
  });

  // Fetch metadata for each token
  const nfts = useQueries({
    queries: tokenIds?.map(tokenId => ({
      queryKey: ['nft-metadata', tokenId],
      queryFn: () => fetchNFTMetadata(tokenId),
    })) ?? [],
  });

  return { nfts, isLoading, refetch };
}
```

**TransferNFTModal.tsx**
- NFT transfer interface
- Address validation
- Transaction status tracking
- Gallery refresh after transfer

#### 5.2.4 Admin Panel

**AdminDashboard.tsx**
- Owner-only access control
- System statistics dashboard
- Contract configuration
- Token management

**SystemStats.tsx**
- Real-time contract metrics:
  - Total TALON supply
  - Token price
  - Game cost
  - Contract balances
  - Network info
- Copy contract addresses
- Info tooltips

**FaucetControls.tsx**
- Configure faucet amount (10-10,000 TALON)
- Set cooldown period (1 min - 30 days)
- Enable/disable faucet
- Live transaction status

### 5.3 Web3 Integration (Wagmi + Viem)

**Configuration (`lib/web3/config.ts`):**
```typescript
import { createConfig, http } from 'wagmi';
import { sepolia, polygonAmoy } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [sepolia, polygonAmoy],
  transports: {
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
  connectors: [
    injected(),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
});
```

**Contract Interaction Pattern:**
```typescript
// Read contract state
const { data: balance } = useReadContract({
  address: GAME_TOKEN_ADDRESS,
  abi: GAME_TOKEN_ABI,
  functionName: 'balanceOf',
  args: [userAddress],
});

// Write to contract
const { writeContract, isPending } = useWriteContract();

const buyTokens = () => {
  writeContract({
    address: GAME_TOKEN_ADDRESS,
    abi: GAME_TOKEN_ABI,
    functionName: 'buyTokens',
    value: parseEther('0.01'), // Send 0.01 ETH
  });
};

// Wait for transaction
const { isLoading, isSuccess } = useWaitForTransactionReceipt({
  hash: txHash
});
```

### 5.4 Internationalization (i18n)

**Architecture:**
- `next-intl` library
- Locale detection from browser
- localStorage persistence
- Namespace-based translations

**Translation Files (`messages/`):**
```json
// en.json
{
  "common": {
    "connectWallet": "Connect Wallet",
    "loading": "Loading..."
  },
  "game": {
    "startGame": "Start Game",
    "grab": "Grab!",
    "congratulations": "CONGRATULATIONS!"
  },
  "admin": {
    "dashboard": "Admin Dashboard",
    "systemStats": "System Statistics"
  }
}
```

**Usage:**
```typescript
'use client';
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('game');
  return <button>{t('startGame')}</button>;
}
```

---

## 6. Data Flow & Interactions

### 6.1 Complete Game Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER ACQUIRES TOKENS                                         │
└─────────────────────────────────────────────────────────────────┘
   Frontend: TokenAcquisition.tsx
   ├─> Option A: Faucet Claim
   │   └─> GameToken.claimFaucet() → Mint 500 TALON
   └─> Option B: Purchase
       └─> GameToken.buyTokens() {value: ETH} → Mint TALON

┌─────────────────────────────────────────────────────────────────┐
│ 2. USER STARTS GAME                                             │
└─────────────────────────────────────────────────────────────────┘
   Frontend: GameController.tsx
   ├─> Check balance (GameToken.balanceOf)
   ├─> Approve tokens (GameToken.approve)
   │   └─> Spender: ClawMachine address
   │   └─> Amount: costPerPlay (e.g., 50 TALON)
   └─> Pay for grab (ClawMachine.payForGrab)
       └─> Transfer tokens from player to ClawMachine
       └─> Increment grabCounts[player]

┌─────────────────────────────────────────────────────────────────┐
│ 3. USER PLAYS GAME                                              │
└─────────────────────────────────────────────────────────────────┘
   Frontend: GameCanvas.tsx (Phaser)
   ├─> Render claw machine scene
   ├─> Handle keyboard input (arrow keys, space)
   ├─> Simulate physics
   ├─> Record all actions with timestamps
   └─> Detect win condition (prize in drop zone)

┌─────────────────────────────────────────────────────────────────┐
│ 4. PLAYER WINS - ORACLE VERIFICATION                            │
└─────────────────────────────────────────────────────────────────┘
   Frontend → Backend: POST /api/game/verify-win
   {
     player: "0x...",
     prizeId: 42,
     replayData: {...}
   }

   Backend: oracleService.verifyWinAndSign()
   ├─> Validate game state (physics, timing)
   ├─> Calculate difficulty (1-10)
   ├─> Generate/retrieve prize image
   ├─> Upload image to IPFS → imageUrl
   ├─> Upload replay data to IPFS → replayHash
   ├─> Create NFT metadata
   ├─> Upload metadata to IPFS → metadataUri
   ├─> Generate nonce (unique ID)
   ├─> Create voucher hash:
   │   keccak256(player, prizeId, metadataUri,
   │             replayHash, difficulty, nonce)
   └─> Sign with oracle private key → signature

   Backend → Frontend: Return
   {
     signature: "0x...",
     voucher: {
       prizeId, metadataUri, replayHash,
       difficulty, nonce
     }
   }

┌─────────────────────────────────────────────────────────────────┐
│ 5. CLAIM NFT PRIZE                                              │
└─────────────────────────────────────────────────────────────────┘
   Frontend: ClaimPrizeOverlay.tsx
   └─> ClawMachine.claimPrize(
         prizeId,
         metadataUri,
         replayHash,
         difficulty,
         nonce,
         signature
       )

   ClawMachine Contract:
   ├─> Verify signature matches oracle
   ├─> Check voucher not used
   ├─> Mark voucher as used
   ├─> Get player's grab count
   ├─> Reset grab count to 0
   └─> Call PrizeNFT.mintPrize(
         player,
         prizeId,
         metadataUri,
         replayHash,
         difficulty,
         grabCount * costPerPlay  // Total tokens spent
       )

   PrizeNFT Contract:
   ├─> Mint NFT to player
   ├─> Store metadata URI
   ├─> Store prize info (difficulty, timestamp, etc.)
   └─> Emit PrizeMinted event

┌─────────────────────────────────────────────────────────────────┐
│ 6. VIEW NFT IN GALLERY                                          │
└─────────────────────────────────────────────────────────────────┘
   Frontend: Gallery page
   ├─> PrizeNFT.tokensOfOwner(player) → [tokenId1, tokenId2, ...]
   ├─> For each tokenId:
   │   ├─> PrizeNFT.tokenURI(tokenId) → metadataUri
   │   └─> Fetch from IPFS → metadata JSON
   └─> Display NFT cards with images and attributes
```

### 6.2 Token Economy Flow

```
ETH → GameToken.buyTokens()
  └─> Mint TALON tokens to player
  └─> ETH stored in GameToken contract
      └─> GameToken.withdraw() → Transfer to owner

TALON tokens → ClawMachine.payForGrab()
  └─> Transfer to ClawMachine contract
  └─> Tokens accumulate (game revenue)
      └─> ClawMachine.withdrawTokens() → Transfer to owner
```

### 6.3 Admin Configuration Flow

```
Admin Dashboard (AdminDashboard.tsx)
  ├─> Check if connected wallet is contract owner
  │   └─> GameToken.owner() === connectedAddress
  │
  ├─> Faucet Controls (FaucetControls.tsx)
  │   ├─> GameToken.setFaucetAmount(newAmount)
  │   ├─> GameToken.setFaucetCooldown(newCooldown)
  │   └─> GameToken.setFaucetEnabled(true/false)
  │
  └─> System Stats (SystemStats.tsx)
      ├─> Read GameToken.totalSupply()
      ├─> Read GameToken.tokenPrice()
      ├─> Read ClawMachine.costPerPlay()
      └─> Read contract balances
```

---

## 7. Component Hierarchy

### 7.1 Page-Level Components

```
app/
├── RootLayout
│   ├── Web3Provider (wagmi)
│   ├── LocaleProvider (i18n)
│   └── {children}
│
├── HomePage (/)
│   ├── LanguageSwitcher
│   ├── WalletConnect
│   ├── TokenBalance
│   ├── HomeContent
│   │   ├── Hero section
│   │   ├── Info cards
│   │   └── CTA buttons
│   └── Footer
│
├── GamePage (/game)
│   ├── LanguageSwitcher
│   ├── GameController
│   │   ├── WalletConnect (if not connected)
│   │   ├── TokenBalance
│   │   ├── ApprovalFlow
│   │   ├── PaymentFlow
│   │   └── GameCanvas (Phaser)
│   └── ClaimPrizeOverlay (conditional)
│
├── GalleryPage (/gallery)
│   ├── LanguageSwitcher
│   ├── WalletConnect
│   ├── NFTCard[] (grid)
│   │   ├── NFT Image
│   │   ├── Metadata display
│   │   └── Transfer button
│   └── TransferNFTModal (conditional)
│
└── AdminPage (/admin)
    ├── LanguageSwitcher
    ├── AdminDashboard
    │   ├── Access control check
    │   ├── SystemStats
    │   │   ├── Supply metrics
    │   │   ├── Pricing info
    │   │   └── Contract addresses
    │   └── FaucetControls
    │       ├── Amount slider
    │       ├── Cooldown config
    │       └── Enable/disable toggle
    └── Footer
```

### 7.2 Shared Component Libraries

**UI Components (`components/ui/`):**
- Button variants (primary, secondary, danger)
- Input fields with validation
- Modal/Dialog wrappers
- Loading spinners
- Toast notifications

**Web3 Components (`components/wallet/`):**
- WalletConnect: Connection button
- TokenBalance: Display TALON balance
- TokenAcquisition: Faucet + Purchase UI
- NetworkSwitcher: Change blockchain network

**Game Components (`components/game/`):**
- GameCanvas: Phaser container
- GameController: State management
- ClaimPrizeOverlay: Win modal
- PrizeDisplay: Prize preview
- Controls: Keyboard/touch input hints

---

## 8. Deployment Architecture

### 8.1 Smart Contract Deployment

**Networks:**
- **Sepolia Testnet** (Ethereum Layer 1 testnet)
  - Lower fees than mainnet
  - Widely supported
  - Free testnet ETH from faucets

- **Polygon Amoy Testnet** (Polygon Layer 2 testnet)
  - Faster transactions
  - Lower gas costs
  - Good for high-frequency games

**Deployment Process:**

```bash
# 1. Configure environment
cd common
cp .env.example .env
# Edit .env with PRIVATE_KEY and RPC_URL

# 2. Compile contracts
npx hardhat compile

# 3. Deploy to Sepolia
npm run deploy:sepolia

# Deployment script flow:
# - Deploy GameToken(initialSupply, tokenPrice)
# - Deploy PrizeNFT()
# - Deploy ClawMachine(gameToken, prizeNFT, oracle, cost)
# - Grant MINTER_ROLE to ClawMachine
# - Save addresses to deployments/sepolia/*.json
# - Update client/lib/contracts/addresses.ts

# 4. Verify on Etherscan
npm run verify:sepolia
```

**Deployment Artifacts:**
```
common/deployments/
├── sepolia/
│   ├── GameToken.json
│   ├── PrizeNFT.json
│   └── ClawMachine.json
└── polygonAmoy/
    ├── GameToken.json
    ├── PrizeNFT.json
    └── ClawMachine.json
```

**Address Sync System:**
- Addresses auto-extracted from deployment JSON
- Written to `client/lib/contracts/addresses.ts`
- Frontend imports from this single source of truth
- No manual copy-paste needed

### 8.2 Backend Deployment

**Environment:**
- Node.js server (Express)
- Deployed on: Vercel, Railway, or VPS
- Requires: Pinata API key, OpenAI API key, Oracle private key

**Environment Variables:**
```bash
# .env
ORACLE_PRIVATE_KEY=0x...        # Ethereum private key
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
OPENAI_API_KEY=...
RPC_URL=https://sepolia.infura.io/v3/...
GAME_TOKEN_ADDRESS=0x...
CLAW_MACHINE_ADDRESS=0x...
PRIZE_NFT_ADDRESS=0x...
```

**Build & Deploy:**
```bash
cd server
npm install
npm run build
npm start  # Production mode
```

### 8.3 Frontend Deployment

**Platform:** Vercel (recommended for Next.js)

**Environment Variables:**
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_BACKEND_URL=https://api.tokentalon.com
NEXT_PUBLIC_SEPOLIA_RPC_URL=...
NEXT_PUBLIC_AMOY_RPC_URL=...
```

**Build Process:**
```bash
cd client
npm install
npm run build  # Creates optimized production build
npm start      # Serves production build
```

**Vercel Deployment:**
1. Connect GitHub repository
2. Set root directory to `client/`
3. Configure environment variables
4. Auto-deploy on push to main branch

### 8.4 IPFS / Pinata Setup

**Purpose:**
- Store NFT metadata JSON
- Store NFT images
- Store replay data

**Configuration:**
1. Create Pinata account
2. Generate API keys (JWT)
3. Configure in backend `.env`
4. Use SDK to pin files

**Pinning Strategy:**
- Metadata: Permanent pin (required for NFT)
- Images: Permanent pin (required for NFT)
- Replay data: Permanent pin (user may want to view)

**Access:**
- Public gateway: `https://gateway.pinata.cloud/ipfs/{CID}`
- Dedicated gateway (paid plan): Custom domain

---

## 9. Key Design Patterns

### 9.1 Oracle Pattern (Off-Chain Validation)

**Problem:** Blockchain can't run complex game physics or detect cheating.

**Solution:** Backend "oracle" validates game outcomes and signs vouchers.

**Implementation:**
```
Frontend → Backend: "I won! Here's my replay data"
Backend: Verify physics, check for cheating
Backend: Sign voucher if valid
Frontend → Blockchain: Submit voucher + signature
Blockchain: Verify signature matches trusted oracle
Blockchain: Mint NFT if valid
```

**Security:**
- Oracle private key never exposed to client
- Voucher includes nonce (prevents replay)
- Signature binds specific player to specific win
- Used vouchers tracked on-chain

### 9.2 Role-Based Access Control (RBAC)

**Contracts:**
- GameToken: Ownable (single admin)
- PrizeNFT: AccessControl (roles: DEFAULT_ADMIN_ROLE, MINTER_ROLE)
- ClawMachine: Ownable

**Separation:**
- Owner: Deploy, configure, withdraw revenue
- Minter: Only ClawMachine can mint NFTs
- Player: Can play, claim prizes, transfer NFTs

### 9.3 Immutable Contract References

**Pattern:**
```solidity
contract ClawMachine {
    GameToken public immutable gameToken;
    PrizeNFT public immutable prizeNFT;

    constructor(address _gameToken, address _prizeNFT) {
        gameToken = GameToken(_gameToken);
        prizeNFT = PrizeNFT(_prizeNFT);
    }
}
```

**Benefit:**
- Contract dependencies can't be changed after deployment
- Gas savings (immutable variables)
- Security: No risk of admin changing contracts maliciously

### 9.4 Voucher-Based Claiming

**Pattern:**
1. Off-chain system validates action
2. Signs a "voucher" authorizing on-chain action
3. User submits voucher + signature
4. Contract verifies signature and executes

**Advantages:**
- Move complex logic off-chain (save gas)
- Prevent spam (only valid actions get vouchers)
- Maintain security (signatures cryptographically verified)

### 9.5 Event-Driven Architecture

**Smart Contracts emit events:**
```solidity
event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
event GrabAttempt(address indexed player, uint256 grabNumber, uint256 tokensPaid);
event PrizeClaimed(address indexed player, uint256 indexed tokenId, uint256 prizeId);
```

**Frontend listens:**
```typescript
const { data: events } = useContractEvent({
  address: GAME_TOKEN_ADDRESS,
  abi: GAME_TOKEN_ABI,
  eventName: 'TokensPurchased',
  onLogs(logs) {
    console.log('Tokens purchased:', logs);
    refetchBalance();
  },
});
```

**Benefits:**
- Real-time UI updates
- Transaction tracking
- Analytics and logging

### 9.6 Separation of Concerns

**Three-Tier Separation:**

| Layer | Concern | Why |
|-------|---------|-----|
| Smart Contracts | State, ownership, token transfers | Trustless, immutable |
| Backend | Complex logic, external APIs, signing | Flexible, upgradeable |
| Frontend | UI, user input, display | Fast iteration, UX |

**Example - NFT Metadata:**
- Frontend: Display image and attributes
- Backend: Generate image, create JSON, upload to IPFS
- Contract: Store IPFS CID, verify ownership

---

## 10. Security Considerations

### 10.1 Smart Contract Security

**Implemented Protections:**

1. **Reentrancy Protection**
   - Use OpenZeppelin's battle-tested contracts
   - Checks-Effects-Interactions pattern
   - No external calls before state updates

2. **Access Control**
   - Ownable for single admin functions
   - AccessControl for role-based permissions
   - onlyOwner, onlyRole modifiers

3. **Input Validation**
   ```solidity
   require(newAmount > 0, "Amount must be positive");
   require(newCooldown >= MIN_COOLDOWN, "Cooldown too short");
   require(signature.length == 65, "Invalid signature");
   ```

4. **Integer Overflow Protection**
   - Solidity 0.8.20+ has built-in checks
   - Still use SafeMath patterns where appropriate

5. **Voucher Replay Protection**
   ```solidity
   mapping(bytes32 => bool) public usedVouchers;
   require(!usedVouchers[voucherHash], "Voucher already used");
   usedVouchers[voucherHash] = true;
   ```

6. **Supply Caps**
   ```solidity
   uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18;
   require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max");
   ```

### 10.2 Oracle Security

**Threats:**
- Oracle private key compromise
- Man-in-the-middle attacks
- Signature forgery

**Mitigations:**
- Private key stored securely (env var, never committed)
- HTTPS for API communication
- Nonce in vouchers (prevents replay)
- Server-side game state validation
- Rate limiting on signature endpoints

**Oracle Key Management:**
```bash
# Generate new oracle keypair
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Store in .env (never commit!)
ORACLE_PRIVATE_KEY=0x...

# Register in contract
await clawMachine.setOracleAddress(oracleAddress);
```

### 10.3 Frontend Security

**Implemented:**

1. **Input Validation**
   - Address format checking (viem's `isAddress()`)
   - Amount bounds checking
   - Prevent self-transfer of NFTs

2. **Transaction Verification**
   ```typescript
   const { isLoading, isSuccess, error } = useWaitForTransactionReceipt({
     hash: txHash,
   });

   if (error) {
     alert('Transaction failed: ' + error.message);
   }
   ```

3. **State Management**
   - Prevent duplicate transactions
   - Disable buttons during pending transactions
   - Clear sensitive data after use

4. **Wallet Security**
   - Never request private keys
   - Use standard wallet connectors (wagmi)
   - Show transaction details before signing
   - Warn users on network mismatch

### 10.4 API Security

**Backend Protections:**

1. **Rate Limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // Limit each IP to 100 requests per window
   });

   app.use('/api/', limiter);
   ```

2. **CORS Configuration**
   ```typescript
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true,
   }));
   ```

3. **Input Sanitization**
   - Validate all inputs
   - Prevent injection attacks
   - Use TypeScript types

4. **API Key Security**
   - Pinata/OpenAI keys in env vars
   - Never expose in client code
   - Rotate keys periodically

### 10.5 Game Integrity

**Cheating Prevention:**

1. **Server-Side Validation**
   - Replay entire game physics on backend
   - Verify all movements were valid
   - Check collision detection
   - Validate timestamps

2. **Bot Detection**
   - Analyze input patterns
   - Flag suspiciously perfect plays
   - Rate limit play frequency

3. **Difficulty Scoring**
   - Track attempts before win
   - Penalize suspiciously easy wins
   - Reward genuine skill

4. **Replay Data Immutability**
   - Stored on IPFS (content-addressed)
   - Hash included in NFT
   - Tampering would change hash

### 10.6 Audit Checklist

**Pre-Deployment:**
- [ ] Smart contracts reviewed and tested
- [ ] Test coverage >90%
- [ ] No hardcoded private keys
- [ ] All env vars documented
- [ ] Access control tested
- [ ] Oracle signature verification tested
- [ ] IPFS uploads functional
- [ ] Frontend validation in place
- [ ] Transaction error handling
- [ ] Gas optimization review

**Post-Deployment:**
- [ ] Contract verification on Etherscan
- [ ] Test faucet functionality
- [ ] Test token purchase
- [ ] Test full game flow
- [ ] Test NFT minting
- [ ] Test NFT transfer
- [ ] Test admin functions
- [ ] Monitor for suspicious activity

---

## 11. File Structure Reference

### 11.1 Complete Project Structure

```
tokentalon/
├── client/                          # Frontend (Next.js)
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── page.tsx            # Home page
│   │   │   ├── layout.tsx          # Locale layout
│   │   │   ├── game/
│   │   │   │   └── page.tsx        # Game page
│   │   │   ├── gallery/
│   │   │   │   └── page.tsx        # NFT gallery
│   │   │   └── admin/
│   │   │       └── page.tsx        # Admin dashboard
│   │   ├── layout.tsx              # Root layout
│   │   ├── globals.css             # Global styles
│   │   └── HomeContent.tsx         # Home content component
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminLoading.tsx
│   │   │   ├── FaucetControls.tsx
│   │   │   └── SystemStats.tsx
│   │   ├── game/
│   │   │   ├── ClaimPrizeOverlay.tsx
│   │   │   ├── GameCanvas.tsx
│   │   │   ├── GameController.tsx
│   │   │   └── PrizeDisplay.tsx
│   │   ├── gallery/
│   │   │   ├── NFTCard.tsx
│   │   │   └── TransferNFTModal.tsx
│   │   ├── wallet/
│   │   │   ├── TokenAcquisition.tsx
│   │   │   ├── TokenBalance.tsx
│   │   │   └── WalletConnect.tsx
│   │   ├── i18n/
│   │   │   └── LanguageSwitcher.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── contracts/
│   │   │   └── addresses.ts        # Auto-generated contract addresses
│   │   ├── game/
│   │   │   ├── config.ts           # Phaser config
│   │   │   ├── scenes/             # Game scenes
│   │   │   └── objects/            # Game objects
│   │   ├── web3/
│   │   │   ├── abis.ts             # Contract ABIs
│   │   │   ├── config.ts           # Wagmi config
│   │   │   ├── hooks.ts            # Custom hooks
│   │   │   ├── provider.tsx        # Web3 provider
│   │   │   ├── useGameFlow.ts      # Game flow hook
│   │   │   └── useNFTGallery.ts    # NFT gallery hook
│   │   └── i18n/
│   │       └── LocaleProvider.tsx
│   │
│   ├── messages/
│   │   ├── en.json                 # English translations
│   │   └── es.json                 # Spanish translations
│   │
│   ├── public/
│   │   ├── prizes/                 # Prize images
│   │   └── icons/                  # UI icons
│   │
│   ├── .env.local                  # Environment variables
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
├── server/                          # Backend (Node.js)
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts              # Environment config
│   │   ├── routes/
│   │   │   ├── gameRoutes.ts       # Game endpoints
│   │   │   └── nftRoutes.ts        # NFT endpoints
│   │   ├── services/
│   │   │   ├── aiImageService.ts   # OpenAI integration
│   │   │   ├── gameService.ts      # Game validation
│   │   │   ├── ipfsService.ts      # Pinata integration
│   │   │   └── oracleService.ts    # Win verification
│   │   ├── utils/
│   │   │   └── web3.ts             # Ethers.js utilities
│   │   └── index.ts                # Express app entry
│   │
│   ├── .env                        # Environment variables
│   ├── package.json
│   └── tsconfig.json
│
├── common/                          # Smart Contracts
│   ├── contracts/
│   │   ├── ClawMachine.sol         # Game orchestrator
│   │   ├── GameToken.sol           # ERC-20 token
│   │   └── PrizeNFT.sol            # ERC-721 NFT
│   │
│   ├── scripts/
│   │   ├── deploy.ts               # Deployment script
│   │   └── verify.ts               # Etherscan verification
│   │
│   ├── test/
│   │   ├── ClawMachine.test.ts
│   │   ├── GameToken.test.ts
│   │   └── PrizeNFT.test.ts
│   │
│   ├── deployments/
│   │   ├── sepolia/                # Sepolia addresses
│   │   │   ├── GameToken.json
│   │   │   ├── PrizeNFT.json
│   │   │   └── ClawMachine.json
│   │   └── polygonAmoy/            # Polygon addresses
│   │       └── ...
│   │
│   ├── .env                        # Deployment config
│   ├── hardhat.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
├── package.json                     # Root package
├── README.md
├── SYSTEM_ARCHITECTURE.md          # This document
├── ADMIN_FUNCTIONS_SPEC.md
├── ADDRESS_MANAGEMENT.md
├── BLOCKCHAIN_PLAN.md
├── CUSTOM_TRAITS_SYSTEM.md
├── DESIGN_DECISIONS.md
└── ...
```

### 11.2 Key Configuration Files

**Frontend Config (`client/next.config.ts`):**
```typescript
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['gateway.pinata.cloud'],
  },
};
```

**Hardhat Config (`common/hardhat.config.ts`):**
```typescript
const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    polygonAmoy: {
      url: process.env.AMOY_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
```

**Wagmi Config (`client/lib/web3/config.ts`):**
```typescript
export const wagmiConfig = createConfig({
  chains: [sepolia, polygonAmoy],
  transports: {
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
  connectors: [
    injected(),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
});
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **ERC-20** | Fungible token standard (TALON tokens) |
| **ERC-721** | Non-fungible token standard (Prize NFTs) |
| **IPFS** | InterPlanetary File System - decentralized storage |
| **CID** | Content Identifier - unique IPFS file hash |
| **Oracle** | Off-chain service that provides data to blockchain |
| **Voucher** | Signed message authorizing an action |
| **Nonce** | Number used once (prevents replay attacks) |
| **Wagmi** | React Hooks library for Ethereum |
| **Viem** | TypeScript library for Ethereum interactions |
| **Phaser** | HTML5 game framework |
| **Next.js** | React framework with SSR/SSG |
| **Hardhat** | Ethereum development environment |
| **Sepolia** | Ethereum testnet |
| **Polygon Amoy** | Polygon testnet (Layer 2) |

---

## Appendix B: Common Operations

### B.1 Deploy New Contracts

```bash
cd common
npm run deploy:sepolia
# Contracts deployed, addresses auto-synced to frontend
```

### B.2 Update Faucet Settings

```typescript
// Via Admin Dashboard UI
// Or directly via contract:
await gameToken.setFaucetAmount(parseEther("1000")); // 1000 TALON
await gameToken.setFaucetCooldown(600); // 10 minutes
await gameToken.setFaucetEnabled(true);
```

### B.3 Grant Minter Role

```typescript
await prizeNFT.grantMinterRole(clawMachineAddress);
```

### B.4 Change Oracle Address

```typescript
await clawMachine.setOracleAddress(newOracleAddress);
```

### B.5 Withdraw Revenue

```typescript
// Withdraw ETH from token sales
await gameToken.withdraw();

// Withdraw TALON from game plays
await clawMachine.withdrawTokens();
```

---

## Appendix C: Troubleshooting

### C.1 Frontend Issues

**Problem:** Wallet not connecting
**Solution:** Check WalletConnect project ID, ensure correct network selected

**Problem:** Transactions failing
**Solution:** Check gas limits, verify contract addresses, ensure sufficient balance

**Problem:** NFTs not loading
**Solution:** Check IPFS gateway accessibility, verify metadata URLs

### C.2 Contract Issues

**Problem:** Faucet claim failing
**Solution:** Check cooldown timer, verify faucet is enabled, check supply cap

**Problem:** Can't claim prize
**Solution:** Verify oracle signature, check voucher not already used, ensure grab count > 0

**Problem:** NFT mint failing
**Solution:** Verify MINTER_ROLE granted to ClawMachine, check metadata URI format

### C.3 Backend Issues

**Problem:** Oracle signature invalid
**Solution:** Verify oracle address matches contract, check private key format

**Problem:** IPFS upload failing
**Solution:** Check Pinata API keys, verify file size limits

**Problem:** AI image generation failing
**Solution:** Check OpenAI API key, verify prompt format, check rate limits

---

**End of Document**

For questions or updates, please refer to the project repository or contact the development team.
