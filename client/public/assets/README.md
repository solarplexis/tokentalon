# Assets Directory

This directory contains all static assets for the TokenTalon game.

## Structure

```
assets/
├── images/
│   ├── cabinet/        # Cabinet and machine parts (cabinet.jpg, glass overlay, etc.)
│   ├── prizes/         # Prize images (plushies, dolls, figures)
│   ├── ui/            # UI elements (buttons, icons, borders)
│   └── backgrounds/   # Background textures and patterns
└── audio/
    ├── sfx/           # Sound effects (claw movement, grab, win/lose)
    └── music/         # Background music
```

## Usage in Code

### In React Components (Next.js)

```tsx
// Using next/image (optimized)
import Image from 'next/image';

<Image
  src="/assets/images/cabinet/cabinet.jpg"
  alt="Claw Machine Cabinet"
  width={800}
  height={600}
/>

// Or using regular img tag
<img src="/assets/images/cabinet/cabinet.jpg" alt="Cabinet" />
```

### In Phaser Game

```typescript
// In preload()
this.load.image('cabinet', '/assets/images/cabinet/cabinet.jpg');
this.load.image('prize-fox', '/assets/images/prizes/fox-plushie.png');
this.load.audio('claw-drop', '/assets/audio/sfx/claw-drop.mp3');

// In create()
this.add.image(400, 300, 'cabinet');
```

## File Naming Conventions

- Use lowercase with hyphens: `golden-fox.png`, `claw-machine.jpg`
- Be descriptive: `cabinet-front-view.jpg` not `img1.jpg`
- Include size/variant if needed: `prize-bear-large.png`, `button-play-hover.png`

## Recommended Formats

- **Images**: PNG (with transparency), JPG (photos/backgrounds), WebP (optimized)
- **Audio**: MP3 or OGG
- **Icons**: SVG (vector) or PNG

## Image Sizes

- Cabinet: ~1920x1080 (or smaller, optimized for web)
- Prizes: ~512x512 (consistent size for easy scaling)
- UI elements: Based on design needs
- Backgrounds: ~1920x1080 or tileable patterns
