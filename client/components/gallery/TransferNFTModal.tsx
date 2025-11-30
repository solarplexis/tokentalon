'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import { CONTRACTS } from '@/lib/web3';
import { sepolia } from 'wagmi/chains';
import { useTranslations } from 'next-intl';

const PRIZENFT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

interface TransferNFTModalProps {
  tokenId: string;
  nftName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferNFTModal({ tokenId, nftName, onClose, onSuccess }: TransferNFTModalProps) {
  const t = useTranslations('gallery');
  const { address, chain } = useAccount();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [error, setError] = useState('');

  const chainId = chain?.id || sepolia.id;
  const prizeNFTAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.prizeNFT
    : CONTRACTS.polygonAmoy.prizeNFT;

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleTransfer = () => {
    setError('');

    // Validate address
    if (!recipientAddress || !isAddress(recipientAddress)) {
      setError(t('invalidAddress'));
      return;
    }

    // Don't allow transfer to self
    if (address && recipientAddress.toLowerCase() === address.toLowerCase()) {
      setError(t('cannotTransferToSelf'));
      return;
    }

    // Execute transfer
    writeContract({
      address: prizeNFTAddress,
      abi: PRIZENFT_ABI,
      functionName: 'safeTransferFrom',
      args: [address!, recipientAddress as `0x${string}`, BigInt(tokenId)],
    });
  };

  // Handle success
  if (isSuccess) {
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl border-4 border-purple-400 p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            {t('transferNFT')}
          </h2>
          <p className="text-purple-200 text-sm">{nftName}</p>
          <p className="text-purple-400 text-xs mt-1">Token ID: {tokenId}</p>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-purple-300 text-sm mb-2">
            {t('recipientAddress')}
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-black/30 border border-purple-400/50 rounded-lg px-4 py-3 text-white placeholder-purple-400/30 focus:outline-none focus:border-purple-400"
            disabled={isPending || isConfirming || isSuccess}
          />
        </div>

        {/* Error Message */}
        {(error || writeError) && (
          <div className="mb-4 bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
            {error || writeError?.message}
          </div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <div className="mb-4 bg-green-500/20 border border-green-500 text-green-200 px-4 py-2 rounded-lg text-sm">
            {t('transferSuccess')}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleTransfer}
            disabled={isPending || isConfirming || isSuccess || !recipientAddress}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isPending ? t('transferring') : t('confirming')}
              </>
            ) : isSuccess ? (
              <>✓ {t('transferred')}</>
            ) : (
              t('transfer')
            )}
          </button>

          <button
            onClick={onClose}
            disabled={isPending || isConfirming}
            className="flex-1 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:scale-100"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
