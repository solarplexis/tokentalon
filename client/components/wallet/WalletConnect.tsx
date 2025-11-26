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
  const { data: balance } = useTokenBalance(address, chain?.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
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
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold mb-2">Connect Wallet</div>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          {connector.name}
        </button>
      ))}
    </div>
  );
}
