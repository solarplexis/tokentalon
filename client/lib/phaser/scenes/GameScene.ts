import Phaser from 'phaser';
import { GameState, ClawState, ReplayData, GameInput, PrizeData } from '../types';
import { CabinetConfig } from '../utils/cabinet';
import { CabinetLoader } from '../CabinetLoader';
import { CoordinateUtils, DepthUtils } from '../utils/cabinet';
import { generateCustomTraits } from '@/lib/prizeTraits';

export class GameScene extends Phaser.Scene {
  private cabinetConfig?: CabinetConfig;
  private background?: Phaser.GameObjects.Image;
  private cabinetEnclosure?: Phaser.GameObjects.Image;
  private claw?: Phaser.Physics.Arcade.Sprite;
  private clawCable?: Phaser.GameObjects.Line;
  private prizes: Phaser.Physics.Arcade.Sprite[] = [];
  private prizeTypes: Array<{
    key: string;
    rarity: string;
    baseSize: number;
    grabDifficulty: number;
  }> = [];
  private gameState: GameState = GameState.IDLE;
  private clawState: ClawState = {
    x: 400,
    y: 100,
    z: 50, // Will be replaced with y (depth) after cabinet config loads
    isGrabbing: false,
    isReturning: false,
    isMoving: false,
  };

  // Replay recording
  private replayData: ReplayData = {
    startTime: 0,
    inputs: [],
    prizePositions: [],
    result: 'loss',
  };
  private isRecording = false;

  // Game constants
  private readonly CLAW_SPEED = 200;
  private readonly CLAW_DROP_SPEED = 150;
  private readonly CLAW_RETURN_SPEED = 200;
  private readonly CLAW_WIDTH = 60;
  private readonly CLAW_HEIGHT = 80;
  private readonly GAME_WIDTH = 800;
  private readonly CLAW_MIN_X = 100;
  private readonly CLAW_MAX_X = 700;
  private readonly CLAW_START_Y = 100;
  private readonly CLAW_MAX_Y = 700;
  private readonly DROP_ZONE_Y = 850;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load background and cabinet
    this.load.image('background', '/assets/images/backgrounds/arcade_background.jpg');
    this.load.image('cabinet', '/assets/images/cabinet/claw_machine_enclosure_wide.png');

    // Load prize configuration
    this.load.json('prizeConfig', '/assets/prizes.json');

    // Load claw spritesheet (7 frames: open to closed)
    this.load.spritesheet('claw', '/assets/images/ui/claw_spritesheet_01.png', {
      frameWidth: 196,
      frameHeight: 182,
    });

    // Load all prize images
    const prizeNames = [
      'alien', 'baby_doll', 'bumblebee', 'bunny', 'chibi_ninja',
      'circuit_frog', 'cow', 'cyber_cat', 'cyclops', 'doll',
      'dragon_egg', 'ice_cream_cone', 'jack-o-lantern', 'kawaii_ghost', 'lava_blob',
      'lego_brick', 'minion', 'mystery', 'nemo', 'penguin',
      'piglet', 'pixel_dino', 'space_sloth', 'steampunk_owl', 'teddybear',
      'unicorn', 'viking_walrus', 'white_cloud', 'wizard_gnome', 'yellow_starfish'
    ];
    
    prizeNames.forEach(name => {
      this.load.image(`prize_${name}`, `/assets/images/prizes/${name}.png`);
    });

    // Add error handling
    this.load.on('loaderror', (file: any) => {
      console.error('Error loading file:', file.key, file.url);
    });

