# TokenTalon - Blockchain Implementation Execution Plan

## Current Status
✅ Game play mechanics are functional  
✅ Phaser game engine integrated  
✅ Visual assets and cabinet display working  
🔄 **Next Phase: Blockchain Integration**

---

## Blockchain Architecture Overview

### Technology Stack
- **Blockchain**: Polygon (Mainnet) / Sepolia (Testnet for development)
- **Smart Contracts**: Solidity
- **Web3 Libraries**: ethers.js v6, wagmi
- **Storage**: IPFS via Pinata
- **Backend**: Node.js + Express/Fastify
- **Frontend**: Next.js (React + TypeScript)

### Smart Contract Architecture
```
┌─────────────────┐
│  GameToken.sol  │ (ERC-20) - Play currency
└────────┬────────┘
         │
┌────────▼────────┐
│ClawMachine.sol  │ - Game logic & orchestration
└────────┬────────┘
         │
┌────────▼────────┐
│  PrizeNFT.sol   │ (ERC-721) - Prize NFTs with metadata
└─────────────────┘
```

---

## Phase 1: Smart Contract Development (Weeks 1-2)

### 1.1 GameToken Contract (ERC-20)
**Purpose**: In-game currency for playing the claw machine

**Key Functions**:
- `mint(address to, uint256 amount)` - Admin function for token distribution
- `approve(address spender, uint256 amount)` - Standard ERC-20 approval
- Standard transfer functions

**Initial Supply**: 1,000,000 tokens
**Decimals**: 18

**Implementation Steps**:
1. Create `contracts/GameToken.sol` using OpenZeppelin ERC-20
2. Add minting capability (only owner)
3. Write unit tests (Hardhat/Foundry)
4. Deploy to Sepolia testnet

### 1.2 PrizeNFT Contract (ERC-721)
**Purpose**: Represents won prizes with replay data

**Key Functions**:
- `mintPrize(address winner, uint256 prizeId, string memory metadataURI)` - Restricted to ClawMachine contract
- `tokenURI(uint256 tokenId)` - Returns IPFS metadata URI
- `getReplayData(uint256 tokenId)` - Returns replay data hash

**Metadata Schema**:
```json
{
  "name": "Golden Fox #402",
  "description": "Won on TokenTalon",
  "image": "ipfs://<image_hash>",
  "attributes": [
    {"trait_type": "Type", "value": "Fox"},
    {"trait_type": "Rarity", "value": "Legendary"},
    {"trait_type": "Difficulty", "value": 7},
    {"trait_type": "Tokens Spent", "value": 15},
    {"trait_type": "Timestamp", "value": 1700000000}
  ],
  "replay_data": "ipfs://<replay_json_hash>"
}
```

**Implementation Steps**:
1. Create `contracts/PrizeNFT.sol` extending ERC-721URIStorage
2. Add minter role (only ClawMachine)
3. Implement metadata management
4. Write tests for minting scenarios
5. Deploy to testnet

### 1.3 ClawMachine Contract (Core Game Logic)
**Purpose**: Orchestrates gameplay, token escrow, and prize distribution

**Key State Variables**:
```solidity
uint256 public costPerPlay;           // Tokens required per game
address public gameToken;             // GameToken contract address
address public prizeNFT;              // PrizeNFT contract address
address public oracleAddress;         // Backend verifier
mapping(bytes32 => bool) public usedVouchers;  // Prevent replay attacks
```

**Key Functions**:
- `startGame()` - Player initiates game, transfers tokens
- `claimPrize(bytes32 voucherHash, bytes memory signature, ...)` - Verify backend signature and mint NFT
- `setCostPerPlay(uint256 newCost)` - Admin function
- `withdrawFunds()` - Owner withdraws accumulated tokens

**Oracle Pattern for Security**:
```
1. Player plays game (off-chain in Phaser)
2. Backend validates win deterministically
3. Backend creates voucher: hash(playerAddress, prizeId, timestamp, nonce)
4. Backend signs voucher with private key
5. Frontend calls claimPrize() with voucher + signature
6. Contract verifies signature matches oracleAddress
7. Contract checks voucher hasn't been used
8. Contract mints NFT to player
```

**Implementation Steps**:
1. Create `contracts/ClawMachine.sol`
2. Implement token escrow logic
3. Implement signature verification (ECDSA)
4. Add voucher tracking to prevent double-claims
5. Write comprehensive tests (happy path + attack scenarios)
6. Deploy to testnet

