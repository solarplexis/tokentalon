/**
 * Web3 integration exports
 */

export { Web3Provider } from './provider';
export { config, CONTRACTS, API_BASE_URL, API_ENDPOINTS } from './config';
export { GAMETOKEN_ABI, PRIZENFT_ABI, CLAWMACHINE_ABI } from './abis';
export {
  useTokenBalance,
  useTokenAllowance,
  useApproveTokens,
  useGameCost,
  useStartGame,
  useClaimPrize,
  useGameSession,
  usePlayerStats,
  useNFTBalance,
  useNFTByIndex,
  useTransactionConfirmation,
} from './hooks';
export { useGameFlow } from './useGameFlow';
export type { GameState } from './useGameFlow';
