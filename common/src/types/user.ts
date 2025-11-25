/**
 * User-related type definitions
 */

export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  createdAt: number;
  stats: UserStats;
}

export interface UserStats {
  totalPlays: number;
  totalWins: number;
  totalLosses: number;
  tokensSpent: number;
  nftsOwned: number;
  winRate: number;
  lastPlayedAt?: number;
}

export interface Leaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  entries: LeaderboardEntry[];
  updatedAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  username?: string;
  score: number;
  wins: number;
  plays: number;
}
