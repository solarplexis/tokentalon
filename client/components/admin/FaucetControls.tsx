'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS } from '@/lib/web3';
import { sepolia } from 'wagmi/chains';

const GAMETOKEN_ABI = [
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
    inputs: [{ internalType: 'uint256', name: 'newAmount', type: 'uint256' }],
    name: 'setFaucetAmount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'newCooldown', type: 'uint256' }],
    name: 'setFaucetCooldown',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bool', name: 'enabled', type: 'bool' }],
    name: 'setFaucetEnabled',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export function FaucetControls() {
  const { chain } = useAccount();
  const chainId = chain?.id || sepolia.id;
  const tokenAddress = chainId === sepolia.id
    ? CONTRACTS.sepolia.gameToken
    : CONTRACTS.polygonAmoy.gameToken;

  // Read current values
  const { data: faucetAmount, refetch: refetchAmount } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'faucetAmount',
  });

  const { data: faucetCooldown, refetch: refetchCooldown } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'faucetCooldown',
  });

  const { data: faucetEnabled, refetch: refetchEnabled } = useReadContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'faucetEnabled',
  });

  // Local state for inputs
  const [newAmount, setNewAmount] = useState<string>('100');
  const [newCooldown, setNewCooldown] = useState<number>(5);
  const [cooldownUnit, setCooldownUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  // Update local state when contract values load
  useEffect(() => {
    if (faucetAmount) {
      setNewAmount(formatEther(faucetAmount));
    }
  }, [faucetAmount]);

  useEffect(() => {
    if (faucetCooldown) {
      const minutes = Number(faucetCooldown) / 60;
      setNewCooldown(minutes);
    }
  }, [faucetCooldown]);

  // Write contracts
  const { writeContract: setAmount, data: amountHash, isPending: isAmountPending } = useWriteContract();
  const { writeContract: setCooldown, data: cooldownHash, isPending: isCooldownPending } = useWriteContract();
  const { writeContract: setEnabled, data: enabledHash, isPending: isEnabledPending } = useWriteContract();

  // Wait for transactions
  const { isSuccess: isAmountSuccess } = useWaitForTransactionReceipt({ hash: amountHash });
  const { isSuccess: isCooldownSuccess } = useWaitForTransactionReceipt({ hash: cooldownHash });
  const { isSuccess: isEnabledSuccess } = useWaitForTransactionReceipt({ hash: enabledHash });

  // Refetch on success
  useEffect(() => {
    if (isAmountSuccess) refetchAmount();
  }, [isAmountSuccess, refetchAmount]);

  useEffect(() => {
    if (isCooldownSuccess) refetchCooldown();
  }, [isCooldownSuccess, refetchCooldown]);

  useEffect(() => {
    if (isEnabledSuccess) refetchEnabled();
  }, [isEnabledSuccess, refetchEnabled]);

  const handleSetAmount = () => {
    const amount = parseFloat(newAmount);
    if (amount <= 0 || amount > 10000) {
      alert('Amount must be between 0 and 10,000 TALON');
      return;
    }

    setAmount({
      address: tokenAddress,
      abi: GAMETOKEN_ABI,
      functionName: 'setFaucetAmount',
      args: [parseEther(newAmount)],
    });
  };

  const handleSetCooldown = () => {
    let seconds: number;

    switch (cooldownUnit) {
      case 'hours':
        seconds = newCooldown * 3600;
        break;
      case 'days':
        seconds = newCooldown * 86400;
        break;
      default: // minutes
        seconds = newCooldown * 60;
    }

    if (seconds < 60 || seconds > 30 * 86400) {
      alert('Cooldown must be between 1 minute and 30 days');
      return;
    }

    setCooldown({
      address: tokenAddress,
      abi: GAMETOKEN_ABI,
      functionName: 'setFaucetCooldown',
      args: [BigInt(seconds)],
    });
  };

  const handleToggleEnabled = () => {
    setEnabled({
      address: tokenAddress,
      abi: GAMETOKEN_ABI,
      functionName: 'setFaucetEnabled',
      args: [!faucetEnabled],
    });
  };

  const currentCooldownMinutes = faucetCooldown ? Number(faucetCooldown) / 60 : 0;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-4">Faucet Controls</h2>

      {/* Current Values Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">Current Amount</div>
          <div className="text-white text-2xl font-bold">
            {faucetAmount ? formatEther(faucetAmount) : '...'} TALON
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">Current Cooldown</div>
          <div className="text-white text-2xl font-bold">
            {currentCooldownMinutes} min
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-purple-300 text-sm mb-1">Status</div>
          <div className={`text-2xl font-bold ${faucetEnabled ? 'text-green-400' : 'text-red-400'}`}>
            {faucetEnabled ? '✅ Enabled' : '❌ Disabled'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        {/* Faucet Amount */}
        <div className="bg-black/20 rounded-lg p-4">
          <label className="text-white font-semibold mb-3 block">
            Faucet Amount (TALON)
          </label>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <input
                type="range"
                min="10"
                max="10000"
                step="10"
                value={parseFloat(newAmount) || 0}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full h-2 bg-purple-300 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-purple-300 mt-1">
                <span>10</span>
                <span>5,000</span>
                <span>10,000</span>
              </div>
            </div>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-32 bg-black/30 border border-white/20 rounded px-3 py-2 text-white"
              min="10"
              max="10000"
            />
            <button
              onClick={handleSetAmount}
              disabled={isAmountPending}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-2 px-6 rounded transition-colors"
            >
              {isAmountPending ? 'Updating...' : 'Update'}
            </button>
          </div>
          <div className="text-xs text-purple-300 mt-2">
            Range: 10 - 10,000 TALON
          </div>
        </div>

        {/* Faucet Cooldown */}
        <div className="bg-black/20 rounded-lg p-4">
          <label className="text-white font-semibold mb-3 block">
            Faucet Cooldown
          </label>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <input
                type="range"
                min={cooldownUnit === 'days' ? 1 : cooldownUnit === 'hours' ? 1 : 1}
                max={cooldownUnit === 'days' ? 30 : cooldownUnit === 'hours' ? 24 : 1440}
                step="1"
                value={newCooldown}
                onChange={(e) => setNewCooldown(parseInt(e.target.value))}
                className="w-full h-2 bg-purple-300 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-purple-300 mt-1">
                <span>Min</span>
                <span>Mid</span>
                <span>Max</span>
              </div>
            </div>
            <input
              type="number"
              value={newCooldown}
              onChange={(e) => setNewCooldown(parseInt(e.target.value))}
              className="w-24 bg-black/30 border border-white/20 rounded px-3 py-2 text-white"
              min="1"
            />
            <select
              value={cooldownUnit}
              onChange={(e) => setCooldownUnit(e.target.value as 'minutes' | 'hours' | 'days')}
              className="bg-black/30 border border-white/20 rounded px-3 py-2 text-white"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
            <button
              onClick={handleSetCooldown}
              disabled={isCooldownPending}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-2 px-6 rounded transition-colors"
            >
              {isCooldownPending ? 'Updating...' : 'Update'}
            </button>
          </div>
          <div className="text-xs text-purple-300 mt-2">
            Range: 1 minute - 30 days
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold mb-1">Faucet Status</div>
              <div className="text-sm text-purple-300">
                {faucetEnabled ? 'Users can claim tokens' : 'Faucet is disabled'}
              </div>
            </div>
            <button
              onClick={handleToggleEnabled}
              disabled={isEnabledPending}
              className={`${
                faucetEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              } disabled:bg-gray-500 text-white font-bold py-3 px-8 rounded transition-colors`}
            >
              {isEnabledPending ? 'Updating...' : faucetEnabled ? 'Disable Faucet' : 'Enable Faucet'}
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Status */}
      {(amountHash || cooldownHash || enabledHash) && (
        <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
          <div className="text-blue-300 text-sm font-semibold mb-2">Transaction Status</div>
          {amountHash && (
            <div className="text-xs text-blue-200 mb-1">
              Amount: {isAmountSuccess ? '✅ Confirmed' : '⏳ Pending...'}
            </div>
          )}
          {cooldownHash && (
            <div className="text-xs text-blue-200 mb-1">
              Cooldown: {isCooldownSuccess ? '✅ Confirmed' : '⏳ Pending...'}
            </div>
          )}
          {enabledHash && (
            <div className="text-xs text-blue-200">
              Status: {isEnabledSuccess ? '✅ Confirmed' : '⏳ Pending...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
