'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS } from '@/lib/web3';
import { sepolia } from 'wagmi/chains';
import { useTranslations } from 'next-intl';

const GAMETOKEN_ABI = [
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_SUPPLY',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const CLAWMACHINE_ABI = [
  {
    inputs: [],
    name: 'costPerPlay',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function SystemStats() {
  const t = useTranslations('admin');
  const { chain } = useAccount();
  const chainId = chain?.id || sepolia.id;
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const tokenAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.gameToken
    : CONTRACTS.polygonAmoy.gameToken;

  const clawMachineAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.clawMachine
    : CONTRACTS.polygonAmoy.clawMachine;

  const copyToClipboard = async (address: string, label: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(label);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // GameToken stats
  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'totalSupply',
  });

  const { data: maxSupply } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'MAX_SUPPLY',
  });

  const { data: tokenPrice } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'tokenPrice',
  });

  // ClawMachine stats
  const { data: costPerPlay } = useReadContract({
    address: clawMachineAddress,
    abi: CLAWMACHINE_ABI,
    functionName: 'costPerPlay',
  });

  // Contract balances
  const { data: gameTokenBalance } = useBalance({
    address: tokenAddress,
  });

  const { data: clawMachineBalance } = useBalance({
    address: clawMachineAddress,
  });

  const supplyPercentage = totalSupply && maxSupply
    ? (Number(totalSupply) / Number(maxSupply)) * 100
    : 0;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-4">System Statistics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Supply */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">Total Supply</div>
          <div className="text-white text-2xl font-bold">
            {totalSupply ? formatEther(totalSupply) : '...'}
          </div>
          <div className="text-purple-400 text-xs mt-1">
            {maxSupply && `Max: ${formatEther(maxSupply)}`}
          </div>
          <div className="mt-2">
            <div className="w-full bg-purple-900/50 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(supplyPercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-purple-300 mt-1">
              {supplyPercentage.toFixed(2)}% of max supply
            </div>
          </div>
        </div>

        {/* Token Price */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">Token Price</div>
          <div className="text-white text-2xl font-bold">
            {tokenPrice ? formatEther(tokenPrice) : '...'} ETH
          </div>
          <div className="text-purple-400 text-xs mt-1">per TALON</div>
        </div>

        {/* Game Cost */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">Cost Per Play</div>
          <div className="text-white text-2xl font-bold">
            {costPerPlay ? formatEther(costPerPlay) : '...'}
          </div>
          <div className="text-purple-400 text-xs mt-1">TALON tokens</div>
        </div>

        {/* Network */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">Network</div>
          <div className="text-white text-2xl font-bold capitalize">
            {chain?.name || 'Unknown'}
          </div>
          <div className="text-purple-400 text-xs mt-1">Chain ID: {chainId}</div>
        </div>

        {/* GameToken Contract Balance */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">GameToken ETH</div>
          <div className="text-white text-2xl font-bold">
            {gameTokenBalance ? parseFloat(formatEther(gameTokenBalance.value)).toFixed(4) : '0'} ETH
          </div>
          <div className="text-purple-400 text-xs mt-1">Contract balance</div>
        </div>

        {/* ClawMachine Contract Balance */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">ClawMachine ETH</div>
          <div className="text-white text-2xl font-bold">
            {clawMachineBalance ? parseFloat(formatEther(clawMachineBalance.value)).toFixed(4) : '0'} ETH
          </div>
          <div className="text-purple-400 text-xs mt-1">Contract balance</div>
        </div>

        {/* Contract Addresses */}
        <div className="bg-black/20 rounded-lg p-4 md:col-span-2">
          <div className="text-purple-300 text-sm mb-2">{t('contractAddresses')}</div>
          <div className="space-y-1 text-xs">
            <div className="text-white flex items-center gap-2">
              <span className="text-purple-400">GameToken:</span>{' '}
              <span className="font-mono">
                {tokenAddress?.slice(0, 10)}...{tokenAddress?.slice(-8)}
              </span>
              <button
                onClick={() => copyToClipboard(tokenAddress, 'gameToken')}
                className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                title="Copy full address"
              >
                {copiedAddress === 'gameToken' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="inline-block w-3 h-3">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="inline-block w-3 h-3">
                    <path d="M9 18q-.825 0-1.412-.587C7 16.826 7 16.55 7 16V4q0-.824.588-1.412C8.176 1.999 8.45 2 9 2h9q.824 0 1.413.588C20.002 3.175 20 3.45 20 4v12q0 .824-.587 1.413c-.587.589-.863.587-1.413.587zm0-2h9V4H9zm-4 6q-.824 0-1.412-.587C2.999 20.826 3 20.55 3 20V6h2v14h11v2z"></path>
                  </svg>
                )}
              </button>
            </div>
            <div className="text-white flex items-center gap-2">
              <span className="text-purple-400">ClawMachine:</span>{' '}
              <span className="font-mono">
                {clawMachineAddress?.slice(0, 10)}...{clawMachineAddress?.slice(-8)}
              </span>
              <button
                onClick={() => copyToClipboard(clawMachineAddress, 'clawMachine')}
                className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                title="Copy full address"
              >
                {copiedAddress === 'clawMachine' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="inline-block w-3 h-3">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="inline-block w-3 h-3">
                    <path d="M9 18q-.825 0-1.412-.587C7 16.826 7 16.55 7 16V4q0-.824.588-1.412C8.176 1.999 8.45 2 9 2h9q.824 0 1.413.588C20.002 3.175 20 3.45 20 4v12q0 .824-.587 1.413c-.587.589-.863.587-1.413.587zm0-2h9V4H9zm-4 6q-.824 0-1.412-.587C2.999 20.826 3 20.55 3 20V6h2v14h11v2z"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
