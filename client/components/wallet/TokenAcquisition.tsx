'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { CONTRACTS, GAMETOKEN_ABI } from '@/lib/web3';
import { sepolia } from 'wagmi/chains';
import { useTranslations } from 'next-intl';

const EXTENDED_ABI = [
  ...GAMETOKEN_ABI,
  {
    inputs: [],
    name: 'buyTokens',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimFaucet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'canClaimFaucet',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'faucetCooldownRemaining',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'faucetAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'faucetCooldown',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'faucetEnabled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
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
    inputs: [{ internalType: 'uint256', name: 'ethAmount', type: 'uint256' }],
    name: 'getTokenAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function TokenAcquisition() {
  const t = useTranslations('wallet');
  const { address, chain } = useAccount();
  const [ethAmount, setEthAmount] = useState('0.1');
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const [hasSetDefaultAmount, setHasSetDefaultAmount] = useState(false);

  const chainId = chain?.id || sepolia.id;
  const tokenAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.gameToken
    : CONTRACTS.polygonAmoy.gameToken;

  console.log('TokenAcquisition Debug:', {
    address,
    chainId,
    tokenAddress,
    isConnected: !!address,
  });

  // Read token price
  const { data: tokenPrice } = useReadContract({
    address: tokenAddress,
    abi: EXTENDED_ABI,
    functionName: 'tokenPrice',
  });

  // Set default ETH amount to buy 100 TALON tokens
  useEffect(() => {
    if (tokenPrice && !hasSetDefaultAmount) {
      const targetTokens = parseEther('100'); // 100 TALON
      const requiredEth = (tokenPrice * targetTokens) / parseEther('1');
      setEthAmount(formatEther(requiredEth));
      setHasSetDefaultAmount(true);
    }
  }, [tokenPrice, hasSetDefaultAmount]);

  // Read faucet amount
  const { data: faucetAmount } = useReadContract({
    address: tokenAddress,
    abi: EXTENDED_ABI,
    functionName: 'faucetAmount',
  });

  // Read faucet cooldown
  const { data: faucetCooldown } = useReadContract({
    address: tokenAddress,
    abi: EXTENDED_ABI,
    functionName: 'faucetCooldown',
  });

  // Check if faucet is enabled
  const { data: faucetEnabled } = useReadContract({
    address: tokenAddress,
    abi: EXTENDED_ABI,
    functionName: 'faucetEnabled',
  });

  // Check if can claim faucet
  const { data: canClaim, refetch: refetchCanClaim, isLoading: isLoadingCanClaim, error: canClaimError } = useReadContract({
    address: tokenAddress,
    abi: EXTENDED_ABI,
    functionName: 'canClaimFaucet',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Get cooldown remaining
  const { data: cooldownRemaining, refetch: refetchCooldown, isLoading: isLoadingCooldown, error: cooldownError } = useReadContract({
    address: tokenAddress,
    abi: EXTENDED_ABI,
    functionName: 'faucetCooldownRemaining',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      retry: 3,
      retryDelay: 1000,
    },
  });

  console.log('Faucet Status:', {
    canClaim,
    cooldownRemaining: cooldownRemaining?.toString(),
    isLoadingCanClaim,
    isLoadingCooldown,
    canClaimError: canClaimError?.message,
    cooldownError: cooldownError?.message,
  });

  // Get token amount for ETH
  const { data: tokenAmount } = useReadContract({
    address: tokenAddress,
    abi: EXTENDED_ABI,
    functionName: 'getTokenAmount',
    args: [parseEther(ethAmount || '0')],
  });

  const { writeContract: buyTokens, data: buyHash, isPending: isBuying } = useWriteContract();
  const { writeContract: claimFaucet, data: claimHash, isPending: isClaiming } = useWriteContract();

  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash });
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ 
    hash: claimHash,
  });

  // Set transaction hash for tracking
  useEffect(() => {
    if (buyHash) setLastTxHash(buyHash);
  }, [buyHash]);

  useEffect(() => {
    if (claimHash) setLastTxHash(claimHash);
  }, [claimHash]);

  // Refetch when claim succeeds
  useEffect(() => {
    if (isClaimSuccess) {
      refetchCanClaim();
      refetchCooldown();
    }
  }, [isClaimSuccess, refetchCanClaim, refetchCooldown]);

  const handleBuyTokens = () => {
    buyTokens({
      address: tokenAddress,
      abi: EXTENDED_ABI,
      functionName: 'buyTokens',
      value: parseEther(ethAmount),
    });
  };

  const handleClaimFaucet = () => {
    claimFaucet({
      address: tokenAddress,
      abi: EXTENDED_ABI,
      functionName: 'claimFaucet',
    });
  };

  const formatCooldown = (seconds: bigint) => {
    const hours = Number(seconds) / 3600;
    if (hours < 1) {
      const minutes = Math.ceil(Number(seconds) / 60);
      return minutes === 1
        ? t('timeMinute', { count: minutes })
        : t('timeMinutes', { count: minutes });
    }
    return t('timeHours', { count: hours.toFixed(1) });
  };

  if (!address) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white border border-white/20">
        <h3 className="text-lg font-bold mb-2">{t('getTokens')}</h3>
        <p className="text-sm text-purple-200">{t('connectWalletPrompt')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white border border-white/20 space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-4">{t('getTokens')}</h3>

        {/* Faucet Section */}
        <div className="mb-6 p-4 bg-black/20 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">{t('freeTestnetFaucet')}</h4>
            <span className="text-green-400 font-bold">
              {faucetAmount ? formatEther(faucetAmount) : '...'} TALON
            </span>
          </div>
          <p className="text-xs text-purple-200 mb-3">
            {t('faucetDescription', { cooldown: faucetCooldown ? formatCooldown(faucetCooldown) : '5 minutes' })}
          </p>
          {faucetEnabled === false ? (
            <div className="text-center py-2 text-sm text-red-400">
              {t('faucetDisabled')}
            </div>
          ) : isLoadingCanClaim || isLoadingCooldown ? (
            <div className="text-center py-2 text-sm text-purple-300">
              {t('checkingEligibility')}
            </div>
          ) : canClaim ? (
            <button
              onClick={handleClaimFaucet}
              disabled={isClaiming || isClaimConfirming}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isClaiming || isClaimConfirming ? t('claiming') : t('claimTokens', { amount: faucetAmount ? formatEther(faucetAmount) : '...' })}
            </button>
          ) : (
            <div className="text-center py-2 text-sm text-yellow-300">
              {t('nextClaimIn')}: {cooldownRemaining !== undefined ? (cooldownRemaining === BigInt(0) ? t('availableNow') : formatCooldown(cooldownRemaining)) : t('calculating')}
            </div>
          )}
        </div>

        {/* Buy Section */}
        <div className="p-4 bg-black/20 rounded-lg">
          <h4 className="font-semibold mb-3">{t('buyWithEth')}</h4>
          <div className="mb-3">
            <label className="text-xs text-purple-200 block mb-1">{t('ethAmount')}</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded px-3 py-2 text-white"
            />
          </div>
          <div className="text-sm mb-3">
            <span className="text-purple-200">{t('youllReceive')}: </span>
            <span className="font-bold text-blue-400">
              {tokenAmount ? formatEther(tokenAmount) : '0'} TALON
            </span>
          </div>
          <div className="text-xs text-purple-300 mb-3">
            {t('price')}: {tokenPrice ? formatEther(tokenPrice) : '...'} ETH per TALON
          </div>
          <button
            onClick={handleBuyTokens}
            disabled={isBuying || isBuyConfirming || !ethAmount || parseFloat(ethAmount) <= 0}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            {isBuying || isBuyConfirming ? t('buying') : t('buyTokens')}
          </button>
        </div>
      </div>
    </div>
  );
}
