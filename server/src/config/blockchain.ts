import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Blockchain Configuration
 * Contract addresses and ABIs for TokenTalon smart contracts
 */

// Network Configuration
export const NETWORK_CONFIG = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io'
  },
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com'
  },
  amoy: {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    rpcUrl: process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    explorer: 'https://amoy.polygonscan.com'
  }
};

// Contract Addresses (Update after deployment)
export const CONTRACT_ADDRESSES = {
  sepolia: {
    gameToken: process.env.SEPOLIA_GAMETOKEN_ADDRESS || '',
    prizeNFT: process.env.SEPOLIA_PRIZENFT_ADDRESS || '',
    clawMachine: process.env.SEPOLIA_CLAWMACHINE_ADDRESS || ''
  },
  polygon: {
    gameToken: process.env.POLYGON_GAMETOKEN_ADDRESS || '',
    prizeNFT: process.env.POLYGON_PRIZENFT_ADDRESS || '',
    clawMachine: process.env.POLYGON_CLAWMACHINE_ADDRESS || ''
  },
  amoy: {
    gameToken: process.env.AMOY_GAMETOKEN_ADDRESS || '',
    prizeNFT: process.env.AMOY_PRIZENFT_ADDRESS || '',
    clawMachine: process.env.AMOY_CLAWMACHINE_ADDRESS || ''
  }
};

// Contract ABIs (Essential functions only)
export const GAMETOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function buyTokens() payable',
  'function tokenPrice() view returns (uint256)',
  'event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost)'
];

export const PRIZENFT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function tokensOfOwner(address owner) view returns (uint256[])',
  'function getPrizeInfo(uint256 tokenId) view returns (tuple(uint256 prizeId, string replayDataHash, uint8 difficulty, uint256 tokensSpent, uint256 timestamp))',
  'event PrizeMinted(address indexed winner, uint256 indexed tokenId, uint256 prizeId)'
];

export const CLAWMACHINE_ABI = [
  'function startGame()',
  'function claimPrize(uint256 prizeId, string metadataUri, string replayDataHash, uint8 difficulty, uint256 nonce, bytes signature)',
  'function forfeitGame()',
  'function costPerPlay() view returns (uint256)',
  'function oracleAddress() view returns (address)',
  'function getGameSession(address player) view returns (tuple(uint256 tokensEscrowed, uint256 timestamp, bool active))',
  'function isVoucherUsed(bytes32 voucherHash) view returns (bool)',
  'event GameStarted(address indexed player, uint256 tokensEscrowed)',
  'event PrizeClaimed(address indexed player, uint256 indexed tokenId, uint256 prizeId, bytes32 voucherHash)'
];

// Get provider for specified network
export function getProvider(network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia'): ethers.JsonRpcProvider {
  const config = NETWORK_CONFIG[network];
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

// Get contract instances
export function getContracts(network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia', signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider(network);
  const addresses = CONTRACT_ADDRESSES[network];

  return {
    gameToken: new ethers.Contract(addresses.gameToken, GAMETOKEN_ABI, provider),
    prizeNFT: new ethers.Contract(addresses.prizeNFT, PRIZENFT_ABI, provider),
    clawMachine: new ethers.Contract(addresses.clawMachine, CLAWMACHINE_ABI, provider)
  };
}

// Oracle wallet (backend signer)
export function getOracleWallet(network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia'): ethers.Wallet {
  const privateKey = process.env.ORACLE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ORACLE_PRIVATE_KEY not found in environment variables');
  }
  const provider = getProvider(network);
  return new ethers.Wallet(privateKey, provider);
}

// Validate blockchain configuration
export function validateConfig(network: 'sepolia' | 'polygon' | 'amoy' = 'sepolia'): boolean {
  const addresses = CONTRACT_ADDRESSES[network];
  
  if (!addresses.gameToken || !addresses.prizeNFT || !addresses.clawMachine) {
    console.warn(`⚠️  Contract addresses not configured for ${network}`);
    return false;
  }

  if (!process.env.ORACLE_PRIVATE_KEY) {
    console.error('❌ ORACLE_PRIVATE_KEY not configured');
    return false;
  }

  return true;
}
