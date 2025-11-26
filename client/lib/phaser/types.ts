export interface ClawState {
  x: number;
  y: number;
  z: number; // Add depth coordinate
  isGrabbing: boolean;
  isReturning: boolean;
  isMoving: boolean;
}

export interface PrizeData {
  id: string;
  type: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  value: number;
  position3D?: { x: number; y: number; z: number }; // Add 3D position tracking
  attributes?: {
    color?: string;
    pattern?: string;
    size?: string;
    condition?: string;
    uniqueId?: string;
    mintDate?: number;
    tokensSpent?: number;
    grabAccuracy?: number;
  };
}

export interface GameInput {
  timestamp: number;
  direction: 'left' | 'right' | 'forward' | 'backward' | 'drop' | null;
}

export interface ReplayData {
  startTime: number;
  inputs: GameInput[];
  prizePositions: Array<{ id: string; x: number; y: number; z: number }>; // Now includes Z
  result: 'win' | 'loss';
  prizeWon?: PrizeData;
}

export enum GameState {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  DROPPING = 'DROPPING',
  GRABBING = 'GRABBING',
  RETURNING = 'RETURNING',
  COMPLETE = 'COMPLETE',
}