**Testing Scenarios**:
- ✅ Valid win claim with correct signature
- ❌ Replay attack (reuse same voucher)
- ❌ Invalid signature
- ❌ Insufficient token approval
- ❌ Wrong oracle address

---

## Phase 2: Backend Integration (Weeks 2-3)

### 2.1 Node.js Backend Service

**File Structure**:
```
server/
├── src/
│   ├── config/
│   │   └── blockchain.ts        # Contract ABIs, addresses
│   ├── services/
│   │   ├── gameService.ts       # Game session management
│   │   ├── ipfsService.ts       # IPFS uploads (Pinata)
│   │   └── oracleService.ts     # Signature generation
│   ├── routes/
│   │   ├── gameRoutes.ts        # Game endpoints
│   │   └── nftRoutes.ts         # NFT metadata endpoints
│   └── index.ts
```

### 2.2 Key Backend Endpoints

**POST /api/game/start**
- Validates wallet connection
- Creates game session
- Returns session ID

**POST /api/game/submit-win**
```typescript
Request: {
  sessionId: string,
  replayData: ClawReplayData,  // Physics recording
  prizeId: number,
  walletAddress: string
}

Response: {
  voucher: string,              // Hash for blockchain
  signature: string,            // Backend's signature
  metadataUri: string,          // IPFS URI for NFT metadata
  transactionData: {            // Pre-built tx for frontend
    to: CONTRACT_ADDRESS,
    data: encodedFunctionCall
  }
}
```

**Workflow**:
1. Validate replay data deterministically (re-run physics)
2. Upload prize image to IPFS (if not cached)
3. Create and upload metadata JSON to IPFS
4. Generate voucher hash
5. Sign voucher with oracle private key
6. Store session in database (prevent double claims)
7. Return signed voucher to frontend

**GET /api/nft/:tokenId/metadata**
- Serves NFT metadata (OpenSea compatibility)
- Returns JSON from IPFS or database cache

**GET /api/nft/:tokenId/replay**
- Returns replay data for visualization
- Can be called by anyone to view win replays

### 2.3 IPFS Integration (Pinata)

**Setup**:
```typescript
import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY
});
```

**Upload Flow**:
```typescript
async function uploadPrizeMetadata(prizeData: PrizeData) {
  // 1. Upload image (if not already uploaded)
  const imageHash = await pinata.upload.file(prizeImage);
  
  // 2. Upload replay data JSON
  const replayHash = await pinata.upload.json(replayData);
  
  // 3. Create metadata JSON
  const metadata = {
    name: `${prizeData.name} #${tokenId}`,
    image: `ipfs://${imageHash}`,
    replay_data: `ipfs://${replayHash}`,
    attributes: [...]
  };
  
  // 4. Upload metadata
  const metadataHash = await pinata.upload.json(metadata);
  
  return `ipfs://${metadataHash}`;
}
```

### 2.4 Oracle Security Implementation

**Private Key Management**:
- Store oracle private key in environment variable
- Use secure key management (AWS Secrets Manager, HashiCorp Vault in production)
- Never expose private key to frontend

**Signature Generation**:
```typescript
import { ethers } from 'ethers';

async function createWinVoucher(
  playerAddress: string,
  prizeId: number,
  metadataUri: string
): Promise<{voucher: string, signature: string}> {
  const nonce = Date.now();
  
  // Create voucher hash
  const voucher = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'string', 'uint256'],
    [playerAddress, prizeId, metadataUri, nonce]
  );
  
  // Sign with oracle private key
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY);
  const signature = await wallet.signMessage(ethers.getBytes(voucher));
  
  return { voucher, signature };
}
```

---

## Phase 3: Frontend Web3 Integration (Week 3-4)

### 3.1 Wallet Connection

**Install Dependencies**:
```bash
npm install wagmi viem @tanstack/react-query
npm install @rainbow-me/rainbowkit  # Optional: Beautiful wallet UI
```

**Setup Wagmi Config**:
```typescript
// lib/web3/config.ts
import { createConfig, http } from 'wagmi';
import { sepolia, polygon } from 'wagmi/chains';

