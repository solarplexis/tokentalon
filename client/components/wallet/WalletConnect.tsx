'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import { useTokenBalance } from '@/lib/web3';
import { formatUnits } from 'viem';

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: balance } = useTokenBalance(address, chain?.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.wallet-dropdown')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  if (!mounted) {
    return null;
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm text-white font-bold">
          <div className="font-mono text-xs opacity-70">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          <div className="text-xs opacity-50">
            {chain?.name || 'Unknown Network'}
          </div>
          {balance !== undefined && (
            <div className="text-xs font-bold text-green-400 mt-1">
              {formatUnits(balance, 18)} TALON
            </div>
          )}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative wallet-dropdown z-[100]">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold"
      >
        Connect Wallet
      </button>
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/20 rounded-lg shadow-xl overflow-hidden z-[100]">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector });
                setShowDropdown(false);
              }}
              disabled={isPending}
              className="w-full px-4 py-3 text-left text-white hover:bg-blue-500/20 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors border-b border-white/10 last:border-b-0"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
