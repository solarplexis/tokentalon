# Adding Sound to TokenTalon Claw Machine

## Step-by-Step Implementation Guide

### Step 1: Add Sound Files

Place sound files in the appropriate directories:

```bash
client/public/assets/audio/
├── sfx/
│   ├── claw_move.mp3          # Motor sound (looping)
│   ├── claw_drop.mp3          # Descent sound
│   ├── claw_grab.mp3          # Closing sound
│   ├── claw_lift.mp3          # Rising sound
│   ├── prize_win.mp3          # Success jingle
│   ├── prize_miss.mp3         # Empty grab
│   └── button_click.mp3       # UI feedback
└── music/
    └── ambient_arcade.mp3     # Background music (optional)
```

### Step 2: Update GameScene.ts - Preload Sounds

Add to the `preload()` method (around line 90):

```typescript
preload() {
  // ... existing code ...

  // Load sound effects
  this.load.audio('claw_move', '/assets/audio/sfx/claw_move.mp3');
  this.load.audio('claw_drop', '/assets/audio/sfx/claw_drop.mp3');
  this.load.audio('claw_grab', '/assets/audio/sfx/claw_grab.mp3');
  this.load.audio('claw_lift', '/assets/audio/sfx/claw_lift.mp3');
  this.load.audio('prize_win', '/assets/audio/sfx/prize_win.mp3');
  this.load.audio('prize_miss', '/assets/audio/sfx/prize_miss.mp3');
  this.load.audio('button_click', '/assets/audio/sfx/button_click.mp3');

  // Optional background music
  this.load.audio('ambient_arcade', '/assets/audio/music/ambient_arcade.mp3');
}
```

### Step 3: Create Sound Objects

Add sound properties to the GameScene class (around line 30):

```typescript
export class GameScene extends Phaser.Scene {
  // ... existing properties ...

  // Sound objects
  private sounds?: {
    clawMove?: Phaser.Sound.BaseSound;
    clawDrop?: Phaser.Sound.BaseSound;
    clawGrab?: Phaser.Sound.BaseSound;
    clawLift?: Phaser.Sound.BaseSound;
    prizeWin?: Phaser.Sound.BaseSound;
    prizeMiss?: Phaser.Sound.BaseSound;
    buttonClick?: Phaser.Sound.BaseSound;
    ambientMusic?: Phaser.Sound.BaseSound;
  };

  private isSoundEnabled = true; // Sound on/off toggle
  private soundVolume = 0.7;     // Master volume (0-1)
```

### Step 4: Initialize Sounds

Add to the `create()` method (after line 109):

```typescript
async create() {
  // ... existing code ...

  this.setupSounds();
  this.setupVisualLayers();
  // ... rest of existing code ...
}

private setupSounds() {
  // Create sound objects with configuration
  this.sounds = {
    clawMove: this.sound.add('claw_move', {
      loop: true,      // Loop while moving
      volume: 0.4,
    }),
    clawDrop: this.sound.add('claw_drop', {
      volume: 0.5,
    }),
    clawGrab: this.sound.add('claw_grab', {
      volume: 0.6,
    }),
    clawLift: this.sound.add('claw_lift', {
      volume: 0.5,
    }),
    prizeWin: this.sound.add('prize_win', {
      volume: 0.8,
    }),
    prizeMiss: this.sound.add('prize_miss', {
      volume: 0.5,
    }),
    buttonClick: this.sound.add('button_click', {
      volume: 0.3,
    }),
  };

  // Optional: Start ambient music
  if (this.sound.get('ambient_arcade')) {
    this.sounds.ambientMusic = this.sound.add('ambient_arcade', {
      loop: true,
      volume: 0.2, // Quiet background
    });
    // this.sounds.ambientMusic.play(); // Uncomment to auto-play
  }

  console.log('✅ Sounds loaded');
}
```

### Step 5: Add Sound Triggers

#### A. Movement Sounds

Update `handleIdleState()` method (around line 416):

```typescript
private handleIdleState(delta: number) {
  if (!this.cabinetConfig) return;

  const cursors = this.input.keyboard?.createCursorKeys();
  const { clawSpeed } = this.cabinetConfig.physics;
  const { playArea } = this.cabinetConfig;
  const cabinetScale = 2.0;

  let moved = false;

  // ... existing boundary calculations ...

  // Left/Right movement
  if (cursors?.left.isDown) {
    const minX = xBounds.min * cabinetScale;
    if (this.clawState.x > minX) {
      this.clawState.x -= (clawSpeed * delta) / 1000;
      this.clawState.x = Math.max(this.clawState.x, minX);
      moved = true;
    }
  } else if (cursors?.right.isDown) {
    const maxX = xBounds.max * cabinetScale;
    if (this.clawState.x < maxX) {
      this.clawState.x += (clawSpeed * delta) / 1000;
      this.clawState.x = Math.min(this.clawState.x, maxX);
      moved = true;
    }
  }

  // Forward/Back movement (depth)
  if (cursors?.up.isDown) {
    const minY = playArea.front * cabinetScale;
    if (this.clawState.y > minY) {
      this.clawState.y -= (clawSpeed * delta) / 1000;
      this.clawState.y = Math.max(this.clawState.y, minY);
      moved = true;
    }
  } else if (cursors?.down.isDown) {
    const maxY = playArea.back * cabinetScale;
    if (this.clawState.y < maxY) {
      this.clawState.y += (clawSpeed * delta) / 1000;
      this.clawState.y = Math.min(this.clawState.y, maxY);
      moved = true;
    }
  }

  // Play/stop movement sound
  if (moved) {
    if (this.sounds?.clawMove && !this.sounds.clawMove.isPlaying) {
      this.playSound('clawMove');
    }
  } else {
    if (this.sounds?.clawMove?.isPlaying) {
      this.sounds.clawMove.stop();
    }
  }

  // ... rest of existing code ...
}
```

