'use client';

import { useAccount, useReadContract } from 'wagmi';
import { CONTRACTS } from '@/lib/web3';
import { sepolia } from 'wagmi/chains';
import { FaucetControls } from './FaucetControls';
import { SystemStats } from './SystemStats';

const GAMETOKEN_ABI = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function AdminDashboard() {
  const { address, chain, isConnected } = useAccount();
  const chainId = chain?.id || sepolia.id;
  const tokenAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.gameToken
    : CONTRACTS.polygonAmoy.gameToken;

  // Check if connected wallet is the contract owner
  const { data: owner, isLoading: isLoadingOwner } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'owner',
  });

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-4">Admin Dashboard</h1>
          <p className="text-purple-200 mb-6">
            Please connect your wallet to access the admin dashboard.
          </p>
          <div className="text-sm text-purple-300">
            Only the contract owner can access this page.
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Verifying permissions...</div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center border border-red-500/50">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-red-300 mb-4">
            You are not the contract owner.
          </p>
          <div className="text-sm text-purple-300 space-y-1">
            <div>Your address: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
            <div>Owner address: {owner?.slice(0, 6)}...{owner?.slice(-4)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-purple-200">
            Manage TokenTalon system parameters and view statistics
          </p>
          <div className="mt-2 text-sm text-purple-300">
            Connected as owner: {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Statistics */}
          <div className="lg:col-span-2">
            <SystemStats />
          </div>

          {/* Faucet Controls */}
          <div className="lg:col-span-2">
            <FaucetControls />
          </div>

          {/* Future: Game Controls */}
          {/* <div>
            <GameControls />
          </div> */}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-purple-400">
          <p>TokenTalon Admin Dashboard v1.0</p>
          <p className="mt-1">Always verify transactions before confirming</p>
        </div>
      </div>
    </div>
  );
}
