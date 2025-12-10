# Chainlink Price Feeds Integration Plan

**Purpose:** Integrate Chainlink oracles to fetch real-time ETH/USD prices for TokenTalon

**Date:** December 2025

---

## Overview

Chainlink Data Feeds provide decentralized, reliable price data for crypto assets. By integrating Chainlink, TokenTalon can:
1. Display real-time USD values throughout the UI
2. Optionally: Set token prices in USD terms and auto-calculate ETH amounts
3. Provide users with clear cost transparency

---

## Current Situation

**Current Setup:**
- Token price: Manually set in ETH (e.g., 0.000016 ETH per TALON)
- Game cost: 10 TALON = 0.00016 ETH
- USD calculation: Manual (admin calculates: $0.50 / $3,045.01 = 0.000164 ETH)
- Problem: If ETH price changes, game cost in USD changes

**Example:**
- Today: ETH = $3,045 → 10 TALON = $0.487
- Tomorrow: ETH = $4,000 → 10 TALON = $0.64 (33% increase!)

---

## Implementation Approaches

### Approach A: Display-Only Integration (Recommended)
**Complexity:** Low | **Risk:** Low | **Cost:** Free

Keep contracts unchanged, add price feeds to frontend only.

**Pros:**
- No contract changes needed
- No redeployment required
- Works immediately
- Lower gas costs (no on-chain reads)
- Flexible (easy to add/remove)

**Cons:**
- USD values are informational only
- Prices still set in ETH terms

**Implementation:**
1. Add Chainlink price feed contract to frontend
2. Display USD conversions throughout UI
3. Show admin "This price = $X.XX per game"

### Approach B: Contract-Integrated USD Pricing
**Complexity:** High | **Risk:** Medium | **Cost:** Moderate gas increase

Store prices in USD, calculate ETH amounts on-chain using Chainlink.

**Pros:**
- True USD-denominated pricing
- Automatic ETH price adjustments
- Consistent USD costs for users

**Cons:**
- Requires contract changes
- Need to redeploy contracts
- Higher gas costs (Chainlink reads)
- More complex testing
- Dependency on Chainlink uptime

---

## Technical Details

### Chainlink Price Feed Addresses

**Sepolia Testnet:**
```
ETH/USD: 0x694AA1769357215DE4FAC081bf1f309aDC325306
```

**Polygon Mainnet:**
```
ETH/USD: 0xF9680D99D6C9589e2a93a78A04A279e509205945
```

**Polygon Amoy Testnet:**
```
ETH/USD: 0xF0d50568e3A7e8259E16663972b11910F89BD8e7
```

### Chainlink Price Feed Interface

```solidity
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,      // Price with 8 decimals (e.g., 304501000000 = $3,045.01)
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}
```

---

## Approach A: Display-Only Implementation

### Phase 1: Frontend Integration

#### 1.1 Add Chainlink ABI

**File:** `client/lib/web3/chainlink.ts`
```typescript
export const CHAINLINK_PRICE_FEED_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const PRICE_FEED_ADDRESSES = {
  sepolia: {
    ethUsd: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  },
  polygon: {
    ethUsd: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
  },
  amoy: {
    ethUsd: '0xF0d50568e3A7e8259E16663972b11910F89BD8e7',
  },
} as const;
```

#### 1.2 Create Price Feed Hook

**File:** `client/lib/web3/useEthPrice.ts`
```typescript
import { useReadContract } from 'wagmi';
import { CHAINLINK_PRICE_FEED_ABI, PRICE_FEED_ADDRESSES } from './chainlink';
import { sepolia } from 'wagmi/chains';

export function useEthPrice(chainId?: number) {
  const network = chainId === sepolia.id ? 'sepolia' :
                  chainId === 137 ? 'polygon' : 'amoy';

  const priceFeedAddress = PRICE_FEED_ADDRESSES[network].ethUsd;

  const { data: priceData } = useReadContract({
    address: priceFeedAddress,
    abi: CHAINLINK_PRICE_FEED_ABI,
    functionName: 'latestRoundData',
    query: {
      refetchInterval: 60000, // Refresh every 60 seconds
    },
  });

  if (!priceData) return null;

  // Chainlink returns price with 8 decimals
  const price = Number(priceData[1]) / 1e8;

  return {
    ethUsd: price,
    updatedAt: new Date(Number(priceData[3]) * 1000),
    roundId: priceData[0],
  };
}
```

#### 1.3 Create USD Display Component

