'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS } from '@/lib/web3';
import { sepolia } from 'wagmi/chains';
import { useTranslations } from 'next-intl';
import { GAMETOKEN_ABI } from '@/lib/web3/abis';

export function TokenPriceControl() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const { chain } = useAccount();
  const chainId = chain?.id || sepolia.id;
  const tokenAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.gameToken
    : CONTRACTS.polygonAmoy.gameToken;

  // Read current token price in USD (with 8 decimals)
  const { data: tokenPriceUsd, refetch: refetchPriceUsd } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'tokenPriceUsd',
  });

  // Read calculated ETH price
  const { data: tokenPriceEth, refetch: refetchPriceEth } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'getTokenPriceEth',
  });

  // Local state for new price in USD (displayed as decimal, e.g., 0.10)
  const [newPriceUsd, setNewPriceUsd] = useState<string>('0.10');

  // Update local state when contract value loads
  useEffect(() => {
    if (tokenPriceUsd) {
      // Convert from 8 decimals to decimal display (e.g., 10000000 -> 0.10)
      const usdDecimal = Number(tokenPriceUsd) / 1e8;
      setNewPriceUsd(usdDecimal.toFixed(2));
    }
  }, [tokenPriceUsd]);

  // Write contract
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  // Refetch on success
  useEffect(() => {
    if (isSuccess) {
      refetchPriceUsd();
      refetchPriceEth();
    }
  }, [isSuccess, refetchPriceUsd, refetchPriceEth]);

  const handleSetPrice = () => {
    const priceUsdDecimal = parseFloat(newPriceUsd);

    // Validate price ($0.01 to $5.00)
    if (priceUsdDecimal < 0.01 || priceUsdDecimal > 5.0) {
      alert(t('alertPriceRange'));
      return;
    }

    // Convert to 8 decimals (e.g., 0.10 -> 10000000)
    const priceUsd8Decimals = Math.floor(priceUsdDecimal * 1e8);

    writeContract({
      address: tokenAddress,
      abi: GAMETOKEN_ABI,
      functionName: 'setTokenPriceUsd',
      args: [BigInt(priceUsd8Decimals)],
    });
  };

  const currentPriceUsd = tokenPriceUsd ? Number(tokenPriceUsd) / 1e8 : 0;
  const gameCostUsd = currentPriceUsd * 10; // 10 tokens per game

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-4">{t('tokenPriceControl')}</h2>

      {/* Current Value Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">{t('currentTokenPriceUsd')}</div>
          <div className="text-white text-2xl font-bold">
            ${tokenPriceUsd ? (Number(tokenPriceUsd) / 1e8).toFixed(2) : '...'} {t('usd')}
          </div>
          <div className="text-purple-400 text-xs mt-1">{t('perTalonToken')}</div>
        </div>
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-green-300 text-sm mb-1">{t('currentTokenPriceEth')}</div>
          <div className="text-white text-2xl font-bold">
            {tokenPriceEth ? formatEther(tokenPriceEth) : '...'} {t('eth')}
          </div>
          <div className="text-green-400 text-xs mt-1">{t('autoCalculatedFromEthUsd')}</div>
        </div>
      </div>

      {/* Game Cost Display */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="text-blue-300 text-sm mb-1">{t('gameCost10Talon')}</div>
        <div className="text-white text-xl font-bold">
          ${gameCostUsd.toFixed(2)} {t('usd')}
          {tokenPriceEth && (
            <span className="text-green-300 ml-2">
              / {formatEther(BigInt(tokenPriceEth) * BigInt(10))} {t('eth')}
            </span>
          )}
        </div>
        <div className="text-blue-400 text-xs mt-1">{t('pricePerGameConsistentUsd')}</div>
      </div>

      {/* Price Control */}
      <div className="bg-black/20 rounded-lg p-4">
        <label className="text-white font-semibold mb-3 block">
          {t('newTokenPriceUsd')}
        </label>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <input
              type="range"
              min="0.01"
              max="5.00"
              step="0.01"
              value={parseFloat(newPriceUsd) || 0.10}
              onChange={(e) => setNewPriceUsd(e.target.value)}
              className="w-full h-2 bg-purple-300 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-purple-300 mt-1">
              <span>$0.01</span>
              <span>$1.00</span>
              <span>$2.50</span>
              <span>$5.00</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white">$</span>
            <input
              type="number"
              value={newPriceUsd}
              onChange={(e) => setNewPriceUsd(e.target.value)}
              className="w-40 bg-black/30 border border-white/20 rounded px-3 py-2 text-white"
              min="0.01"
              max="5.00"
              step="0.01"
            />
          </div>
          <button
            onClick={handleSetPrice}
            disabled={isPending || currentPriceUsd === parseFloat(newPriceUsd)}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-2 px-6 rounded transition-colors"
          >
            {isPending ? t('updating') : tCommon('update')}
          </button>
        </div>
        <div className="text-xs text-purple-300 mt-2">
          {t('priceRangeUsdPerToken')}
        </div>
        <div className="text-xs text-green-300 mt-1">
          {t('ethPriceAutoAdjust')}
        </div>
      </div>

      {/* Transaction Status */}
      {hash && (
        <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
          <div className="text-blue-300 text-sm font-semibold mb-2">{t('transactionStatus')}</div>
          <div className="text-xs text-blue-200">
            {t('tokenPriceControl')}: {isSuccess ? `✅ ${t('confirmed')}` : `⏳ ${t('pending')}`}
          </div>
          {isSuccess && (
            <div className="text-xs text-green-200 mt-2">
              {t('tokenPriceUpdated')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
