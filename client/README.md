# TokenTalon Client

Next.js frontend application for the TokenTalon claw machine game.

## Features

- **Wallet Connection**: Connect MetaMask and other Web3 wallets using wagmi
- **Game Canvas**: Phaser-powered claw machine game with physics
- **NFT Gallery**: View and manage your prize NFTs
- **Marketplace**: Trade NFTs with other players
- **Leaderboards**: See top players and their stats
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Game Engine**: Phaser 3
- **Web3**: wagmi, viem, @tanstack/react-query
- **State Management**: React Context + hooks

## Project Structure

```
client/
├── app/                    # Next.js app directory
│   ├── game/              # Game page
│   ├── gallery/           # NFT gallery page
│   ├── marketplace/       # Marketplace page
│   └── leaderboard/       # Leaderboard page
├── components/            # React components
│   ├── game/             # Game-related components
│   ├── wallet/           # Wallet connection components
│   └── ui/               # Reusable UI components
├── lib/                  # Utilities and helpers
│   ├── phaser/          # Phaser game setup
│   └── web3/            # Web3 configuration
└── public/              # Static assets
    └── assets/          # Game assets (images, sounds)
```

## Getting Started

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Building

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file in the client directory:

```env
# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=11155111  # Sepolia testnet
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Contract Addresses (filled after deployment)
NEXT_PUBLIC_GAME_TOKEN_ADDRESS=
NEXT_PUBLIC_CLAW_MACHINE_ADDRESS=
NEXT_PUBLIC_PRIZE_NFT_ADDRESS=

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# WalletConnect (optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

## Key Components

### Game Component
The main Phaser game canvas where players control the claw machine.

### Wallet Provider
Configures wagmi for wallet connection and blockchain interactions.

### NFT Gallery
Displays user's NFT prizes with replay functionality.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Phaser Documentation](https://photonstorm.github.io/phaser3-docs/)
- [wagmi Documentation](https://wagmi.sh)