**File:** `client/components/common/UsdValue.tsx`
```typescript
'use client';

import { useEthPrice } from '@/lib/web3/useEthPrice';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';

interface UsdValueProps {
  ethAmount: bigint | string;
  className?: string;
}

export function UsdValue({ ethAmount, className = '' }: UsdValueProps) {
  const { chain } = useAccount();
  const ethPrice = useEthPrice(chain?.id);

  if (!ethPrice) return <span className={className}>...</span>;

  const ethValue = typeof ethAmount === 'string'
    ? parseFloat(ethAmount)
    : parseFloat(formatEther(ethAmount));

  const usdValue = ethValue * ethPrice.ethUsd;

  return (
    <span className={className} title={`ETH/USD: $${ethPrice.ethUsd.toFixed(2)}`}>
      ≈ ${usdValue.toFixed(2)} USD
    </span>
  );
}
```

### Phase 2: Update UI Components

#### 2.1 TokenAcquisition Component

**Location:** `client/components/wallet/TokenAcquisition.tsx`

Add after line 288:
```typescript
<div className="text-xs text-purple-300 mb-3">
  {t('price')}: {tokenPrice ? formatEther(tokenPrice) : '...'} ETH per TALON
  {tokenPrice && (
    <span className="ml-2 text-green-300">
      <UsdValue ethAmount={tokenPrice} />
    </span>
  )}
</div>
```

#### 2.2 Admin Dashboard - SystemStats

**Location:** `client/components/admin/SystemStats.tsx`

Add USD values next to ETH values:
```typescript
<div className="text-white text-xl font-bold">
  {tokenPrice ? formatEther(tokenPrice) : '...'} ETH
  <div className="text-sm text-green-400 mt-1">
    <UsdValue ethAmount={tokenPrice || BigInt(0)} />
  </div>
</div>
```

#### 2.3 Admin Dashboard - TokenPriceControl

**Location:** `client/components/admin/TokenPriceControl.tsx`

Add USD calculator:
```typescript
<div className="mt-4 p-3 bg-blue-500/10 rounded border border-blue-500/30">
  <div className="text-xs text-blue-300 mb-2">USD Value Calculator</div>
  <div className="text-sm text-white">
    Current game cost (10 TALON):
    <span className="ml-2 font-bold text-green-400">
      <UsdValue ethAmount={parseEther(newPrice) * BigInt(10)} />
    </span>
  </div>
</div>
```

### Phase 3: Translation Updates

**Files:** `client/messages/en.json` and `es.json`

Add:
```json
{
  "common": {
    "usdValue": "USD Value",
    "ethUsdPrice": "ETH/USD Price"
  },
  "admin": {
    "usdCalculator": "USD Value Calculator",
    "currentGameCostUsd": "Current game cost (10 TALON)"
  }
}
```

### Phase 4: Testing

**Test Cases:**
1. ✓ ETH price displays correctly
2. ✓ USD values update every 60 seconds
3. ✓ Works on Sepolia testnet
4. ✓ Admin sees USD cost of games
5. ✓ Users see USD value when buying tokens
6. ✓ Falls back gracefully if Chainlink is unavailable

---

## Approach B: Contract-Integrated USD Pricing

### Phase 1: Smart Contract Changes

#### 1.1 Update GameToken.sol

Add Chainlink integration:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract GameToken is ERC20, Ownable {
    // Existing variables...
    uint256 public tokenPriceUsd;  // USD price with 8 decimals (e.g., 50 = $0.00000050)
    AggregatorV3Interface public priceFeed;

    constructor(
        uint256 initialSupply,
        uint256 _tokenPriceUsd,
        address _priceFeedAddress
    ) ERC20("TALON", "TALON") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
        tokenPriceUsd = _tokenPriceUsd;
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    /**
     * Get current token price in ETH
     * Calculates based on USD price and current ETH/USD rate
     */
    function getTokenPriceEth() public view returns (uint256) {
        (, int256 ethUsdPrice, , , ) = priceFeed.latestRoundData();
        require(ethUsdPrice > 0, "Invalid price feed");

        // tokenPriceUsd has 8 decimals, ethUsdPrice has 8 decimals
        // Result should be in wei (18 decimals)
        // Formula: (tokenPriceUsd * 1e18) / ethUsdPrice
        return (tokenPriceUsd * 1e18) / uint256(ethUsdPrice);
    }

    /**
     * Buy tokens with ETH at current rate
     */
    function buyTokens() external payable {
        require(msg.value > 0, "Must send ETH");

        uint256 currentPrice = getTokenPriceEth();
        uint256 tokenAmount = (msg.value * 10**18) / currentPrice;

        require(totalSupply() + tokenAmount <= MAX_SUPPLY, "Exceeds max supply");

        _mint(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, tokenAmount, msg.value);
    }

    /**
     * Set token price in USD terms (owner only)
     * @param _tokenPriceUsd Price with 8 decimals (e.g., 50 = $0.00000050)
     */
    function setTokenPriceUsd(uint256 _tokenPriceUsd) external onlyOwner {
        require(_tokenPriceUsd > 0, "Price must be positive");
        tokenPriceUsd = _tokenPriceUsd;
        emit TokenPriceUpdated(_tokenPriceUsd);
    }

    /**
     * Update price feed address (owner only)
     */
    function setPriceFeed(address _priceFeedAddress) external onlyOwner {
        require(_priceFeedAddress != address(0), "Invalid address");
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }
}
```

#### 1.2 Deployment Script Updates

**File:** `common/scripts/deploy.ts`

```typescript
const TOKEN_PRICE_USD = 50; // $0.00000050 per TALON (with 8 decimals)
const PRICE_FEED_ADDRESS = '0x694AA1769357215DE4FAC081bf1f309aDC325306'; // Sepolia ETH/USD

