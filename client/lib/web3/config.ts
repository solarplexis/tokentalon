import { http, createConfig } from 'wagmi';
import { sepolia, polygonAmoy } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
// Import auto-generated contract addresses from deployment system
import { CONTRACTS as DEPLOYED_CONTRACTS } from '../contracts/addresses';

// Contract addresses - sourced from auto-generated deployment files
// These are automatically updated when contracts are deployed via:
//   cd common && npm run deploy:sepolia
export const CONTRACTS = {
  // Use auto-generated addresses from deployment system
  ...DEPLOYED_CONTRACTS,

  // Fallback to env vars for networks not yet deployed
  sepolia: DEPLOYED_CONTRACTS.sepolia || {
    gameToken: (process.env.NEXT_PUBLIC_SEPOLIA_GAMETOKEN_ADDRESS || '') as `0x${string}`,
    prizeNFT: (process.env.NEXT_PUBLIC_SEPOLIA_PRIZENFT_ADDRESS || '') as `0x${string}`,
    clawMachine: (process.env.NEXT_PUBLIC_SEPOLIA_CLAWMACHINE_ADDRESS || '') as `0x${string}`,
  },
  polygonAmoy: {
    gameToken: (process.env.NEXT_PUBLIC_AMOY_GAMETOKEN_ADDRESS || '') as `0x${string}`,
    prizeNFT: (process.env.NEXT_PUBLIC_AMOY_PRIZENFT_ADDRESS || '') as `0x${string}`,
    clawMachine: (process.env.NEXT_PUBLIC_AMOY_CLAWMACHINE_ADDRESS || '') as `0x${string}`,
  },
} as const;

// WalletConnect project ID (get from https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Create connectors once at module level
// Only create WalletConnect on client-side to avoid IndexedDB errors during SSR
const getConnectors = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return [];
  }

  if (projectId) {
    return [
      walletConnect({
        projectId,
        showQrModal: true,
        metadata: {
          name: 'TokenTalon',
          description: 'Play claw machine games and win NFT prizes',
          url: 'https://tokentalon.com',
          icons: ['https://tokentalon.com/icon.png'],
        },
      }),
    ];
  }
  return [
    injected({
      shimDisconnect: true,
    }),
  ];
};

// Create config once at module level
export const config = createConfig({
  chains: [sepolia, polygonAmoy],
  connectors: getConnectors(),
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

// Backend API configuration
// Now using Next.js API routes (same origin), so no need for full URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
