# Phaser Game Implementation

## Overview
This directory contains the Phaser.js game engine implementation for TokenTalon's claw machine mechanics.

## Structure

```
lib/phaser/
├── config.ts          # Main Phaser game configuration
├── types.ts           # TypeScript interfaces for game state
└── scenes/
    └── GameScene.ts   # Main game scene with claw mechanics
```

## Core Features Implemented

### ✅ Phase 1: Core Mechanics
- **Claw Physics**: Horizontal movement, drop, grab, and return mechanics
- **Prize System**: Multiple prizes with different rarities and physics
- **Collision Detection**: Claw-prize interaction with grab probability
- **2.5D Visual**: Layered rendering (cable, claw, prizes)
- **Replay Recording**: Deterministic input recording for NFT metadata

## Game Flow

1. **IDLE**: Player moves claw left/right with arrow keys
2. **DROPPING**: Spacebar drops the claw down to grab zone
3. **GRABBING**: Claw checks for prize collision (50% success rate)
4. **RETURNING**: Claw returns to top with or without prize
5. **COMPLETE**: Win detection if prize reaches drop zone

## Controls

- `←/→ Arrow Keys`: Move claw horizontally
- `SPACE`: Drop claw to attempt grab
- Claw automatically returns after grab attempt

## Replay System

The game records deterministic replay data for each play session:

```typescript
{
  startTime: number,
  inputs: [{ timestamp, direction }],
  prizePositions: [{ id, x, y }],
  result: 'win' | 'loss',
  prizeWon?: { id, type, rarity, value }
}
```

This data will be stored on IPFS and referenced in the NFT metadata, allowing any win to be replayed visually.

## Next Steps

### Phase 2: Visual Polish
- [ ] Replace placeholder shapes with actual sprite assets
- [ ] Add claw animation frames (open/close)
- [ ] Implement particle effects for grabs
- [ ] Add sound effects (motor whir, grab, win/loss)
- [ ] Background music loop

### Phase 3: Blockchain Integration
- [ ] Connect replay data to backend API
- [ ] Upload replay JSON to IPFS on win
- [ ] Trigger NFT minting flow
- [ ] Display token cost before play

### Phase 4: Advanced Features
- [ ] Multiple difficulty levels (prize weights)
- [ ] Special prize types with unique behaviors
- [ ] Daily challenge mode
- [ ] Multiplayer spectator mode

## Development Notes

### Physics Tuning
- Gravity: 300 (can adjust for prize "feel")
- Claw speed: 200px/s horizontal
- Drop speed: 150px/s
- Return speed: 200px/s
- Grab success: 50% (will be made dynamic based on token spend)

### Debug Mode
Set `NODE_ENV=development` to enable physics debug visualization (collision boxes, velocities).

## Integration with Next.js

The game is loaded client-side only using dynamic imports:

```tsx
const PhaserGame = dynamic(() => import('@/components/game/PhaserGame'), {
  ssr: false
});
```

This prevents SSR issues since Phaser requires browser APIs.
