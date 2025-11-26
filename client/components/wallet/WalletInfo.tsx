'use client';

import { useAccount } from 'wagmi';
import { useTokenBalance, useNFTBalance, usePlayerStats } from '@/lib/web3';
import { formatEther } from 'viem';

export function WalletInfo() {
  const { address, chain } = useAccount();
  const { data: tokenBalance } = useTokenBalance(address, chain?.id);
  const { data: nftBalance } = useNFTBalance(address, chain?.id);
  const { data: playerStats } = usePlayerStats(address, chain?.id);

  if (!address) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-400">
          {tokenBalance ? formatEther(tokenBalance) : '0'}
        </div>
        <div className="text-xs opacity-70">CLAW Tokens</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-400">
          {nftBalance?.toString() || '0'}
        </div>
        <div className="text-xs opacity-70">Prize NFTs</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-400">
          {playerStats ? `${playerStats[1].toString()}/${playerStats[0].toString()}` : '0/0'}
        </div>
        <div className="text-xs opacity-70">Wins/Games</div>
      </div>
    </div>
  );
}
