import { CabinetConfig } from './utils/cabinet';

/**
 * Cabinet Configuration Loader
 */
export class CabinetLoader {
  private static config: CabinetConfig | null = null;

  /**
   * Load cabinet configuration from JSON file
   * @param scene - Phaser scene instance
   * @returns Promise that resolves with the config
   */
  static async load(scene: Phaser.Scene): Promise<CabinetConfig> {
    // If already loaded, return cached config
    if (this.config) {
      return this.config as CabinetConfig;
    }

    try {
      const response = await fetch('/assets/cabinet.json');
      if (!response.ok) {
        throw new Error(`Failed to load cabinet config: ${response.statusText}`);
      }

      this.config = await response.json();
      console.log('✅ Cabinet configuration loaded:', this.config);
      
      return this.config as CabinetConfig;
    } catch (error) {
      console.error('❌ Error loading cabinet configuration:', error);
      
      // Return default fallback config
      return this.getDefaultConfig();
    }
  }

  /**
   * Get the cached configuration (must call load first)
   */
  static getConfig(): CabinetConfig | null {
    return this.config;
  }

  /**
   * Clear cached configuration
   */
  static clear(): void {
    this.config = null;
  }

  /**
   * Get default fallback configuration
   */
  private static getDefaultConfig(): CabinetConfig {
    console.warn('⚠️ Using default cabinet configuration');
    
    return {
      name: 'Default Cabinet',
      enclosureImage: '/assets/images/cabinet/claw_machine_enclosure.png',
      enclosureDimensions: {
        width: 500,
        height: 500,
      },
      playArea: {
        x: {
          front: { min: 80, max: 420 },
          back: { min: 130, max: 370 },
        },
        y: { min: 120, max: 420 },
      },
      dropBox: {
        x: {
          front: { min: 200, max: 300 },
          back: { min: 220, max: 280 },
        },
        y: { min: 400, max: 480 },
        isExclusionZone: true,
      },
      clawStartPosition: {
        x: 250,
        y: 270,
      },
      clawIdleY: 90,
      visualMapping: {
        clawIdleHeight: {
          y: {
            back: 75,
            front: 140,
          },
        },
        basinFloor: {
          y: {
            back: 192,
            front: 240,
          },
        },
        prizeFloor: {
          y: {
            back: 200,
            front: 248,
          },
        },
      },
      depthRendering: {
        scaleAtFront: 1.2,
        scaleAtBack: 0.95,
        yOffsetMultiplier: 0.8,
      },
      physics: {
        clawSpeed: {
          horizontal: 150,
          depth: 100,
        },
        grabRadius: 35,
        grabDepthTolerance: 15,
      },
      rendering: {
        sortByDepth: true,
        shadowEnabled: true,
        shadowOpacity: 0.3,
      },
      prizes: {
        minCount: 8,
        maxCount: 15,
        spawnPadding: 40,
      },
    };
  }
}
