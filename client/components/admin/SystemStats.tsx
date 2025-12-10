'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const tokenAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.gameToken
    : CONTRACTS.polygonAmoy.gameToken;

  const prizeNFTAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.prizeNFT
    : CONTRACTS.polygonAmoy.prizeNFT;

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

  // Contract ETH balances
  const { data: gameTokenBalance } = useBalance({
    address: tokenAddress,
    chainId: chainId,
  });

  const { data: clawMachineBalance } = useBalance({
    address: clawMachineAddress,
    chainId: chainId,
  });

  // ClawMachine TALON token balance (what players paid to play)
  const { data: clawMachineTalonBalance } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'balanceOf',
    args: [clawMachineAddress],
  });

  const supplyPercentage = totalSupply && maxSupply
    ? (Number(totalSupply) / Number(maxSupply)) * 100
    : 0;

  // Withdraw functionality
  const { writeContract, data: withdrawHash, isPending: isWithdrawPending } = useWriteContract();
  const { isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // Refetch balance after successful withdrawal
  useEffect(() => {
    if (isWithdrawSuccess) {
      // Refetch will happen automatically via wagmi
    }
  }, [isWithdrawSuccess]);

  const handleWithdraw = () => {
    if (!gameTokenBalance || gameTokenBalance.value === BigInt(0)) {
      alert('No ETH to withdraw');
      return;
    }

    const confirmed = confirm(
      `Withdraw ${formatEther(gameTokenBalance.value)} ETH from the GameToken contract?`
    );

    if (!confirmed) return;

    writeContract({
      address: tokenAddress,
      abi: GAMETOKEN_ABI,
      functionName: 'withdraw',
    });
  };

  const hasBalance = gameTokenBalance && gameTokenBalance.value > BigInt(0);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-4">{t('systemStats')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Supply */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">{t('totalSupply')}</div>
          <div className="text-white text-2xl font-bold">
            {totalSupply ? Math.floor(parseFloat(formatEther(totalSupply))) : '...'}
          </div>
          <div className="text-purple-400 text-xs mt-1">
            {maxSupply && `${t('maxSupply')}: ${Math.floor(parseFloat(formatEther(maxSupply)))}`}
          </div>
          <div className="mt-2">
            <div className="w-full bg-purple-900/50 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(supplyPercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-purple-300 mt-1">
              {supplyPercentage.toFixed(2)}% {t('ofMaxSupply')}
            </div>
          </div>
        </div>

        {/* Token Price */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">{t('tokenPrice')}</div>
          <div className="text-white text-2xl font-bold">
            {tokenPrice ? parseFloat(formatEther(tokenPrice)).toFixed(10) : '...'} ETH
          </div>
          <div className="text-purple-400 text-xs mt-1">{t('perToken')}</div>
        </div>

        {/* Game Cost */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">{t('costPerPlay')}</div>
          <div className="text-white text-2xl font-bold">
            {costPerPlay ? Math.floor(parseFloat(formatEther(costPerPlay))) : '...'}
          </div>
          <div className="text-purple-400 text-xs mt-1">{t('talonTokens')}</div>
        </div>

        {/* Network */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">{t('network')}</div>
          <div className="text-white text-2xl font-bold capitalize">
            {chain?.name || t('unknown')}
          </div>
          <div className="text-purple-400 text-xs mt-1">{t('chainId')}: {chainId}</div>
        </div>

        {/* GameToken Contract Balance */}
        <div className="bg-black/20 rounded-lg p-4 relative">
          <div className="flex items-start justify-between mb-1">
            <div className="text-purple-300 text-sm">{t('gameTokenEth')}</div>
            <div className="relative">
              <button
                onClick={() => setActiveTooltip(activeTooltip === 'gameToken' ? null : 'gameToken')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Tooltip */}
              {activeTooltip === 'gameToken' && (
                <div className="absolute right-0 top-6 w-64 bg-slate-800 border border-purple-400 rounded-lg p-3 text-xs text-white shadow-xl z-50">
                  <p className="font-semibold text-purple-300 mb-1">{t('gameTokenEthTooltipTitle')}</p>
                  <p>{t('gameTokenEthTooltipDescription')}</p>
                </div>
              )}
            </div>
          </div>
          <div className="text-white text-2xl font-bold">
            {gameTokenBalance ? parseFloat(formatEther(gameTokenBalance.value)).toFixed(4) : '0'} ETH
          </div>
          <div className="text-purple-400 text-xs mt-1">{t('contractBalance')}</div>
          {/* Withdraw Button */}
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawPending || !hasBalance}
            className={`mt-3 w-full py-1.5 px-3 rounded text-xs font-semibold transition-colors ${
              hasBalance && !isWithdrawPending
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isWithdrawPending ? '⏳ Withdrawing...' : isWithdrawSuccess ? '✅ Withdrawn!' : '💸 Withdraw'}
          </button>
        </div>

        {/* ClawMachine Contract Balances */}
        <div className="bg-black/20 rounded-lg p-4 relative">
          <div className="flex items-start justify-between mb-1">
            <div className="text-purple-300 text-sm">{t('clawMachine')}</div>
            <div className="relative">
              <button
                onClick={() => setActiveTooltip(activeTooltip === 'clawMachine' ? null : 'clawMachine')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Tooltip */}
              {activeTooltip === 'clawMachine' && (
                <div className="absolute right-0 top-6 w-64 bg-slate-800 border border-purple-400 rounded-lg p-3 text-xs text-white shadow-xl z-50">
                  <p className="font-semibold text-purple-300 mb-1">{t('clawMachineTooltipTitle')}</p>
                  <p>{t('clawMachineTooltipTalonBalance')}</p>
                </div>
              )}
            </div>
          </div>
          <div className="text-white text-2xl font-bold">
            {clawMachineTalonBalance ? Math.floor(parseFloat(formatEther(clawMachineTalonBalance))) : '0'} TALON
          </div>
          <div className="text-purple-400 text-xs mt-1">{t('contractBalance')}</div>
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
              <span className="text-purple-400">PrizeNFT:</span>{' '}
              <span className="font-mono">
                {prizeNFTAddress?.slice(0, 10)}...{prizeNFTAddress?.slice(-8)}
              </span>
              <button
                onClick={() => copyToClipboard(prizeNFTAddress, 'prizeNFT')}
                className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                title="Copy full address"
              >
                {copiedAddress === 'prizeNFT' ? (
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
