# Claw Spritesheet Setup Guide

## Sprite Details
- **File**: `public/assets/images/ui/claw_spritesheet_01.png`
- **Frames**: 7 frames (0-6)
- **Animation**: Frame 0 = fully open, Frame 6 = fully closed

## Current Configuration
The spritesheet is loaded with these dimensions (adjust if needed):
- `frameWidth`: 100px
- `frameHeight`: 120px

## To Adjust Dimensions
If your actual sprite dimensions are different, update in `GameScene.ts` preload method:

```typescript
this.load.spritesheet('claw', '/assets/images/ui/claw_spritesheet_01.png', {
  frameWidth: YOUR_WIDTH,   // Update this
  frameHeight: YOUR_HEIGHT, // Update this
});
```

## Animations Created
1. **claw_idle**: Shows frame 0 (open claw) - used when idle
2. **claw_close**: Plays frames 0→6 at 14fps - used when grabbing
3. **claw_open**: Plays frames 6→0 at 14fps - used when releasing

## How to Check Your Sprite Dimensions
Run this command in your terminal:
```bash
file public/assets/images/ui/claw_spritesheet_01.png
```

Or use an image editor to check the total width, then divide by 7 to get frameWidth.