    this.load.on('complete', () => {
      console.log('All assets loaded successfully');
    });
  }

  async create() {
    // Load cabinet configuration
    this.cabinetConfig = await CabinetLoader.load(this);
    
    // Load prize types from JSON
    const prizeConfig = this.cache.json.get('prizeConfig');
    this.prizeTypes = prizeConfig.prizeTypes || [];
    
    this.createAnimations();
    this.setupVisualLayers();
    this.setupGame();
    this.setupControls();
    this.startRecording();
  }

  private createAnimations() {
    // Ensure the texture is loaded before creating animations
    if (!this.textures.exists('claw')) {
      console.error('Claw texture not loaded!');
      return;
    }

    // Debug: Check what frames were actually created
    const texture = this.textures.get('claw');
    const frames = texture.getFrameNames();
    console.log('Available frames:', frames);
    console.log('Total frames:', frames.length);

    // If no frames were parsed, the spritesheet config is wrong
    if (frames.length === 0) {
      console.error('No frames found! Check spritesheet dimensions.');
      console.error('Expected: 7 frames of 196x192');
      console.error('Image should be 1372x192 (horizontal) or 196x1344 (vertical)');
      return;
    }

    // Create claw opening animation (frames 0-6, open to closed)
    this.anims.create({
      key: 'claw_close',
      frames: this.anims.generateFrameNumbers('claw', { start: 0, end: 6 }),
      frameRate: 14,
      repeat: 0,
    });

    // Create claw closing animation (frames 6-0, closed to open)
    this.anims.create({
      key: 'claw_open',
      frames: this.anims.generateFrameNumbers('claw', { start: 6, end: 0 }),
      frameRate: 14,
      repeat: 0,
    });

    // Idle state (frame 0 - fully open)
    this.anims.create({
      key: 'claw_idle',
      frames: [{ key: 'claw', frame: 0 }],
      frameRate: 1,
    });

    console.log('Animations created successfully');
  }

  private setupVisualLayers() {
    if (!this.cabinetConfig) return;

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Layer 1: Background (arcade backdrop) - cover entire viewport
    this.background = this.add.image(centerX, centerY, 'background');
    // Scale to cover the entire screen, maintaining aspect ratio
    const scaleX = this.scale.width / this.background.width;
    const scaleY = this.scale.height / this.background.height;
    const scale = Math.max(scaleX, scaleY); // Use max to ensure full coverage
    this.background.setScale(scale);
    this.background.setDepth(-100);

    // Layer 2: Cabinet enclosure (in center, doubled in size)
    this.cabinetEnclosure = this.add.image(centerX, centerY, 'cabinet');
    // Double the size from original dimensions
    const targetScale = 2.0;
    this.cabinetEnclosure.setScale(targetScale);
    this.cabinetEnclosure.setDepth(100); // Cabinet in front of game objects

    console.log('✅ Visual layers set up:', {
      backgroundSize: { w: this.scale.width, h: this.scale.height },
      backgroundScale: scale,
      cabinetScale: targetScale,
    });
  }

  private setupGame() {
    if (!this.cabinetConfig) return;

    const { clawStartPosition } = this.cabinetConfig;
    const cabinetScale = 2.0; // Match the visual layer scale

    // Initialize claw at starting position from config
    this.clawState.x = clawStartPosition.x * cabinetScale;
    this.clawState.y = clawStartPosition.y * cabinetScale;
    this.clawState.z = 0; // Unused but kept for compatibility

    // Calculate cabinet top position for cable
    const centerY = this.scale.height / 2;
    const cabinetHeight = this.cabinetConfig.enclosureDimensions.height * cabinetScale;
    const cabinetTop = centerY - cabinetHeight / 2;
    const headerHeight = 67 * cabinetScale; // Header is 67px at 1x, 134px at 2x
    const cableStartY = cabinetTop + headerHeight;

    // Create claw cable (line from bottom of header to claw)
    this.clawCable = this.add.line(
      0,
      0,
      this.clawState.x,
      cableStartY,
      this.clawState.x,
      this.clawState.y,
      0x333333 // Dark metallic gray
    );
    this.clawCable.setOrigin(0, 0);
    this.clawCable.setLineWidth(3);
    this.clawCable.setDepth(150); // Render in front of cabinet (100) but behind claw

    // Create claw sprite with physics
    this.claw = this.physics.add.sprite(this.clawState.x, this.clawState.y, 'claw', 0);
    this.claw.setOrigin(0.5, 0); // Origin at top-center for cable attachment
    if (this.anims.exists('claw_idle')) {
      this.claw.play('claw_idle');
    }

    // Configure physics
    const clawBody = this.claw.body as Phaser.Physics.Arcade.Body;
    clawBody.setAllowGravity(false);

    // Apply initial transformation
    this.updateClawTransform();

    // Create prizes
    this.createPrizes();

    // UI
    this.add.text(20, 20, 'Controls: ←→ Move, ↑↓ Depth, SPACE Drop', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    }).setDepth(200);

    this.add
      .text(20, 50, 'State: ', { fontSize: '16px', color: '#ffffff', backgroundColor: '#000000' })
      .setName('stateText')
      .setDepth(200);

    this.add
      .text(20, 80, 'Depth: ', { fontSize: '16px', color: '#ffffff', backgroundColor: '#000000' })
      .setName('depthText')
      .setDepth(200);
  }

  private updateClawTransform() {
    if (!this.claw || !this.cabinetConfig) return;

    // Convert from display coordinates to cabinet coordinates
    const pos2D = { x: this.clawState.x / 2.0, y: this.clawState.y / 2.0 };
    const transformed = CoordinateUtils.to2D(pos2D, this.cabinetConfig, 'idle');

    // Calculate screen position accounting for centered cabinet
    const cabinetScale = 2.0;
    const centerY = this.scale.height / 2;
    const cabinetHeight = this.cabinetConfig.enclosureDimensions.height * cabinetScale;
    const cabinetTop = centerY - cabinetHeight / 2;
    
    const screenX = transformed.x * cabinetScale;
    const screenY = cabinetTop + (transformed.y * cabinetScale);
    
    this.claw.setPosition(screenX, screenY);
    this.claw.setScale(transformed.scale * 0.3); // 0.3 base scale for claw sprite
    this.claw.setDepth(transformed.depth);
  }

  private createPrizes() {
    if (!this.cabinetConfig || this.prizeTypes.length === 0) return;

    // Use prize types loaded from JSON
    const prizeTypes = this.prizeTypes;

    const prizeCount = Phaser.Math.Between(
      this.cabinetConfig.prizes.minCount,
      this.cabinetConfig.prizes.maxCount
    );

    // Create prizes with proper 2D positioning
    const centerY = this.scale.height / 2;
    const cabinetHeight = this.cabinetConfig.enclosureDimensions.height * 2.0; // At 2x scale
    const cabinetTop = centerY - cabinetHeight / 2;
    const centerX = this.scale.width / 2;
    const cabinetWidth = this.cabinetConfig.enclosureDimensions.width * 2.0;
    const cabinetLeft = centerX - cabinetWidth / 2;

    for (let i = 0; i < prizeCount; i++) {
      const prizeType = Phaser.Math.RND.pick(prizeTypes) as {
        key: string;
        rarity: string;
        baseSize: number;
        grabDifficulty: number;
      };

      // Get random 2D position using cabinet config
      const pos2D = CoordinateUtils.getRandomPosition(this.cabinetConfig);

      // Store 2D position for later use
      const prizeData = {
        x: pos2D.x,
        y: pos2D.y,
        z: 0, // Unused but kept for compatibility
      };

      // Transform to 2D for rendering (prizes sit on prize floor)
      const cabinetScale = 2.0;
      const transformed = CoordinateUtils.to2D(pos2D, this.cabinetConfig, 'prize');

      // Position relative to cabinet offset
      const screenX = cabinetLeft + (transformed.x * cabinetScale);
      const screenY = cabinetTop + (transformed.y * cabinetScale);

      const prize = this.physics.add.sprite(
        screenX,
        screenY,
        prizeType.key
      );

      prize.setData('id', prizeType.key);
      prize.setData('rarity', prizeType.rarity);
      prize.setData('grabDifficulty', prizeType.grabDifficulty);
      prize.setData('position2D', prizeData); // Store 2D position
      
      // Apply perspective scale combined with base size
      const finalScale = transformed.scale * prizeType.baseSize * 0.25; // 0.25 for better visibility
      prize.setScale(finalScale);
      prize.setDepth(transformed.depth);

      // Disable physics for now (static prizes)
      const body = prize.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);

      this.prizes.push(prize);

      // Record initial positions
      this.replayData.prizePositions.push({
        id: prizeType.key,
        x: pos2D.x,
        y: pos2D.y,
        z: 0, // Unused but kept for compatibility
      });
    }
  }

  private setupControls() {
    const spaceBar = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Movement controls - Left/Right
    this.input.keyboard?.on('keydown-LEFT', () => {
      if (this.gameState === GameState.IDLE) {
        this.recordInput('left');
      }
    });

    this.input.keyboard?.on('keydown-RIGHT', () => {
      if (this.gameState === GameState.IDLE) {
        this.recordInput('right');
      }
    });

    // Depth controls - Up/Down (forward/backward in 3D space)
    this.input.keyboard?.on('keydown-UP', () => {
      if (this.gameState === GameState.IDLE) {
        this.recordInput('backward');
      }
    });

    this.input.keyboard?.on('keydown-DOWN', () => {
      if (this.gameState === GameState.IDLE) {
        this.recordInput('forward');
      }
    });

    // Drop control
    spaceBar?.on('down', () => {
      if (this.gameState === GameState.IDLE) {
        this.recordInput('drop');
        this.dropClaw();
      }
    });
  }

  update(time: number, delta: number) {
    this.updateStateUI();
    this.updateCablePosition();

    switch (this.gameState) {
      case GameState.IDLE:
        this.handleIdleState(delta);
        break;
      case GameState.DROPPING:
        this.handleDroppingState(delta);
        break;
      case GameState.GRABBING:
        this.handleGrabbingState();
        break;
      case GameState.RETURNING:
        this.handleReturningState(delta);
        break;
      case GameState.COMPLETE:
        this.handleCompleteState();
        break;
    }
  }

  private handleIdleState(delta: number) {
    if (!this.cabinetConfig) return;

    const cursors = this.input.keyboard?.createCursorKeys();
    const { clawSpeed } = this.cabinetConfig.physics;
    const { playArea } = this.cabinetConfig;
    const cabinetScale = 2.0;
    
    let moved = false;

    // Get current X boundaries based on current Y (depth)
    const currentY = this.clawState.y / cabinetScale;
    const xBounds = DepthUtils.getXBoundsAtDepth(currentY, this.cabinetConfig);

    // Horizontal movement (X-axis with perspective)
    if (cursors?.left.isDown) {
      this.clawState.x -= (clawSpeed.horizontal * delta) / 1000;
      this.clawState.x = Math.max(
        xBounds.min * cabinetScale,
        this.clawState.x
      );
      moved = true;
    } else if (cursors?.right.isDown) {
      this.clawState.x += (clawSpeed.horizontal * delta) / 1000;
      this.clawState.x = Math.min(
        xBounds.max * cabinetScale,
        this.clawState.x
      );
      moved = true;
    }

    // Depth movement (Y-axis) - Up = backward (far), Down = forward (near)
    if (cursors?.up.isDown) {
      this.clawState.y -= (clawSpeed.depth * delta) / 1000;
      this.clawState.y = Math.max(playArea.y.min * cabinetScale, this.clawState.y);
      moved = true;
    } else if (cursors?.down.isDown) {
      this.clawState.y += (clawSpeed.depth * delta) / 1000;
      this.clawState.y = Math.min(playArea.y.max * cabinetScale, this.clawState.y);
      moved = true;
    }

    if (moved) {
      this.updateClawTransform();
    }
  }

  private dropClaw() {
    // Payment already handled by GameController before game started
    this.gameState = GameState.DROPPING;
    console.log('Dropping claw...');
  }

  private handleDroppingState(delta: number) {
    if (!this.claw || !this.cabinetConfig) return;

    // Calculate target Y based on current depth position using basin floor
    const pos2D = { x: this.clawState.x / 2.0, y: this.clawState.y / 2.0 };
    const transformed = CoordinateUtils.to2D(pos2D, this.cabinetConfig, 'drop'); // Use basin floor
    
    const cabinetScale = 2.0;
    const centerY = this.scale.height / 2;
    const cabinetHeight = this.cabinetConfig.enclosureDimensions.height * cabinetScale;
    const cabinetTop = centerY - cabinetHeight / 2;
    const targetY = cabinetTop + (transformed.y * cabinetScale);

    // Move toward target
    const moveSpeed = (this.CLAW_DROP_SPEED * delta) / 1000;
    if (this.claw.y < targetY) {
      this.claw.y = Math.min(this.claw.y + moveSpeed, targetY);
    }

    // Reached target
    if (this.claw.y >= targetY - 5) { // Within 5px tolerance
      this.gameState = GameState.GRABBING;
      console.log('Grabbing...');
    }
  }

  private handleGrabbingState() {
    if (!this.claw) return;

    // Play closing animation (check if animation exists)
    if (this.anims.exists('claw_close')) {
      this.claw.play('claw_close');
    }

    // Check for collision with prizes after animation starts
    this.time.delayedCall(200, () => {
      if (!this.claw) return;

      const clawBounds = this.claw.getBounds();
      let closestPrize: Phaser.Physics.Arcade.Sprite | null = null;
      let bestGrabChance = 0;

      for (const prize of this.prizes) {
        const prizeBounds = prize.getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(clawBounds, prizeBounds)) {
          // Calculate grab chance based on positioning accuracy
          const prizePos = prize.getData('position2D');
          const clawPos2D = { x: this.clawState.x / 2.0, y: this.clawState.y / 2.0 };
          
          // Distance from center of claw to prize
          const dx = Math.abs(prizePos.x - clawPos2D.x);
          const dy = Math.abs(prizePos.y - clawPos2D.y);
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Better positioning = higher chance (max 12% at perfect center)
          const grabRadius = this.cabinetConfig?.physics.grabRadius || 30;
          const positionAccuracy = Math.max(0, 1 - distance / grabRadius);
          
          // Apply prize-specific difficulty multiplier (higher = harder to grab)
          const grabDifficulty = prize.getData('grabDifficulty') || 1.0;
          const grabChance = (positionAccuracy * 0.12) / grabDifficulty; // Divide by difficulty
          
          if (grabChance > bestGrabChance) {
            bestGrabChance = grabChance;
            closestPrize = prize;
          }
        }
      }

      // Roll the dice once for the best positioned prize
      let grabbedPrize: Phaser.Physics.Arcade.Sprite | null = null;
      if (closestPrize && Math.random() < bestGrabChance) {
        grabbedPrize = closestPrize;
      }

      if (grabbedPrize) {
        console.log('Prize grabbed!', grabbedPrize.getData('id'));
        // Attach prize to claw (simplified)
        this.physics.add.existing(grabbedPrize);
        grabbedPrize.setData('grabbed', true);
        grabbedPrize.setData('grabAccuracy', bestGrabChance); // Store for attribute generation
        this.clawState.isGrabbing = true;
      } else {
        // Play open animation if nothing grabbed
        if (this.claw && this.anims.exists('claw_open')) {
          this.claw.play('claw_open');
        }
      }

      // Start returning
      this.gameState = GameState.RETURNING;
      this.time.delayedCall(300, () => {
        console.log('Returning claw...');
      });
    });
  }

  private handleReturningState(delta: number) {
    if (!this.claw || !this.cabinetConfig) return;

    const grabbedPrize = this.prizes.find((p) => p.getData('grabbed'));
    const cabinetScale = 2.0;
    const centerY = this.scale.height / 2;
    const cabinetHeight = this.cabinetConfig.enclosureDimensions.height * cabinetScale;
    const cabinetTop = centerY - cabinetHeight / 2;

    // If prize was grabbed, automatically navigate to drop chute center
    if (grabbedPrize) {
      const { dropBox } = this.cabinetConfig;
      
      // Calculate drop chute center position in 2D coordinates
      const dropChuteY = (dropBox.y.min + dropBox.y.max) / 2;
      const normalizedDepth = (dropChuteY - this.cabinetConfig.playArea.y.min) / 
                             (this.cabinetConfig.playArea.y.max - this.cabinetConfig.playArea.y.min);
      const dropChuteXMin = dropBox.x.back.min + normalizedDepth * (dropBox.x.front.min - dropBox.x.back.min);
      const dropChuteXMax = dropBox.x.back.max + normalizedDepth * (dropBox.x.front.max - dropBox.x.back.max);
      const dropChuteX = (dropChuteXMin + dropChuteXMax) / 2;
      
      // Move claw to drop chute center
      const targetClawX = dropChuteX * cabinetScale;
      const targetClawY = dropChuteY * cabinetScale;
      const moveSpeed = (this.CLAW_RETURN_SPEED * delta) / 1000;
      
      // Move horizontally to drop chute
      if (Math.abs(this.clawState.x - targetClawX) > 5) {
        if (this.clawState.x < targetClawX) {
          this.clawState.x = Math.min(targetClawX, this.clawState.x + moveSpeed);
        } else {
          this.clawState.x = Math.max(targetClawX, this.clawState.x - moveSpeed);
        }
      }
      
      // Move to drop chute depth
      if (Math.abs(this.clawState.y - targetClawY) > 5) {
        if (this.clawState.y < targetClawY) {
          this.clawState.y = Math.min(targetClawY, this.clawState.y + moveSpeed);
        } else {
          this.clawState.y = Math.max(targetClawY, this.clawState.y - moveSpeed);
        }
      }
      
      // Update claw visual position
      this.updateClawTransform();
      
      // Keep prize attached to claw
      grabbedPrize.y = this.claw.y + this.CLAW_HEIGHT / 2 + 20;
      grabbedPrize.x = this.claw.x;
      
      // Once positioned over drop chute, move up to release height
      const pos2D = { x: this.clawState.x / 2.0, y: this.clawState.y / 2.0 };
      const isOverDropChute = Math.abs(this.clawState.x - targetClawX) < 5 && 
                              Math.abs(this.clawState.y - targetClawY) < 5;
      
      if (isOverDropChute) {
        const transformed = CoordinateUtils.to2D(pos2D, this.cabinetConfig, 'idle');
        const targetIdleY = cabinetTop + (transformed.y * cabinetScale);
        
        // Move up to idle position
        if (this.claw.y > targetIdleY + 5) {
          this.claw.y = Math.max(targetIdleY, this.claw.y - moveSpeed);
          grabbedPrize.y = this.claw.y + this.CLAW_HEIGHT / 2 + 20;
        } else {
          // Reached idle height over drop chute - release prize!
          this.gameState = GameState.COMPLETE;
          console.log('🎉 WIN! Prize delivered to drop chute!');
          
          // Get grab accuracy from stored data
          const grabAccuracy = grabbedPrize.getData('grabAccuracy') || 0;
          const prizeIdString = grabbedPrize.getData('id');
          const rarity = grabbedPrize.getData('rarity');
          
          // Convert prize key to numeric ID (1-based)
          const prizeIndex = this.prizeTypes.findIndex(p => p.key === prizeIdString);
          const prizeId = prizeIndex >= 0 ? prizeIndex + 1 : 1;
          
          // Get player address from registry
          const playerAddress = this.game.registry.get('playerAddress') || '0x0000000000000000000000000000000000000000';
          
          // Generate custom traits (matching backend algorithm)
          const difficulty = grabbedPrize.getData('grabDifficulty') || 1;
          const tokensSpent = 10; // TODO: Get from actual game cost
          const customTraits = generateCustomTraits(
            prizeId,
            difficulty * 10, // Scale to 1-10 range
            tokensSpent,
            playerAddress
          );
          
          console.log('✨ Generated custom traits:', customTraits);
          
          // Generate legacy attributes for backward compatibility
          const attributes = this.generatePrizeAttributes(prizeIdString, rarity, grabAccuracy);
          
          this.replayData.result = 'won';
          this.replayData.prizeWon = {
            id: prizeIdString,
            type: prizeIdString,
            rarity: rarity,
            value: 100,
            attributes: attributes,
            customTraits: customTraits, // Add custom traits
          };
          
          // Open claw
          if (this.anims.exists('claw_open')) {
            this.claw.play('claw_open');
          }
          
          // Animate prize dropping into chute
          this.tweens.add({
            targets: grabbedPrize,
            y: grabbedPrize.y + 200,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              grabbedPrize.destroy();
            }
          });
          
          grabbedPrize.setData('grabbed', false);
        }
      }
    } else {
      // No prize grabbed - just return to start position
      const pos2D = { x: this.clawState.x / 2.0, y: this.clawState.y / 2.0 };
      const transformed = CoordinateUtils.to2D(pos2D, this.cabinetConfig, 'idle');
      const targetY = cabinetTop + (transformed.y * cabinetScale);
      const moveSpeed = (this.CLAW_RETURN_SPEED * delta) / 1000;
      
      if (this.claw.y > targetY) {
        this.claw.y = Math.max(targetY, this.claw.y - moveSpeed);
      }
      
      if (this.claw.y <= targetY + 5) {
        this.gameState = GameState.COMPLETE;
        console.log('No prize grabbed - Try again!');
        this.replayData.result = 'loss';
      }
    }
  }

  private handleCompleteState() {
    this.stopRecording();
    
    // Change state to prevent this from running repeatedly
    this.gameState = GameState.IDLE;
    
    // Check if player won
    if (this.replayData.result === 'won' && this.replayData.prizeWon) {
      // Show win overlay after a short delay
      this.time.delayedCall(800, () => {
        this.showWinOverlay();
      });
    } else {
      // Reset after delay for loss
      this.time.delayedCall(2000, () => {
        this.resetGame();
        
        // Notify parent that game ended
        const onGameEnd = this.game.registry.get('onGameEnd');
        if (onGameEnd && typeof onGameEnd === 'function') {
          onGameEnd();
        }
      });
    }
  }

  private showWinOverlay() {
    if (!this.replayData.prizeWon) return;

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Semi-transparent overlay background
    const overlay = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x000000, 0.8);
    overlay.setDepth(1000);
    overlay.setInteractive();

    // Win panel background (taller to fit attributes)
    const panelWidth = 500;
    const panelHeight = this.replayData.prizeWon.attributes ? 750 : 600;
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x2c3e50, 1);
    panel.setDepth(1001);
    panel.setStrokeStyle(4, 0xf39c12);

    // Congratulations text
    const congratsText = this.add.text(centerX, centerY - 220, '🎉 CONGRATULATIONS! 🎉', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#f39c12',
      fontStyle: 'bold',
      align: 'center'
    });
    congratsText.setOrigin(0.5);
    congratsText.setDepth(1002);

    // Prize image
    const prizeKey = this.replayData.prizeWon.id;
    const prizeImage = this.add.image(centerX, centerY - 50, prizeKey);
    prizeImage.setScale(0.6);
    prizeImage.setDepth(1002);

    // Prize name and rarity
    const prizeName = prizeKey.replace('prize_', '').replace(/_/g, ' ');
    const prizeNameText = this.add.text(centerX, centerY + 120, 
      prizeName.charAt(0).toUpperCase() + prizeName.slice(1), {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ecf0f1',
      fontStyle: 'bold',
      align: 'center'
    });
    prizeNameText.setOrigin(0.5);
    prizeNameText.setDepth(1002);

    // Rarity badge
    const rarityColors: { [key: string]: number } = {
      common: 0x95a5a6,
      uncommon: 0x27ae60,
      rare: 0x3498db,
      legendary: 0x9b59b6
    };
    const rarityColor = rarityColors[this.replayData.prizeWon.rarity] || 0x95a5a6;
    
    const rarityBadge = this.add.rectangle(centerX, centerY + 170, 180, 40, rarityColor);
    rarityBadge.setDepth(1002);
    
    const rarityText = this.add.text(centerX, centerY + 170, 
      this.replayData.prizeWon.rarity.toUpperCase(), {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    });
    rarityText.setOrigin(0.5);
    rarityText.setDepth(1003);

    // Prize attributes display - show custom traits if available
    const customTraits = this.replayData.prizeWon.customTraits;
    const attrs = this.replayData.prizeWon.attributes;
    let attributeElements: Phaser.GameObjects.GameObject[] = [];
    
    if (customTraits && Object.keys(customTraits).length > 0) {
      // Display custom traits from backend (AI-generated)
      const attrY = centerY + 210;
      const traitLines = Object.entries(customTraits).map(([category, value]) => {
        // Convert snake_case to Title Case
        const displayCategory = category.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        const displayValue = value.replace(/_/g, ' ');
        return `${displayCategory}: ${displayValue}`;
      }).join('\n');
      
      const attrText = this.add.text(centerX - 220, attrY, traitLines, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ecf0f1',
        align: 'left',
        lineSpacing: 4
      });
      attrText.setDepth(1002);
      attributeElements.push(attrText);
    } else if (attrs) {
      // Fallback to old generic attributes
      const attrY = centerY + 210;
      const attrText = this.add.text(centerX - 220, attrY, 
        `Color: ${attrs.color}\n` +
        `Pattern: ${attrs.pattern}\n` +
        `Size: ${attrs.size}\n` +
        `Condition: ${attrs.condition}\n` +
        `ID: ${attrs.uniqueId}\n` +
        `Accuracy: ${attrs.grabAccuracy}%`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ecf0f1',
        align: 'left',
        lineSpacing: 4
      });
      attrText.setDepth(1002);
      attributeElements.push(attrText);
    }

    // Claim NFT button (moved down to make room for attributes)
    const buttonY = attrs ? centerY + 350 : centerY + 240;
    const claimButton = this.add.rectangle(centerX - 80, buttonY, 180, 60, 0xf39c12);
    claimButton.setDepth(1002);
    claimButton.setInteractive({ useHandCursor: true });
    
    const claimText = this.add.text(centerX - 80, buttonY, 'Claim as NFT', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    });
    claimText.setOrigin(0.5);
    claimText.setDepth(1003);

    // Close button
    const closeButton = this.add.rectangle(centerX + 80, buttonY, 180, 60, 0x95a5a6);
    closeButton.setDepth(1002);
    closeButton.setInteractive({ useHandCursor: true });
    
    const closeText = this.add.text(centerX + 80, buttonY, 'Close', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    });
    closeText.setOrigin(0.5);
    closeText.setDepth(1003);

    // Collect all elements for cleanup
    const allElements = [overlay, panel, congratsText, prizeImage, prizeNameText, 
                        rarityBadge, rarityText, ...attributeElements, 
                        claimButton, claimText, closeButton, closeText];

    // Button hover effects
    claimButton.on('pointerover', () => {
      claimButton.setFillStyle(0xe67e22);
    });
    claimButton.on('pointerout', () => {
      claimButton.setFillStyle(0xf39c12);
    });
    claimButton.on('pointerdown', async () => {
      console.log('🪙 NFT Claim clicked');
      console.log('Prize attributes:', this.replayData.prizeWon?.attributes);
      
      // Disable button and show loading
      claimButton.disableInteractive();
      claimButton.setFillStyle(0x95a5a6);
      claimText.setText('Claiming...');
      
      try {
        // Get claim functions from registry
        const submitWin = this.game.registry.get('submitWin');
        const claimPrize = this.game.registry.get('claimPrize');
        
        if (!submitWin || !claimPrize) {
          throw new Error('Claim functions not available');
        }
        
        if (!this.replayData.prizeWon) {
          throw new Error('No prize data available');
        }
        
        // Step 1: Submit win to backend to get signature
        claimText.setText('Validating win...');
        const prizeIdString = this.replayData.prizeWon.id;
        
        // Convert prize key to numeric ID by finding its index in prizeTypes array
        // Backend expects 1-based indexing (Prize ID 1 = first prize)
        const prizeIndex = this.prizeTypes.findIndex(p => p.key === prizeIdString);
        const prizeId = prizeIndex >= 0 ? prizeIndex + 1 : 1; // Default to 1 if not found
        
        console.log(`🎁 Prize key: ${prizeIdString} → Prize ID: ${prizeId}`);
        
        const winData = await submitWin(prizeId, this.replayData);
        
        if (!winData || !winData.voucher) {
          throw new Error('Failed to get win voucher from backend');
        }
        
        console.log('🎫 Win voucher received from backend:', winData);
        
        // Step 2: Call blockchain claimPrize with signature
        claimText.setText('Minting NFT...');
        console.log('📝 Calling claimPrize with:', {
          prizeId: winData.prizeId,
          metadataUri: winData.metadata.uri,
          replayDataHash: winData.metadata.replayDataHash,
          difficulty: winData.metadata.difficulty,
          nonce: winData.voucher.nonce,
          signature: winData.voucher.signature
        });
        
        const success = await claimPrize(
          winData.prizeId,
          winData.metadata.uri,
          winData.metadata.replayDataHash,
          winData.metadata.difficulty,
          winData.voucher.nonce,
          winData.voucher.signature
        );
        
        if (success) {
          claimText.setText('NFT Claimed! 🎉');
          console.log('✅ NFT claimed successfully!');
          
          // Wait a moment to show success, then close
          await new Promise(resolve => setTimeout(resolve, 2000));
          this.closeWinOverlay(allElements);
        } else {
          throw new Error('Failed to claim NFT on blockchain');
        }
        
      } catch (error) {
        console.error('Failed to claim NFT:', error);
        claimText.setText('Claim Failed ❌');
        claimButton.setFillStyle(0xe74c3c);
        
        // Re-enable after delay
        setTimeout(() => {
          claimButton.setInteractive({ useHandCursor: true });
          claimButton.setFillStyle(0xf39c12);
          claimText.setText('🪙 Claim NFT');
        }, 2000);
      }
    });

    closeButton.on('pointerover', () => {
      closeButton.setFillStyle(0x7f8c8d);
    });
    closeButton.on('pointerout', () => {
      closeButton.setFillStyle(0x95a5a6);
    });
    closeButton.on('pointerdown', () => {
      console.log('Close clicked - Returning to game');
      this.closeWinOverlay(allElements);
    });
  }

  private closeWinOverlay(elements: Phaser.GameObjects.GameObject[]) {
    console.log('Destroying overlay elements:', elements.length);
    elements.forEach(el => {
      if (el && !el.scene) {
        console.log('Element already destroyed');
      } else if (el) {
        el.destroy();
      }
    });
    this.resetGame();
    
    // Notify parent that game ended
    const onGameEnd = this.game.registry.get('onGameEnd');
    if (onGameEnd && typeof onGameEnd === 'function') {
      onGameEnd();
    }
  }

  private resetGame() {
    if (!this.claw || !this.cabinetConfig) return;

    const { clawStartPosition } = this.cabinetConfig;
    const cabinetScale = 2.0;

    // Reset to starting position from config
    this.clawState.x = clawStartPosition.x * cabinetScale;
    this.clawState.y = clawStartPosition.y * cabinetScale;
    this.clawState.z = 0;
    this.clawState.isGrabbing = false;
    this.clawState.isReturning = false;
    this.clawState.isMoving = false;

    // Apply proper transformation to position claw
    this.updateClawTransform();
    
    if (this.anims.exists('claw_idle')) {
      this.claw.play('claw_idle'); // Reset to open position
    }

    // Reset grabbed prizes
    this.prizes.forEach((prize) => {
      prize.setData('grabbed', false);
      prize.clearTint();
    });

    this.gameState = GameState.IDLE;
    this.startRecording();
  }

  private updateCablePosition() {
    if (!this.clawCable || !this.claw || !this.cabinetConfig) return;
    
    // Calculate cable start position (bottom of header - fixed)
    const cabinetScale = 2.0;
    const centerY = this.scale.height / 2;
    const cabinetHeight = this.cabinetConfig.enclosureDimensions.height * cabinetScale;
    const cabinetTop = centerY - cabinetHeight / 2;
    const headerHeight = 67 * cabinetScale;
    const cableStartY = cabinetTop + headerHeight;
    
    // No scaling - cable goes directly to claw position
    this.clawCable.setTo(this.claw.x, cableStartY, this.claw.x, this.claw.y);
    
    // Keep cable thickness constant
    this.clawCable.setLineWidth(3);
  }

  private updateStateUI() {
    const stateText = this.children.getByName('stateText') as Phaser.GameObjects.Text;
    if (stateText) {
      stateText.setText(`State: ${this.gameState}`);
    }

    const depthText = this.children.getByName('depthText') as Phaser.GameObjects.Text;
    if (depthText) {
      depthText.setText(`Depth: ${Math.round(this.clawState.y)}`);
    }
  }

  // Replay recording methods
  private startRecording() {
    this.isRecording = true;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.replayData = {
      sessionId,
      startTime: Date.now(),
      inputs: [],
      prizePositions: this.prizes.map((p) => ({
        id: p.getData('id'),
        x: p.x,
        y: p.y,
        z: 0, // Will add proper 3D positioning in Phase D
      })),
      result: 'loss',
      physicsData: {
        clawPath: [],
        prizePosition: { x: 0, y: 0, z: 0 },
        grabForce: 0,
        dropHeight: 0
      }
    };
  }

  private recordInput(direction: 'left' | 'right' | 'forward' | 'backward' | 'drop') {
    if (!this.isRecording) return;

    this.replayData.inputs.push({
      timestamp: Date.now() - this.replayData.startTime,
      direction,
    });
    
    // Record claw position for physics validation
    if (this.replayData.physicsData && this.claw) {
      this.replayData.physicsData.clawPath.push({
        x: this.claw.x,
        y: this.claw.y,
        timestamp: Date.now() - this.replayData.startTime
      });
    }
  }

  private stopRecording() {
    this.isRecording = false;
    // TODO: Send to backend for IPFS storage
  }

  private generatePrizeAttributes(prizeId: string, rarity: string, grabAccuracy: number): PrizeData['attributes'] {
    const colors = ['Ruby Red', 'Sapphire Blue', 'Emerald Green', 'Golden Yellow', 'Amethyst Purple', 'Pearl White', 'Onyx Black', 'Rose Pink'];
    const patterns = ['Striped', 'Spotted', 'Solid', 'Gradient', 'Sparkly', 'Metallic', 'Holographic', 'Iridescent'];
    const sizes = ['Tiny', 'Small', 'Medium', 'Large', 'Jumbo'];
    const conditions = ['Pristine', 'Excellent', 'Good', 'Fair'];
    
    // Rarity affects attribute quality
    const rarityMultiplier = {
      'common': 0.5,
      'uncommon': 0.7,
      'rare': 0.85,
      'legendary': 1.0
    }[rarity] || 0.5;
    
    // Better grab accuracy can yield better condition
    const conditionIndex = Math.floor(Math.random() * conditions.length * (1 - grabAccuracy * rarityMultiplier));
    
    return {
      color: colors[Math.floor(Math.random() * colors.length)],
      pattern: patterns[Math.floor(Math.random() * patterns.length)],
      size: sizes[Math.floor(Math.random() * sizes.length)],
      condition: conditions[Math.min(conditionIndex, conditions.length - 1)],
      uniqueId: `TT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      mintDate: Date.now(),
      tokensSpent: 1, // TODO: Get from actual game state
      grabAccuracy: Math.round(grabAccuracy * 100)
    };
  }

  public getReplayData(): ReplayData {
    return this.replayData;
  }
}
