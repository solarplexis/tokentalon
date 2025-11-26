/**
 * Cabinet Configuration Types
 */

export interface CabinetConfig {
  name: string;
  enclosureImage: string;
  enclosureDimensions: {
    width: number;
    height: number;
  };
  playArea: {
    x: {
      front: { min: number; max: number };
      back: { min: number; max: number };
    };
    y: { min: number; max: number };
  };
  dropBox: {
    x: {
      front: { min: number; max: number };
      back: { min: number; max: number };
    };
    y: { min: number; max: number };
    isExclusionZone: boolean;
  };
  clawStartPosition: {
    x: number;
    y: number;
  };
  clawIdleY: number;
  visualMapping: {
    clawIdleHeight: {
      y: {
        back: number;
        front: number;
      };
    };
    basinFloor: {
      y: {
        back: number;
        front: number;
      };
    };
    prizeFloor: {
      y: {
        back: number;
        front: number;
      };
    };
  };
  depthRendering: {
    scaleAtFront: number;
    scaleAtBack: number;
    yOffsetMultiplier: number;
  };
  physics: {
    clawSpeed: {
      horizontal: number;
      depth: number;
    };
    grabRadius: number;
    grabDepthTolerance: number;
  };
  rendering: {
    sortByDepth: boolean;
    shadowEnabled: boolean;
    shadowOpacity: number;
  };
  prizes: {
    minCount: number;
    maxCount: number;
    spawnPadding: number;
  };
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Position2D {
  x: number;
  y: number;
}

export interface ScaledSprite {
  sprite: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite;
  position3D: Position3D;
  baseScale: number;
}

/**
 * Depth Calculation Utilities
 */
export class DepthUtils {
  /**
   * Calculate sprite scale based on Y-depth (2D perspective)
   * @param y - Depth value (191 = back/far, 280 = front/near)
   * @param config - Cabinet configuration
   * @returns Scale multiplier
   */
  static calculateScale(y: number, config: CabinetConfig): number {
    const { scaleAtBack, scaleAtFront } = config.depthRendering;
    const { min: yMin, max: yMax } = config.playArea.y;

    // Normalize Y to 0-1 range (0 = back, 1 = front)
    const normalizedY = (y - yMin) / (yMax - yMin);

    // Linear interpolation between back and front scales
    return scaleAtBack + normalizedY * (scaleAtFront - scaleAtBack);
  }

  /**
   * Interpolate X boundaries based on Y-depth for perspective
   * @param y - Depth value
   * @param config - Cabinet configuration
   * @returns X min/max boundaries at this depth
   */
  static getXBoundsAtDepth(y: number, config: CabinetConfig): { min: number; max: number } {
    const { playArea } = config;
    const { min: yMin, max: yMax } = playArea.y;
    
    // Normalize Y to 0-1 range
    const normalizedY = (y - yMin) / (yMax - yMin);
    
    // Interpolate X boundaries
    const xMin = playArea.x.back.min + normalizedY * (playArea.x.front.min - playArea.x.back.min);
    const xMax = playArea.x.back.max + normalizedY * (playArea.x.front.max - playArea.x.back.max);
    
    return { min: xMin, max: xMax };
  }

  /**
   * Calculate Y-offset based on depth for perspective effect
   * @param y - Depth value
   * @param config - Cabinet configuration
   * @returns Y-offset in pixels (always 0 for top-down view)
   */
  static calculateYOffset(y: number, config: CabinetConfig): number {
    // In top-down view, Y is already the visual position
    return 0;
  }

  /**
   * Calculate rendering depth (z-index) for proper layering
   * @param y - Depth value (higher Y = closer to player = render on top)
   * @returns Depth value for Phaser
   */
  static calculateRenderDepth(y: number): number {
    return Math.floor(y);
  }

  /**
   * Check if a position is within the play area
   * @param pos - 2D position to check
   * @param config - Cabinet configuration
   * @returns True if position is valid
   */
  static isInPlayArea(pos: Position2D, config: CabinetConfig): boolean {
    const { playArea } = config;
    const xBounds = this.getXBoundsAtDepth(pos.y, config);
    
    return (
      pos.x >= xBounds.min &&
      pos.x <= xBounds.max &&
      pos.y >= playArea.y.min &&
      pos.y <= playArea.y.max
    );
  }

  /**
   * Check if a position is inside the drop box exclusion zone
   * @param pos - 2D position to check
   * @param config - Cabinet configuration
   * @returns True if inside drop box
   */
  static isInDropBox(pos: Position2D, config: CabinetConfig): boolean {
    const { dropBox } = config;
    
    // Check if in Y range
    if (pos.y < dropBox.y.min || pos.y > dropBox.y.max) {
      return false;
    }
    
    // Interpolate X boundaries at this Y
    const { min: yMin, max: yMax } = dropBox.y;
    const normalizedY = (pos.y - yMin) / (yMax - yMin);
    const xMin = dropBox.x.back.min + normalizedY * (dropBox.x.front.min - dropBox.x.back.min);
    const xMax = dropBox.x.back.max + normalizedY * (dropBox.x.front.max - dropBox.x.back.max);
    
    return pos.x >= xMin && pos.x <= xMax;
  }

