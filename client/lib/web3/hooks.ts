import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from './config';
import { GAMETOKEN_ABI, PRIZENFT_ABI, CLAWMACHINE_ABI } from './abis';
import { sepolia } from 'wagmi/chains';

/**
 * Hook to read GameToken balance
 */
export function useTokenBalance(address: `0x${string}` | undefined, chainId: number = sepolia.id) {
  const contract = chainId === sepolia.id ? CONTRACTS.sepolia.gameToken : CONTRACTS.polygonAmoy.gameToken;
  
  return useReadContract({
    address: contract,
    abi: GAMETOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 3000, // Refetch every 3 seconds to catch balance changes
    },
  });
}

/**
 * Hook to check token allowance
 */
export function useTokenAllowance(
  owner: `0x${string}` | undefined,
  spender: `0x${string}`,
  chainId: number = sepolia.id
) {
  const contract = chainId === sepolia.id ? CONTRACTS.sepolia.gameToken : CONTRACTS.polygonAmoy.gameToken;
  
  return useReadContract({
    address: contract,
    abi: GAMETOKEN_ABI,
    functionName: 'allowance',
    args: owner ? [owner, spender] : undefined,
    query: {
      enabled: !!owner,
    },
  });
}

/**
 * Hook to approve token spending
 */
export function useApproveTokens(chainId: number = sepolia.id) {
  const contract = chainId === sepolia.id ? CONTRACTS.sepolia.gameToken : CONTRACTS.polygonAmoy.gameToken;
  
  return useWriteContract();
}

/**
 * Hook to get game cost
 */
export function useGameCost(chainId: number = sepolia.id) {
  const contract = chainId === sepolia.id ? CONTRACTS.sepolia.clawMachine : CONTRACTS.polygonAmoy.clawMachine;
  
  return useReadContract({
    address: contract,
    abi: CLAWMACHINE_ABI,
    functionName: 'costPerPlay',
    query: {
      retry: 3,
      retryDelay: 1000,
    },
  });
}

/**
 * Hook to start a new game
 */
export function useStartGame(chainId: number = sepolia.id) {
  return useWriteContract();
}

/**
 * Hook to claim a prize
 */
export function useClaimPrize(chainId: number = sepolia.id) {
  return useWriteContract();
}

/**
 * Hook to get game session details
 */
export function useGameSession(sessionId: bigint | undefined, chainId: number = sepolia.id) {
  const contract = chainId === sepolia.id ? CONTRACTS.sepolia.clawMachine : CONTRACTS.polygonAmoy.clawMachine;
  
  return useReadContract({
    address: contract,
    abi: CLAWMACHINE_ABI,
    functionName: 'getGameSession',
    args: sessionId !== undefined ? [sessionId] : undefined,
    query: {
      enabled: sessionId !== undefined,
    },
  });
}

/**
 * Hook to get player stats
 */
export function usePlayerStats(address: `0x${string}` | undefined, chainId: number = sepolia.id) {
  const contract = chainId === sepolia.id ? CONTRACTS.sepolia.clawMachine : CONTRACTS.polygonAmoy.clawMachine;
  
  return useReadContract({
    address: contract,
    abi: CLAWMACHINE_ABI,
    functionName: 'getPlayerStats',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Hook to get NFT balance
 */
export function useNFTBalance(address: `0x${string}` | undefined, chainId: number = sepolia.id) {
  const contract = chainId === sepolia.id ? CONTRACTS.sepolia.prizeNFT : CONTRACTS.polygonAmoy.prizeNFT;
  
  return useReadContract({
    address: contract,
    abi: PRIZENFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Hook to get NFT by owner index
 */
export function useNFTByIndex(
  address: `0x${string}` | undefined,
  index: bigint,
  chainId: number = sepolia.id
) {
  const contract = chainId === sepolia.id ? CONTRACTS.sepolia.prizeNFT : CONTRACTS.polygonAmoy.prizeNFT;
  
  return useReadContract({
    address: contract,
    abi: PRIZENFT_ABI,
    functionName: 'tokenOfOwnerByIndex',
    args: address ? [address, index] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Hook to wait for transaction confirmation
 */
export function useTransactionConfirmation(hash: `0x${string}` | undefined) {
  return useWaitForTransactionReceipt({
    hash,
  });
}