#### B. Drop Sound

Update `dropClaw()` method (around line 463):

```typescript
private dropClaw() {
  this.gameState = GameState.DROPPING;
  this.playSound('clawDrop');
  console.log('Dropping claw...');
}
```

#### C. Grab Sound

Update `handleGrabbingState()` method (around line 498):

```typescript
private handleGrabbingState() {
  if (!this.claw) return;

  // Play closing animation AND grab sound
  if (this.anims.exists('claw_close')) {
    this.claw.play('claw_close');
    this.playSound('clawGrab');
  }

  // ... rest of existing code ...
}
```

#### D. Lift Sound & Win/Miss Sounds

Update the prize check section in `handleGrabbingState()` (around line 544):

```typescript
if (grabbedPrize) {
  console.log('Prize grabbed!', grabbedPrize.getData('id'));
  // Attach prize to claw (simplified)
  this.physics.add.existing(grabbedPrize);
  grabbedPrize.setData('grabbed', true);
  grabbedPrize.setData('grabAccuracy', bestGrabChance);
  this.clawState.isGrabbing = true;

  // Play win sound
  this.playSound('prizeWin');
} else {
  // Play open animation if nothing grabbed
  if (this.claw && this.anims.exists('claw_open')) {
    this.claw.play('claw_open');
  }

  // Play miss sound
  this.playSound('prizeMiss');
}

// Start returning
this.gameState = GameState.RETURNING;
this.playSound('clawLift'); // Play lift sound when returning
```

### Step 6: Add Sound Helper Method

Add this helper method to the GameScene class:

```typescript
private playSound(soundKey: keyof typeof this.sounds) {
  if (!this.isSoundEnabled || !this.sounds) return;

  const sound = this.sounds[soundKey];
  if (sound && !sound.isPlaying) {
    sound.play();
  }
}
```

### Step 7: Add Volume Control UI (Optional)

Add a sound toggle button and volume slider. Add to `setupGame()` method:

```typescript
private setupGame() {
  // ... existing code ...

  // Add sound controls to UI
  const soundButton = this.add.text(
    this.scale.width - 100,
    20,
    this.isSoundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF',
    {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    }
  )
  .setDepth(200)
  .setInteractive()
  .on('pointerdown', () => {
    this.toggleSound();
    soundButton.setText(this.isSoundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF');
  });
}

private toggleSound() {
  this.isSoundEnabled = !this.isSoundEnabled;

  if (!this.isSoundEnabled) {
    // Stop all playing sounds
    this.sound.stopAll();
  }

  console.log(`Sound ${this.isSoundEnabled ? 'enabled' : 'disabled'}`);
}
```

### Step 8: Cleanup on Scene Shutdown

Add cleanup to prevent memory leaks:

```typescript
shutdown() {
  // Stop all sounds when scene ends
  this.sound.stopAll();

  // Clean up sound references
  if (this.sounds) {
    Object.values(this.sounds).forEach(sound => {
      sound?.destroy();
    });
  }
}
```

## Testing Checklist

- [ ] Movement sounds play while moving (and stop when stopped)
- [ ] Drop sound plays when pressing SPACE
- [ ] Grab sound plays when claw closes
- [ ] Win sound plays when prize is grabbed
- [ ] Miss sound plays when grab fails
- [ ] Lift sound plays when claw returns
- [ ] Sound toggle button works
- [ ] No sound overlapping issues
- [ ] Volume levels are balanced
- [ ] Sounds stop when leaving the game

## Performance Considerations

1. **File Size**: Keep sound files under 200KB each (compress if needed)
2. **Format**: Use MP3 for compatibility, OGG for better compression
3. **Looping**: Only loop ambient sounds, not SFX
4. **Preloading**: All sounds loaded in `preload()` to prevent lag
5. **Mobile**: Consider lower volume defaults for mobile devices

## Advanced: Sound Manager Class (Optional)

For a more robust solution, create a separate SoundManager class:

```typescript
// lib/phaser/managers/SoundManager.ts
export class SoundManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound>;
  private enabled: boolean = true;
  private masterVolume: number = 0.7;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.sounds = new Map();
  }

  add(key: string, config?: Phaser.Types.Sound.SoundConfig) {
    const sound = this.scene.sound.add(key, {
      ...config,
      volume: (config?.volume || 1) * this.masterVolume,
    });
    this.sounds.set(key, sound);
    return sound;
  }

  play(key: string) {
    if (!this.enabled) return;
    const sound = this.sounds.get(key);
    if (sound && !sound.isPlaying) {
      sound.play();
    }
  }

  stop(key: string) {
    this.sounds.get(key)?.stop();
  }

  stopAll() {
    this.sounds.forEach(sound => sound.stop());
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.setVolume((sound.volume / this.masterVolume) * volume);
    });
  }

  destroy() {
    this.sounds.forEach(sound => sound.destroy());
    this.sounds.clear();
  }
}
```

Then use it in GameScene:

```typescript
private soundManager?: SoundManager;

create() {
  this.soundManager = new SoundManager(this);
  this.soundManager.add('claw_move', { loop: true, volume: 0.4 });
  // ... etc
}

// Later:
this.soundManager.play('claw_move');
```

## Resources

- **Phaser Sound API**: https://photonstorm.github.io/phaser3-docs/Phaser.Sound.html
- **Sound Design Tips**: Keep sounds short (<2 seconds for SFX)
- **Attribution**: If using CC-licensed sounds, add credits to README