  /**
   * Calculate 2D distance between two positions
   * @param pos1 - First position
   * @param pos2 - Second position
   * @returns Distance
   */
  static distance2D(pos1: Position2D, pos2: Position2D): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if claw can grab a prize (within radius and depth tolerance)
   * @param clawPos - Claw position
   * @param prizePos - Prize position
   * @param config - Cabinet configuration
   * @returns True if grab is possible
   */
  static canGrab(clawPos: Position2D, prizePos: Position2D, config: CabinetConfig): boolean {
    const { grabRadius, grabDepthTolerance } = config.physics;

    // Check XY distance
    const distance = this.distance2D(clawPos, prizePos);
    return distance <= grabRadius;
  }
}

/**
 * Coordinate Transformation Utilities
 */
export class CoordinateUtils {
  /**
   * Transform 2D position to screen coordinates with perspective
   * @param pos - 2D position in game space
   * @param config - Cabinet configuration
   * @returns Object with x, y, scale for rendering
   */
  static to2D(
    pos: Position2D,
    config: CabinetConfig,
    mode: 'idle' | 'drop' | 'prize' = 'idle'
  ): { x: number; y: number; scale: number; depth: number } {
    const scale = DepthUtils.calculateScale(pos.y, config);
    const { playArea, visualMapping } = config;
    const { min: yMin, max: yMax } = playArea.y;
    const normalizedDepth = (pos.y - yMin) / (yMax - yMin); // 0 = back, 1 = front
    
    let screenY: number;
    if (mode === 'idle') {
      // In idle state, interpolate between back and front idle heights
      const { back: idleBack, front: idleFront } = visualMapping.clawIdleHeight.y;
      screenY = idleBack + normalizedDepth * (idleFront - idleBack);
    } else if (mode === 'prize') {
      // For prizes, use prize floor positioning
      const { back: prizeBack, front: prizeFront } = visualMapping.prizeFloor.y;
      screenY = prizeBack + normalizedDepth * (prizeFront - prizeBack);
    } else {
      // When dropping, interpolate based on basin floor
      const { back: basinBack, front: basinFront } = visualMapping.basinFloor.y;
      screenY = basinBack + normalizedDepth * (basinFront - basinBack);
    }

    return {
      x: pos.x,
      y: screenY,
      scale,
      depth: DepthUtils.calculateRenderDepth(pos.y),
    };
  }

  /**
   * Apply 2D position to a Phaser sprite
   * @param sprite - Phaser sprite to update
   * @param pos - 2D position to apply
   * @param config - Cabinet configuration
   */
  static applySpriteTransform(
    sprite: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite,
    pos: Position2D,
    config: CabinetConfig,
    baseScale: number = 1
  ): void {
    const transformed = this.to2D(pos, config);
    
    sprite.setPosition(transformed.x, transformed.y);
    sprite.setScale(transformed.scale * baseScale);
    sprite.setDepth(transformed.depth);
  }

  /**
   * Generate random 2D position within play area (avoiding drop box)
   * @param config - Cabinet configuration
   * @param attempts - Max attempts to find valid position
   * @returns Random valid 2D position
   */
  static getRandomPosition(config: CabinetConfig, attempts: number = 50): Position2D {
    const { playArea, prizes } = config;

    for (let i = 0; i < attempts; i++) {
      // Generate random Y (depth) first
      const y = Phaser.Math.Between(
        playArea.y.min + prizes.spawnPadding,
        playArea.y.max - prizes.spawnPadding
      );
      
      // Get X boundaries at this Y for perspective
      const xBounds = DepthUtils.getXBoundsAtDepth(y, config);
      
      const pos: Position2D = {
        x: Phaser.Math.Between(
          xBounds.min + prizes.spawnPadding,
          xBounds.max - prizes.spawnPadding
        ),
        y,
      };

      // Check if position is valid (not in drop box)
      if (!DepthUtils.isInDropBox(pos, config)) {
        return pos;
      }
    }

    // Fallback: return center position at mid-depth
    const midY = (playArea.y.min + playArea.y.max) / 2;
    const xBoundsAtMid = DepthUtils.getXBoundsAtDepth(midY, config);
    return {
      x: (xBoundsAtMid.min + xBoundsAtMid.max) / 2,
      y: midY,
    };
  }

  /**
   * Clamp position to play area boundaries
   * @param pos - Position to clamp
   * @param config - Cabinet configuration
   * @returns Clamped position
   */
  static clampToPlayArea(pos: Position2D, config: CabinetConfig): Position2D {
    const { playArea } = config;
    
    // Clamp Y first
    const clampedY = Phaser.Math.Clamp(pos.y, playArea.y.min, playArea.y.max);
    
    // Get X boundaries at clamped Y
    const xBounds = DepthUtils.getXBoundsAtDepth(clampedY, config);
    
    return {
      x: Phaser.Math.Clamp(pos.x, xBounds.min, xBounds.max),
      y: clampedY,
    };
  }
}
