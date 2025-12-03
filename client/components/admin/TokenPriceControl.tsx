'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
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

  // Read current token price
  const { data: tokenPrice, refetch: refetchPrice } = useReadContract({
    address: tokenAddress,
    abi: [
      {
        inputs: [],
        name: 'tokenPrice',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ] as const,
    functionName: 'tokenPrice',
  });

  // Local state for new price
  const [newPrice, setNewPrice] = useState<string>('0.0001');

  // Update local state when contract value loads
  useEffect(() => {
    if (tokenPrice) {
      setNewPrice(formatEther(tokenPrice));
    }
  }, [tokenPrice]);

  // Write contract
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  // Refetch on success
  useEffect(() => {
    if (isSuccess) {
      refetchPrice();
    }
  }, [isSuccess, refetchPrice]);

  const handleSetPrice = () => {
    const price = parseFloat(newPrice);

    // Validate price (0.000001 to 1 ETH)
    if (price < 0.000001 || price > 1) {
      alert(t('alertPriceRange'));
      return;
    }

    writeContract({
      address: tokenAddress,
      abi: GAMETOKEN_ABI,
      functionName: 'setTokenPrice',
      args: [parseEther(newPrice)],
    });
  };

  const currentPriceEth = tokenPrice ? parseFloat(formatEther(tokenPrice)) : 0;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-4">{t('tokenPriceControl')}</h2>

      {/* Current Value Display */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">{t('currentTokenPrice')}</div>
          <div className="text-white text-2xl font-bold">
            {tokenPrice ? formatEther(tokenPrice) : '...'} ETH
          </div>
          <div className="text-purple-400 text-xs mt-1">{t('ethPerToken')}</div>
        </div>
      </div>

      {/* Price Control */}
      <div className="bg-black/20 rounded-lg p-4">
        <label className="text-white font-semibold mb-3 block">
          {t('newTokenPrice')}
        </label>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <input
              type="range"
              min="0.000001"
              max="1"
              step="0.00001"
              value={parseFloat(newPrice) || 0.0001}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full h-2 bg-purple-300 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-purple-300 mt-1">
              <span>0.000001</span>
              <span>0.0005</span>
              <span>0.001</span>
              <span>0.01</span>
              <span>1</span>
            </div>
          </div>
          <input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-40 bg-black/30 border border-white/20 rounded px-3 py-2 text-white"
            min="0.000001"
            max="1"
            step="0.00001"
          />
          <button
            onClick={handleSetPrice}
            disabled={isPending || currentPriceEth === parseFloat(newPrice)}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-2 px-6 rounded transition-colors"
          >
            {isPending ? t('updating') : tCommon('update')}
          </button>
        </div>
        <div className="text-xs text-purple-300 mt-2">
          {t('tokenPriceRange', { min: '0.000001', max: '1' })}
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
