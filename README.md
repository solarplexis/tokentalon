# TokenTalon

A Web3-enabled claw machine game where players connect their cryptocurrency wallets and spend tokens to operate a digital claw machine. Upon a successful grab, the system mints a unique NFT representing the prize, complete with a deterministic replay of the winning gameplay session.

## 🎮 Project Overview

TokenTalon combines the nostalgic fun of arcade claw machines with blockchain technology, creating a play-to-earn experience with verifiable, collectible NFT prizes.

### Key Features

- **Wallet Integration**: Connect Web3 wallets (MetaMask, WalletConnect, etc.)
- **Token-Based Gameplay**: Spend tokens for each play attempt
- **Physics-Based Game**: Realistic claw mechanics powered by Phaser
- **NFT Prizes**: Successful grabs mint unique NFTs with replay data
- **Deterministic Replays**: Each NFT includes data to replay the exact winning session
- **Marketplace**: Trade and showcase NFT prizes
- **Leaderboards**: Compete with other players

## 🏗️ Architecture

This is a monorepo containing three main packages:

```
tokentalon/
├── client/         # Next.js frontend (React + TypeScript)
├── server/         # Node.js backend (Express + TypeScript)
├── common/         # Shared types and utilities
└── contracts/      # Solidity smart contracts (coming soon)
```

### Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Game Engine**: Phaser
- **Web3**: wagmi, viem, ethers.js
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB
- **Blockchain**: Ethereum/Polygon (Solidity)
- **Storage**: IPFS (Pinata)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (for local development)
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tokentalon

# Install root dependencies
npm install

# Install all workspace dependencies
npm install

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

### Development

```bash
# Run both client and server in development mode
npm run dev

# Or run individually
npm run dev:client  # Client on http://localhost:3000
npm run dev:server  # Server on http://localhost:3001
```

### Building

```bash
# Build all packages
npm run build

# Or build individually
npm run build:common
npm run build:client
npm run build:server
```

## 📁 Package Details

### Client (`/client`)

Next.js application with:
- Wallet connection UI
- Phaser game canvas
- NFT gallery and marketplace
- User dashboard and leaderboards

See [client/README.md](./client/README.md) for details.

### Server (`/server`)

Node.js API server handling:
- Game session management
- Smart contract interactions
- NFT minting and metadata
- IPFS storage integration

See [server/README.md](./server/README.md) for details.

### Common (`/common`)

Shared TypeScript types and utilities used across client and server.

See [common/README.md](./common/README.md) for details.

## 🎯 Development Roadmap

### Phase 1: Core Mechanic (Weeks 1-2)
- [x] Project setup
- [ ] Basic claw physics implementation
- [ ] 2.5D visual layering
- [ ] Replay system with deterministic data recording

### Phase 2: Blockchain Architecture (Weeks 3-4)
- [ ] Smart contract development (GameToken, ClawMachine, PrizeNFT)
- [ ] Backend integration with blockchain
- [ ] IPFS storage implementation
- [ ] Oracle pattern for secure minting

### Phase 3: Integration & Polish (Weeks 5-6)
- [ ] Connect game to blockchain
- [ ] Asset pipeline (AI-generated prizes)
- [ ] Web3 UI (wallet, balance, gallery)
- [ ] Deployment to testnet/mainnet

## 📝 License

MIT

## 🤝 Contributing

This is a capstone project. Contributions are not currently being accepted.

## 📧 Contact

For questions or feedback, please open an issue.
