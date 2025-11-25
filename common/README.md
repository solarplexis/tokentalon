# TokenTalon Common

Shared TypeScript types and utilities used across the TokenTalon client and server.

## Overview

This package contains type definitions and shared code to ensure consistency between the frontend and backend. By centralizing types, we maintain a single source of truth and prevent type mismatches.

## Structure

```
common/
├── src/
│   ├── types/
│   │   ├── game.ts       # Game-related types
│   │   ├── nft.ts        # NFT-related types
│   │   └── user.ts       # User-related types
│   └── index.ts          # Main export file
└── dist/                 # Compiled output
```

## Type Definitions

### Game Types (`types/game.ts`)

- `Prize`: Prize object with customization options
- `PrizeCustomization`: Visual customization parameters
- `ClawData`: Deterministic replay data
- `ClawPosition`: Claw position at a point in time
- `CollisionEvent`: Physics collision data
- `GameSession`: Complete game session data
- `ReplayData`: Data required to replay a winning session

### NFT Types (`types/nft.ts`)

- `NFTMetadata`: Standard NFT metadata structure
- `NFTAttribute`: Individual NFT attributes/traits
- `MintRequest`: Request payload for minting
- `NFT`: Complete NFT object

### User Types (`types/user.ts`)

- `User`: User profile and wallet info
- `UserStats`: Player statistics
- `Leaderboard`: Leaderboard structure
- `LeaderboardEntry`: Individual leaderboard entry

## Usage

### In Client (Next.js)

```typescript
import { Prize, NFTMetadata, User } from 'tokentalon-common';

const prize: Prize = {
  id: '1',
  type: 'plushie',
  baseAsset: 'ipfs://...',
  customization: {
    colorPalette: ['#FF0000', '#00FF00'],
    sizeVariation: 1.0
  },
  difficulty: 5,
  rarity: 'rare'
};
```

### In Server (Node.js)

```typescript
import { GameSession, MintRequest } from 'tokentalon-common';

const session: GameSession = {
  id: 'session-123',
  playerId: 'user-456',
  walletAddress: '0x...',
  prizeId: 'prize-789',
  tokensSpent: 5,
  startTime: Date.now(),
  result: 'in_progress'
};
```

## Building

```bash
# Build the common package
npm run build

# Watch mode for development
npm run watch
```

## Development

When making changes to types:

1. Update the appropriate type file in `src/types/`
2. Run `npm run build` to compile
3. The client and server will pick up the changes

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `npm run lint` - Run ESLint

## Best Practices

1. **Keep types pure**: No business logic, only type definitions
2. **Use strict types**: Avoid `any`, prefer specific types
3. **Document complex types**: Add JSDoc comments for clarity
4. **Version carefully**: Breaking changes affect both client and server
5. **Export from index**: Always export through `src/index.ts`

## Learn More

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
