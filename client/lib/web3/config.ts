import { http, createConfig } from 'wagmi';
import { sepolia, polygonAmoy } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Contract addresses from deployment
export const CONTRACTS = {
  sepolia: {
    gameToken: '0xba2300B8c318b8054D7Bd688ADFd659bD4EBECc2' as `0x${string}`,
    prizeNFT: process.env.NEXT_PUBLIC_SEPOLIA_PRIZENFT_ADDRESS as `0x${string}`,
    clawMachine: process.env.NEXT_PUBLIC_SEPOLIA_CLAWMACHINE_ADDRESS as `0x${string}`,
  },
  polygonAmoy: {
    gameToken: process.env.NEXT_PUBLIC_AMOY_GAMETOKEN_ADDRESS as `0x${string}`,
    prizeNFT: process.env.NEXT_PUBLIC_AMOY_PRIZENFT_ADDRESS as `0x${string}`,
    clawMachine: process.env.NEXT_PUBLIC_AMOY_CLAWMACHINE_ADDRESS as `0x${string}`,
  },
} as const;

// WalletConnect project ID (get from https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Create config - only initialize once
let configInstance: ReturnType<typeof createConfig> | null = null;

export const getConfig = () => {
  if (configInstance) return configInstance;
  
  configInstance = createConfig({
    chains: [sepolia, polygonAmoy],
    connectors: [
      injected({ target: 'metaMask' }),
      ...(projectId ? [walletConnect({ projectId })] : []),
    ],
    transports: {
      [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com', {
        timeout: 30_000,
        retryCount: 3,
        retryDelay: 1_000,
      }),
      [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology', {
        timeout: 30_000,
        retryCount: 3,
        retryDelay: 1_000,
      }),
    },
  });
  
  return configInstance;
};

export const config = getConfig();

// Backend API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  game: {
    start: `${API_BASE_URL}/api/game/start`,
    submitWin: `${API_BASE_URL}/api/game/submit-win`,
    getSession: (id: string) => `${API_BASE_URL}/api/game/session/${id}`,
    getPlayerGames: (address: string) => `${API_BASE_URL}/api/game/player/${address}`,
  },
  nft: {
    metadata: (tokenId: string) => `${API_BASE_URL}/api/nft/${tokenId}/metadata`,
    replay: (tokenId: string) => `${API_BASE_URL}/api/nft/${tokenId}/replay`,
    info: (tokenId: string) => `${API_BASE_URL}/api/nft/${tokenId}/info`,
    collection: (address: string) => `${API_BASE_URL}/api/nft/collection/${address}`,
  },
} as const;