export const config = createConfig({
  chains: [sepolia, polygon],
  transports: {
    [sepolia.id]: http(),
    [polygon.id]: http(),
  },
});
```

**Wallet Connect Component**:
```typescript
// components/wallet/ConnectButton.tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div>
        <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button key={connector.id} onClick={() => connect({ connector })}>
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
```

### 3.2 Token Approval Flow

**Before Playing**:
```typescript
// lib/web3/gameToken.ts
import { useWriteContract, useReadContract } from 'wagmi';
import { parseEther } from 'viem';

export function useApproveTokens() {
  const { writeContract } = useWriteContract();
  
  async function approveForGame(amount: number) {
    await writeContract({
      address: GAME_TOKEN_ADDRESS,
      abi: GameTokenABI,
      functionName: 'approve',
      args: [CLAW_MACHINE_ADDRESS, parseEther(amount.toString())]
    });
  }
  
  return { approveForGame };
}

// Check current allowance
export function useTokenAllowance(owner: string) {
  const { data } = useReadContract({
    address: GAME_TOKEN_ADDRESS,
    abi: GameTokenABI,
    functionName: 'allowance',
    args: [owner, CLAW_MACHINE_ADDRESS]
  });
  
  return data;
}
```

### 3.3 Start Game Transaction

```typescript
// lib/web3/clawMachine.ts
export function useStartGame() {
  const { writeContract } = useWriteContract();
  
  async function startGame() {
    const tx = await writeContract({
      address: CLAW_MACHINE_ADDRESS,
      abi: ClawMachineABI,
      functionName: 'startGame',
    });
    
    // Wait for confirmation
    await tx.wait();
    
    return tx.hash;
  }
  
  return { startGame };
}
```

### 3.4 Claim Prize (Mint NFT)

```typescript
export function useClaimPrize() {
  const { writeContract } = useWriteContract();
  
  async function claimPrize(
    voucher: string,
    signature: string,
    prizeId: number,
    metadataUri: string
  ) {
    const tx = await writeContract({
      address: CLAW_MACHINE_ADDRESS,
      abi: ClawMachineABI,
      functionName: 'claimPrize',
      args: [voucher, signature, prizeId, metadataUri]
    });
    
    await tx.wait();
    return tx.hash;
  }
  
  return { claimPrize };
}
```

### 3.5 Game Flow Integration

**Complete Flow in Game Component**:
```typescript
// app/game/page.tsx
export default function GamePage() {
  const { address } = useAccount();
  const { approveForGame } = useApproveTokens();
  const { startGame } = useStartGame();
  const { claimPrize } = useClaimPrize();
  
  async function handlePlayGame() {
    // 1. Ensure wallet connected
    if (!address) {
      toast.error("Connect wallet first");
      return;
    }
    
    // 2. Check/request token approval
    const allowance = await checkAllowance(address);
    if (allowance < COST_PER_PLAY) {
      await approveForGame(COST_PER_PLAY);
    }
    
    // 3. Start game on blockchain
    const txHash = await startGame();
    
    // 4. Start Phaser game
    startPhaserGame();
  }
  
  async function handleWin(replayData: ReplayData, prizeId: number) {
    // 1. Submit win to backend
    const response = await fetch('/api/game/submit-win', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress: address,
        replayData,
        prizeId
      })
    });
    
    const { voucher, signature, metadataUri } = await response.json();
    
    // 2. Claim prize on blockchain
    await claimPrize(voucher, signature, prizeId, metadataUri);
    
    // 3. Show success + view NFT
    toast.success("Prize claimed! View in your gallery");
  }
  
  return (
    <div>
      <ConnectButton />
      <PhaserGame onWin={handleWin} />
    </div>
  );
}
```

### 3.6 NFT Gallery

```typescript
// components/gallery/NFTGallery.tsx
export function NFTGallery() {
  const { address } = useAccount();
  const { data: nfts } = useReadContract({
    address: PRIZE_NFT_ADDRESS,
    abi: PrizeNFTABI,
    functionName: 'balanceOf',
    args: [address]
  });
  
  // Fetch metadata for each NFT
  const [nftMetadata, setNftMetadata] = useState([]);
  
  useEffect(() => {
    async function loadNFTs() {
      const metadata = await Promise.all(
        nfts.map(async (tokenId) => {
          const uri = await fetchTokenURI(tokenId);
          const data = await fetch(uri).then(r => r.json());
          return { tokenId, ...data };
        })
      );
      setNftMetadata(metadata);
    }
    
    if (nfts) loadNFTs();
  }, [nfts]);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {nftMetadata.map((nft) => (
        <NFTCard key={nft.tokenId} nft={nft} />
      ))}
    </div>
  );
}
```

---

## Phase 4: Testing & Deployment (Week 4-5)

### 4.1 Smart Contract Testing

**Test Coverage**:
```
contracts/test/
├── GameToken.test.ts
├── PrizeNFT.test.ts
└── ClawMachine.test.ts
```

**Key Test Scenarios**:
```typescript
describe("ClawMachine", () => {
  it("should start game when tokens approved");
  it("should revert when insufficient approval");
  it("should mint NFT with valid voucher");
  it("should revert on signature replay attack");
  it("should revert with invalid oracle signature");
  it("should emit GameStarted event");
  it("should emit PrizeClaimed event");
});
```

**Run Tests**:
```bash
cd server
npx hardhat test
npx hardhat coverage  # Aim for >90% coverage
```

### 4.2 Testnet Deployment

**Deployment Script**:
```typescript
// scripts/deploy.ts
async function main() {
  // 1. Deploy GameToken
  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy();
  await gameToken.deployed();
  
  // 2. Deploy PrizeNFT
  const PrizeNFT = await ethers.getContractFactory("PrizeNFT");
  const prizeNFT = await PrizeNFT.deploy();
  
  // 3. Deploy ClawMachine
  const ClawMachine = await ethers.getContractFactory("ClawMachine");
  const clawMachine = await ClawMachine.deploy(
    gameToken.address,
    prizeNFT.address,
    ORACLE_ADDRESS,
    COST_PER_PLAY
  );
  
  // 4. Grant minter role to ClawMachine
  await prizeNFT.grantMinterRole(clawMachine.address);
  
  console.log("Deployed:", {
    gameToken: gameToken.address,
    prizeNFT: prizeNFT.address,
    clawMachine: clawMachine.address
  });
}
```

**Deploy**:
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

**Verify on Etherscan**:
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 4.3 Integration Testing

**End-to-End Test Flow**:
1. Connect wallet (testnet)
2. Request test tokens from faucet
3. Approve tokens for ClawMachine
4. Start game
5. Play and win (mock deterministic win)
6. Verify backend creates voucher
7. Claim prize
8. Verify NFT appears in wallet
9. View metadata on IPFS gateway
10. Check NFT in OpenSea testnet

### 4.4 Mainnet Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing
- [ ] Security audit (consider CertiK, OpenZeppelin, or community review)
- [ ] Gas optimization review
- [ ] Frontend tested on testnet
- [ ] Backend oracle secure and monitored
- [ ] IPFS pinning service configured
- [ ] Domain and hosting ready

**Deployment**:
- [ ] Deploy contracts to Polygon mainnet
- [ ] Verify contracts on Polygonscan
- [ ] Update frontend with mainnet addresses
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Set up monitoring (Tenderly, Defender)

---

## Phase 5: Advanced Features (Post-MVP)

### 5.1 Prize Marketplace
- Allow players to list NFTs for sale
- Implement royalty system (creator gets % on resales)
- Build bidding/auction functionality

### 5.2 Leaderboard & Achievements
- Track hardest prizes won
- Issue achievement NFT badges
- Seasonal competitions

### 5.3 Token Economics Improvements
- Staking rewards (stake tokens, earn plays)
- Referral bonuses
- Dynamic pricing based on prize rarity

### 5.4 Social Features
- Share replay on social media
- Compete with friends
- Guild/team competitions

### 5.5 Advanced NFT features
- Advanced NFT customization per prize (e.g. each prize can have its own set of attributes w/ associated values. Something like 'eyewear: sunglasses')
- AI driven image rendering for custom NFTs
- Limited Edition Prize 'sets'. E.g. the set of F1 driver plushies for 2025, or theme sets such as Disney, Pixar, etc.

---

## Security Considerations

### Smart Contract Security
1. **Reentrancy Protection**: Use OpenZeppelin's ReentrancyGuard
2. **Access Control**: Role-based permissions
3. **Integer Overflow**: Use Solidity 0.8+ (built-in checks)
4. **Signature Replay**: Track used vouchers
5. **Oracle Centralization**: Consider decentralized oracle later

### Backend Security
1. **Private Key Storage**: Environment variables, never commit
2. **Rate Limiting**: Prevent spam API calls
3. **Input Validation**: Validate all replay data
4. **CORS**: Restrict to frontend domain

### Frontend Security
1. **Never Store Private Keys**: Use wallet providers
2. **Transaction Simulation**: Show estimated gas before confirming
3. **Error Handling**: Graceful failures with user-friendly messages

---

## Monitoring & Analytics

### Contract Events
```solidity
event GameStarted(address indexed player, uint256 timestamp);
event PrizeClaimed(address indexed player, uint256 tokenId, uint256 prizeId);
event TokensWithdrawn(address indexed owner, uint256 amount);
```

### Metrics to Track
- Games played per day
- Games played per player, viewable by date range
- Win rate
- Average tokens spent per win
- Most popular prizes
- Gas costs per transaction
- NFT trading volume

### Tools
- **The Graph**: Index blockchain events
- **Tenderly**: Monitor transactions and alerts
- **Dune Analytics**: Create public dashboards

---

## Estimated Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Smart Contracts | 2 weeks | 3 contracts deployed to testnet |
| Phase 2: Backend | 1 week | API + Oracle service functional |
| Phase 3: Frontend Web3 | 1.5 weeks | Wallet connection + full game loop |
| Phase 4: Testing & Deploy | 1.5 weeks | Mainnet deployment |
| **Total MVP** | **6 weeks** | Fully functional TokenTalon |

---

## Immediate Next Steps (This Week)

### Day 1-2: Smart Contract Setup
- [ ] Initialize Hardhat project in `/server/contracts`
- [ ] Install OpenZeppelin contracts
- [ ] Create GameToken.sol (basic ERC-20)
- [ ] Write initial tests

### Day 3-4: PrizeNFT Contract
- [ ] Create PrizeNFT.sol (ERC-721)
- [ ] Implement metadata management
- [ ] Write minting tests

### Day 5-7: ClawMachine Contract
- [ ] Create ClawMachine.sol
- [ ] Implement oracle signature verification
- [ ] Write comprehensive tests
- [ ] Deploy all contracts to Sepolia testnet

### Week 2: Backend Service
- [ ] Set up Node.js server structure
- [ ] Implement IPFS integration
- [ ] Create oracle service for signature generation
- [ ] Build game endpoints

---

## Success Criteria

### For Capstone Approval
✅ Demonstrates smart contract development (3 contracts)  
✅ Shows token economics understanding  
✅ Implements secure oracle pattern  
✅ Uses IPFS for decentralized storage  
✅ Full wallet integration on frontend  
✅ Complete gameplay loop with NFT minting  

### For Launch Readiness
✅ All contracts audited  
✅ Testnet working flawlessly  
✅ Gas costs optimized  
✅ UI/UX polished  
✅ Documentation complete  
✅ Monitoring in place  

---

## Resources & Documentation

### Development Tools
- **Hardhat**: https://hardhat.org/
- **OpenZeppelin**: https://docs.openzeppelin.com/
- **Wagmi**: https://wagmi.sh/
- **Pinata**: https://docs.pinata.cloud/

### Learning Resources
- Solidity by Example: https://solidity-by-example.org/
- Ethers.js Documentation: https://docs.ethers.org/
- Patrick Collins Smart Contract Course: https://www.youtube.com/watch?v=gyMwXuJrbJQ

### Community
- Ethereum Stack Exchange
- OpenZeppelin Forum
- Hardhat Discord

---

## Notes for Course Advisors

This project demonstrates:
1. **Token Economics**: ERC-20 game currency with approval pattern
2. **NFT Standards**: ERC-721 with metadata and IPFS integration
3. **Oracle Pattern**: Secure off-chain validation with on-chain verification
4. **Gas Optimization**: Efficient contract design
5. **Security**: Signature verification, replay protection, access control
6. **Real-world Architecture**: Frontend + Backend + Blockchain integration

The game mechanics serve as an engaging delivery mechanism for blockchain fundamentals, making concepts tangible and demonstrable.

1. Connect the operator's Web3 wallet (e.g. MetaMask)
2. Charge the equivalent of $1 in ETH per game play
3. Record the count of operator game plays before winning
4. Basic NFT image workflow (we'll do the video later) (pinata / IPFS)
5. NFT gallery per user (identified by wallet address)
6. All the solidity code for the NFT contract
7. Smart Contract for NFT minting. How do we establish value?