const gameToken = await GameToken.deploy(
  INITIAL_TOKEN_SUPPLY,
  TOKEN_PRICE_USD,
  PRICE_FEED_ADDRESS
);
```

### Phase 2: Frontend Updates

#### 2.1 Update ABIs

Add new functions to `GAMETOKEN_ABI`:
```typescript
{
  inputs: [],
  name: 'getTokenPriceEth',
  outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
},
{
  inputs: [],
  name: 'tokenPriceUsd',
  outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
},
{
  inputs: [{ internalType: 'uint256', name: '_tokenPriceUsd', type: 'uint256' }],
  name: 'setTokenPriceUsd',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}
```

#### 2.2 Update TokenPriceControl Component

Change to set price in USD:
```typescript
// Read USD price instead of ETH price
const { data: tokenPriceUsd } = useReadContract({
  address: tokenAddress,
  abi: GAMETOKEN_ABI,
  functionName: 'tokenPriceUsd',
});

// Read calculated ETH price
const { data: tokenPriceEth } = useReadContract({
  address: tokenAddress,
  abi: GAMETOKEN_ABI,
  functionName: 'getTokenPriceEth',
});

// Update to use setTokenPriceUsd
const handleSetPrice = () => {
  const usdPrice = parseFloat(newPriceUsd);
  writeContract({
    address: tokenAddress,
    abi: GAMETOKEN_ABI,
    functionName: 'setTokenPriceUsd',
    args: [BigInt(Math.floor(usdPrice * 1e8))], // Convert to 8 decimals
  });
};
```

### Phase 3: Testing & Deployment

**Steps:**
1. Test on local Hardhat network with Chainlink mock
2. Deploy to Sepolia testnet
3. Verify price feed is working
4. Test token purchases at various ETH prices
5. Monitor for 24 hours
6. Deploy to production if stable

---

## Cost Analysis

### Approach A (Display Only)
- **Contract Gas:** No change
- **Frontend Reads:** ~21,000 gas per Chainlink read (user pays via RPC, not transaction)
- **Development Time:** 4-6 hours
- **Risk:** Very low

### Approach B (Contract Integrated)
- **Contract Gas:** +~50,000 gas per buyTokens() call
- **Frontend Reads:** Same as current
- **Development Time:** 16-24 hours (includes testing, redeployment)
- **Risk:** Medium (new contract dependencies)

---

## Recommendation

**Start with Approach A (Display Only)**

**Reasons:**
1. ✅ No contract changes needed
2. ✅ Works immediately with current deployment
3. ✅ Low risk, easy to test
4. ✅ Gives users USD transparency
5. ✅ Can upgrade to Approach B later if needed

**Implementation Order:**
1. Phase 1: Add Chainlink hook and USD component (2 hours)
2. Phase 2: Update TokenAcquisition UI (1 hour)
3. Phase 3: Update Admin Dashboard (1 hour)
4. Phase 4: Test on Sepolia (1 hour)
5. Total: ~5 hours

**Future Enhancement:**
- If USD volatility becomes an issue, consider Approach B
- Could also implement dynamic pricing: "Game always costs $0.50"

---

## Additional Resources

- **Chainlink Docs:** https://docs.chain.link/data-feeds/price-feeds
- **Chainlink Feeds:** https://docs.chain.link/data-feeds/price-feeds/addresses
- **Chainstack:** https://chainstack.com/ (for reliable RPC endpoints)
- **Wagmi Docs:** https://wagmi.sh/react/hooks/useReadContract

---

## Next Steps

1. Review this plan
2. Choose Approach A or B
3. If Approach A: Begin implementation
4. If Approach B: Create detailed test plan first
