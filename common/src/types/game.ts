/**
 * Game-related type definitions
 */

export interface Prize {
  id: string;
  type: 'animal' | 'doll' | 'plushie' | 'figure';
  baseAsset: string; // URL or IPFS hash to base image/3D model
  customization: PrizeCustomization;
  difficulty: number; // 1-10 scale
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface PrizeCustomization {
  colorPalette: string[];
  patternOverlay?: string;
  sizeVariation: number; // 0.8 - 1.2 scale
  accessories?: string[];
  glowEffect?: boolean;
}

export interface ClawData {
  sessionId: string;
  positions: ClawPosition[];
  collisions: CollisionEvent[];
  grabSuccess: boolean;
  timestamp: number;
}

export interface ClawPosition {
  x: number;
  y: number;
  rotation: number;
  time: number; // milliseconds from start
}

export interface CollisionEvent {
  time: number;
  prizeId: string;
  force: number;
  position: { x: number; y: number };
}

export interface GameSession {
  id: string;
  playerId: string;
  walletAddress: string;
  prizeId: string;
  tokensSpent: number;
  startTime: number;
  endTime?: number;
  result: 'win' | 'loss' | 'in_progress';
  clawData?: ClawData;
}

export interface ReplayData {
  sessionId: string;
  prizeId: string;
  clawData: ClawData;
  prizeCustomization: PrizeCustomization;
  metadata: {
    difficulty: number;
    tokensSpent: number;
    timestamp: number;
  };
}
