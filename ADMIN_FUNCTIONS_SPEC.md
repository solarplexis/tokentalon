# TokenTalon Admin Functions - High-Level Specification

## Executive Summary

This document outlines a comprehensive plan for implementing administrative functions to manage the TokenTalon claw machine game. The goal is to provide contract deployers (admins) with flexible control over game parameters, economics, and system configuration without requiring contract redeployment.

---

## Current State Analysis

### Existing Admin Functions

**GameToken.sol (Ownable)**
- ✅ `setTokenPrice(uint256)` - Update token price
- ✅ `mint(address, uint256)` - Mint new tokens
- ✅ `withdraw()` - Withdraw ETH from token sales
- ❌ `FAUCET_AMOUNT` - **Hardcoded constant (500 tokens)**
- ❌ `FAUCET_COOLDOWN` - **Hardcoded constant (5 minutes)**

**ClawMachine.sol (Ownable)**
- ✅ `setOracleAddress(address)` - Update oracle signer
- ✅ `setCostPerPlay(uint256)` - Update game cost
- ✅ `withdrawTokens()` - Withdraw accumulated tokens

**PrizeNFT.sol**
- ✅ `setMinter(address)` - Update authorized minter
- ✅ `setBaseURI(string)` - Update base metadata URI

### Key Problem

**Faucet parameters are immutable constants**, preventing admins from:
1. Adjusting faucet amount for different testing scenarios
2. Changing cooldown period for mainnet vs testnet
3. Temporarily disabling faucet without contract upgrade
4. Gradually reducing faucet amount as token value increases

---

## Proposed Admin Function Categories

### 1. **Game Economics** 🎮
Control over in-game pricing and rewards

### 2. **Faucet Management** 💧
Testnet token distribution controls

### 3. **System Configuration** ⚙️
Technical parameters and addresses

### 4. **Emergency Controls** 🚨
Circuit breakers and safety mechanisms

### 5. **Analytics & Monitoring** 📊
Read-only functions for system health

---

## Detailed Specifications

### 1. Game Economics Functions

#### 1.1 Token Pricing
```solidity
// GameToken.sol - EXISTING
function setTokenPrice(uint256 newPrice) external onlyOwner
```
**Status**: ✅ Implemented
**Use Case**: Adjust ETH:TALON exchange rate based on market conditions

#### 1.2 Game Cost
```solidity
// ClawMachine.sol - EXISTING
function setCostPerPlay(uint256 newCost) external onlyOwner
```
**Status**: ✅ Implemented
**Use Case**: Balance game difficulty and revenue

#### 1.3 Prize Pool Management (NEW)
```solidity
// ClawMachine.sol - PROPOSED
function setPrizeWeights(uint256[] calldata prizeIds, uint256[] calldata weights) external onlyOwner
function setPrizeActive(uint256 prizeId, bool active) external onlyOwner
```
**Status**: ❌ Not implemented
**Use Case**: Control prize rarity distribution, enable/disable seasonal prizes

---

### 2. Faucet Management Functions ⭐ **PRIMARY FOCUS**

#### 2.1 Faucet Amount (NEEDS IMPLEMENTATION)
```solidity
// GameToken.sol - MODIFY EXISTING
uint256 public faucetAmount = 500 * 10**18; // Changed from constant

function setFaucetAmount(uint256 newAmount) external onlyOwner {
    require(newAmount > 0, "Amount must be positive");
    require(newAmount <= 10000 * 10**18, "Amount too large");
    uint256 oldAmount = faucetAmount;
    faucetAmount = newAmount;
    emit FaucetAmountUpdated(oldAmount, newAmount);
}
```

**Rationale**:
- **Testnet**: Higher amounts (500-1000 TALON) for rapid testing
- **Mainnet**: Lower amounts (10-50 TALON) or disabled entirely
- **Promotional**: Temporary increases during marketing campaigns
- **Economic**: Decrease as token value increases

#### 2.2 Faucet Cooldown (NEEDS IMPLEMENTATION)
```solidity
// GameToken.sol - MODIFY EXISTING
uint256 public faucetCooldown = 5 minutes; // Changed from constant

function setFaucetCooldown(uint256 newCooldown) external onlyOwner {
    require(newCooldown >= 1 minutes, "Cooldown too short");
    require(newCooldown <= 7 days, "Cooldown too long");
    uint256 oldCooldown = faucetCooldown;
    faucetCooldown = newCooldown;
    emit FaucetCooldownUpdated(oldCooldown, newCooldown);
}
```

**Use Cases**:
- **Development**: 1-5 minutes for rapid testing
- **Testnet**: 1-24 hours for realistic testing
- **Mainnet**: 24 hours - 7 days for anti-abuse
- **Promotional**: Temporary reductions

#### 2.3 Faucet Enable/Disable (NEEDS IMPLEMENTATION)
```solidity
// GameToken.sol - NEW
bool public faucetEnabled = true;

function setFaucetEnabled(bool enabled) external onlyOwner {
    faucetEnabled = enabled;
    emit FaucetStatusUpdated(enabled);
}

// Modify claimFaucet()
function claimFaucet() external {
    require(faucetEnabled, "Faucet is disabled");
    // ... rest of logic
}
```

**Use Cases**:
- Disable faucet on mainnet without removing code
- Temporary disable during migrations
- Emergency disable if exploited

#### 2.4 Per-Address Faucet Limits (OPTIONAL - FUTURE)
```solidity
// GameToken.sol - FUTURE ENHANCEMENT
uint256 public faucetLifetimeLimit = 5000 * 10**18; // Max total claims per address
mapping(address => uint256) public totalFaucetClaimed;

function setFaucetLifetimeLimit(uint256 newLimit) external onlyOwner
```

**Use Case**: Prevent single address from draining testnet faucet

---

### 3. System Configuration Functions

#### 3.1 Oracle Management
```solidity
// ClawMachine.sol - EXISTING
function setOracleAddress(address newOracle) external onlyOwner
```
**Status**: ✅ Implemented
**Use Case**: Rotate signing keys, update backend server address

#### 3.2 Contract Addresses (NEEDS ENHANCEMENT)
```solidity
// ClawMachine.sol - CURRENT: Immutable
// PROPOSED: Allow updating PrizeNFT address for upgrades
address public prizeNFTAddress; // Changed from immutable

function setPrizeNFTAddress(address newAddress) external onlyOwner {
    require(newAddress != address(0), "Invalid address");
    address oldAddress = prizeNFTAddress;
    prizeNFTAddress = newAddress;
    emit PrizeNFTAddressUpdated(oldAddress, newAddress);
}
```

**Rationale**: Enable contract upgrades without full system redeployment

#### 3.3 Metadata URIs
```solidity
// PrizeNFT.sol - EXISTING
function setBaseURI(string calldata newURI) external onlyOwner
```
**Status**: ✅ Implemented
**Use Case**: Switch IPFS gateways, update metadata storage

---

### 4. Emergency Controls

#### 4.1 Circuit Breaker (NEEDS IMPLEMENTATION)
```solidity
// ClawMachine.sol - NEW
bool public paused = false;

modifier whenNotPaused() {
    require(!paused, "Contract is paused");
    _;
}

function setPaused(bool _paused) external onlyOwner {
    paused = _paused;
    emit PausedStatusUpdated(_paused);
}

// Add to critical functions
function payForGrab() external whenNotPaused { ... }
function claimPrize(...) external whenNotPaused { ... }
```

**Use Cases**:
- Security incidents
- Smart contract bugs discovered
- Scheduled maintenance
- Network issues

#### 4.2 Emergency Withdraw (EXISTING)
```solidity
// GameToken.sol - EXISTING
function withdraw() external onlyOwner

// ClawMachine.sol - EXISTING
function withdrawTokens() external onlyOwner
```
**Status**: ✅ Implemented

---

### 5. Analytics & Monitoring Functions

#### 5.1 System Health (NEW READ-ONLY)
```solidity
// ClawMachine.sol - PROPOSED
function getSystemStats() external view returns (
    uint256 totalGrabs,
    uint256 totalPrizesClaimed,
    uint256 contractTokenBalance,
    uint256 uniquePlayers
)

function getPlayerStats(address player) external view returns (
    uint256 totalGrabs,
    uint256 totalSpent,
    uint256 prizesWon,
    uint256 lastPlayTime
)
```

**Use Case**: Admin dashboard, analytics, monitoring

---

## Contract Address Management & Synchronization ⭐ **CRITICAL**

### Problem Statement

**Current Pain Point**: Deploying contracts and keeping addresses synchronized across three system components (contracts, frontend, backend) requires manual updates and is extremely error-prone, consuming ~6 hours over 3 days debugging address mismatches.

**Symptoms**:
- Deploy new GameToken → forget to update frontend config
- Update ClawMachine address in backend → forget to update deployment scripts
- Different addresses between local testing and testnet
- Silent failures when calling wrong contract address
- Difficult to trace which version is deployed where

### Root Causes

1. **No Single Source of Truth**: Addresses scattered across multiple files
2. **Manual Process**: Copy-paste addresses after deployment
3. **No Validation**: Can't verify addresses match across systems
4. **No Deployment History**: Hard to know what's deployed where
5. **No Automated Sync**: Each deployment requires manual updates

---

### Proposed Solution: Unified Deployment System

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PROCESS                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Deploy Contracts │
                    │   (Hardhat)       │
                    └──────────────────┘
                              │
                              ▼
                 ┌──────────────────────────┐
                 │  Write to deployments/   │
                 │  {network}.json          │
                 │  (Single Source of Truth)│
                 └──────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
      ┌──────────────────┐      ┌──────────────────┐
      │  Auto-Generate   │      │  Auto-Generate   │
      │  Frontend Config │      │  Backend Config  │
      └──────────────────┘      └──────────────────┘
                 │                         │
                 └────────────┬────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │ Validation Script  │
                   │ ✓ Addresses match  │
                   │ ✓ Contracts valid  │
                   │ ✓ ABIs match       │
                   └────────────────────┘
```

---

### Implementation Details

#### 1. Single Source of Truth: `deployments/{network}.json`

**File Structure**:
```json
// common/deployments/sepolia.json
{
  "network": "sepolia",
  "chainId": 11155111,
  "deployedAt": "2025-11-27T10:30:00.000Z",
  "deployer": "0x1234...abcd",
  "contracts": {
    "GameToken": {
      "address": "0x5678...ef01",
      "deployedAt": "2025-11-27T10:25:00.000Z",
      "blockNumber": 4567890,
      "transactionHash": "0xabc...123",
      "constructorArgs": [1000000, "1000000000000000"],
      "verified": true,
      "version": "1.2.0"
    },
    "ClawMachine": {
      "address": "0x9abc...def2",
      "deployedAt": "2025-11-27T10:28:00.000Z",
      "blockNumber": 4567895,
      "transactionHash": "0xdef...456",
      "constructorArgs": ["0x5678...ef01", "0x1234...5678", "0xabcd...ef01", "10000000000000000000"],
      "verified": true,
      "version": "1.2.0"
    },
    "PrizeNFT": {
      "address": "0x1234...5678",
      "deployedAt": "2025-11-27T10:26:00.000Z",
      "blockNumber": 4567892,
      "transactionHash": "0x789...abc",
      "constructorArgs": ["0x9abc...def2"],
      "verified": true,
      "version": "1.0.0"
    }
  },
  "oracle": {
    "address": "0xabcd...ef01",
    "description": "Backend signing wallet"
  },
  "metadata": {
    "rpcUrl": "https://sepolia.infura.io/v3/...",
    "explorerUrl": "https://sepolia.etherscan.io",
    "gasPrice": "20000000000",
    "deploymentNotes": "Updated faucet parameters to be configurable"
  }
}
```

**Benefits**:
- Complete deployment history
- Transaction hashes for verification
- Constructor args for contract verification
- Metadata for context

#### 2. Automated Deployment Script

```typescript
// common/scripts/deploy-and-sync.ts
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentRecord {
  address: string;
  deployedAt: string;
  blockNumber: number;
  transactionHash: string;
  constructorArgs: any[];
  verified: boolean;
  version: string;
}

interface NetworkDeployment {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
  contracts: Record<string, DeploymentRecord>;
  oracle: {
    address: string;
    description: string;
  };
  metadata: {
    rpcUrl: string;
    explorerUrl: string;
    gasPrice: string;
    deploymentNotes: string;
  };
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();

  console.log(`📡 Deploying to ${network.name} (chainId: ${network.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);

  // Deploy contracts
  const gameToken = await deployGameToken();
  const prizeNFT = await deployPrizeNFT();
  const clawMachine = await deployClawMachine(gameToken.address, prizeNFT.address);

  // Create deployment record
  const deployment: NetworkDeployment = {
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      GameToken: {
        address: await gameToken.getAddress(),
        deployedAt: new Date().toISOString(),
        blockNumber: gameToken.deploymentTransaction()?.blockNumber || 0,
        transactionHash: gameToken.deploymentTransaction()?.hash || "",
        constructorArgs: [1000000, ethers.parseEther("0.001")],
        verified: false,
        version: "1.2.0"
      },
      // ... similar for other contracts
    },
    oracle: {
      address: process.env.ORACLE_ADDRESS || deployer.address,
      description: "Backend signing wallet"
    },
    metadata: {
      rpcUrl: process.env[`${network.name.toUpperCase()}_RPC_URL`] || "",
      explorerUrl: getExplorerUrl(network.name),
      gasPrice: (await ethers.provider.getFeeData()).gasPrice?.toString() || "0",
      deploymentNotes: process.env.DEPLOYMENT_NOTES || ""
    }
  };

  // Save to deployments/{network}.json
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`✅ Deployment record saved to ${deploymentPath}`);

  // Auto-sync to frontend and backend
  await syncToFrontend(deployment);
  await syncToBackend(deployment);

  // Run validation
  await validateDeployment(deployment);

  console.log(`✅ Deployment complete and synced!`);
}

async function syncToFrontend(deployment: NetworkDeployment) {
  // Generate client/lib/contracts/addresses.ts
  const frontendConfig = `
// Auto-generated by deploy-and-sync.ts - DO NOT EDIT MANUALLY
// Last updated: ${deployment.deployedAt}

export const CONTRACTS = {
  ${deployment.network}: {
    gameToken: "${deployment.contracts.GameToken.address}",
    clawMachine: "${deployment.contracts.ClawMachine.address}",
    prizeNFT: "${deployment.contracts.PrizeNFT.address}",
  }
} as const;

export const ORACLE_ADDRESS = "${deployment.oracle.address}";
export const NETWORK_CONFIG = {
  chainId: ${deployment.chainId},
  explorerUrl: "${deployment.metadata.explorerUrl}",
} as const;
`;

  const frontendPath = path.join(__dirname, "../../client/lib/contracts/addresses.ts");
  fs.writeFileSync(frontendPath, frontendConfig);
  console.log(`✅ Frontend config synced to ${frontendPath}`);
}

async function syncToBackend(deployment: NetworkDeployment) {
  // Generate server/src/config/contracts.ts
  const backendConfig = `
// Auto-generated by deploy-and-sync.ts - DO NOT EDIT MANUALLY
// Last updated: ${deployment.deployedAt}

export const CONTRACTS = {
  ${deployment.network}: {
    gameToken: "${deployment.contracts.GameToken.address}",
    clawMachine: "${deployment.contracts.ClawMachine.address}",
    prizeNFT: "${deployment.contracts.PrizeNFT.address}",
  }
};

export const ORACLE_ADDRESS = "${deployment.oracle.address}";
export const NETWORK_CONFIG = {
  chainId: ${deployment.chainId},
  rpcUrl: "${deployment.metadata.rpcUrl}",
};
`;

  const backendPath = path.join(__dirname, "../../server/src/config/contracts.ts");
  fs.writeFileSync(backendPath, backendConfig);
  console.log(`✅ Backend config synced to ${backendPath}`);
}

main().catch(console.error);
```

#### 3. Validation Script

```typescript
// common/scripts/validate-deployment.ts
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function validateDeployment(networkName: string) {
  console.log(`🔍 Validating ${networkName} deployment...`);

  // Load deployment record
  const deploymentPath = path.join(__dirname, `../deployments/${networkName}.json`);
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  const checks = {
    addressesExist: false,
    contractsDeployed: false,
    abiMatches: false,
    frontendSynced: false,
    backendSynced: false,
    ownershipCorrect: false,
  };

  // 1. Check all addresses are valid
  for (const [name, contract] of Object.entries(deployment.contracts)) {
    if (!ethers.isAddress(contract.address)) {
      console.error(`❌ Invalid address for ${name}: ${contract.address}`);
      return false;
    }
  }
  checks.addressesExist = true;
  console.log(`✅ All addresses are valid Ethereum addresses`);

  // 2. Check contracts are actually deployed on-chain
  const provider = ethers.getDefaultProvider(deployment.metadata.rpcUrl);
  for (const [name, contract] of Object.entries(deployment.contracts)) {
    const code = await provider.getCode(contract.address);
    if (code === "0x") {
      console.error(`❌ No contract deployed at ${name}: ${contract.address}`);
      return false;
    }
  }
  checks.contractsDeployed = true;
  console.log(`✅ All contracts deployed on-chain`);

  // 3. Check frontend config matches
  const frontendPath = path.join(__dirname, "../../client/lib/contracts/addresses.ts");
  const frontendContent = fs.readFileSync(frontendPath, "utf-8");

  for (const [name, contract] of Object.entries(deployment.contracts)) {
    if (!frontendContent.includes(contract.address.toLowerCase())) {
      console.error(`❌ Frontend missing address for ${name}`);
      return false;
    }
  }
  checks.frontendSynced = true;
  console.log(`✅ Frontend config matches deployment`);

  // 4. Check backend config matches
  const backendPath = path.join(__dirname, "../../server/src/config/contracts.ts");
  const backendContent = fs.readFileSync(backendPath, "utf-8");

  for (const [name, contract] of Object.entries(deployment.contracts)) {
    if (!backendContent.includes(contract.address.toLowerCase())) {
      console.error(`❌ Backend missing address for ${name}`);
      return false;
    }
  }
  checks.backendSynced = true;
  console.log(`✅ Backend config matches deployment`);

  // 5. Check contract ownership
  const gameToken = await ethers.getContractAt(
    "GameToken",
    deployment.contracts.GameToken.address,
    provider
  );
  const owner = await gameToken.owner();
  if (owner.toLowerCase() !== deployment.deployer.toLowerCase()) {
    console.warn(`⚠️  GameToken owner (${owner}) differs from deployer (${deployment.deployer})`);
  } else {
    checks.ownershipCorrect = true;
    console.log(`✅ Contract ownership verified`);
  }

  // Summary
  console.log("\n📊 Validation Summary:");
  console.log(`  Addresses valid: ${checks.addressesExist ? "✅" : "❌"}`);
  console.log(`  Contracts deployed: ${checks.contractsDeployed ? "✅" : "❌"}`);
  console.log(`  Frontend synced: ${checks.frontendSynced ? "✅" : "❌"}`);
  console.log(`  Backend synced: ${checks.backendSynced ? "✅" : "❌"}`);
  console.log(`  Ownership correct: ${checks.ownershipCorrect ? "✅" : "❌"}`);

  const allPassed = Object.values(checks).every(check => check);
  if (allPassed) {
    console.log("\n✅ All validation checks passed!");
  } else {
    console.log("\n❌ Some validation checks failed!");
  }

  return allPassed;
}

// Run validation
const networkName = process.argv[2] || "sepolia";
validateDeployment(networkName).catch(console.error);
```

#### 4. Quick Reference Script

```typescript
// common/scripts/show-addresses.ts
import fs from "fs";
import path from "path";

function showAddresses(networkName: string) {
  const deploymentPath = path.join(__dirname, `../deployments/${networkName}.json`);

  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ No deployment found for ${networkName}`);
    console.log(`Available networks: ${getAvailableNetworks().join(", ")}`);
    return;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  console.log(`\n📋 ${networkName.toUpperCase()} Deployment Info`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Network: ${deployment.network} (Chain ID: ${deployment.chainId})`);
  console.log(`Deployed: ${new Date(deployment.deployedAt).toLocaleString()}`);
  console.log(`Deployer: ${deployment.deployer}`);
  console.log(`\n📄 Contracts:`);

  for (const [name, contract] of Object.entries(deployment.contracts)) {
    console.log(`\n  ${name}:`);
    console.log(`    Address: ${contract.address}`);
    console.log(`    Explorer: ${deployment.metadata.explorerUrl}/address/${contract.address}`);
    console.log(`    Verified: ${contract.verified ? "✅" : "❌"}`);
    console.log(`    Version: ${contract.version}`);
  }

  console.log(`\n🔐 Oracle:`);
  console.log(`    Address: ${deployment.oracle.address}`);
  console.log(`    Description: ${deployment.oracle.description}`);

  console.log(`\n📝 Notes: ${deployment.metadata.deploymentNotes || "None"}`);
  console.log(`${"=".repeat(50)}\n`);
}

function getAvailableNetworks(): string[] {
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) return [];

  return fs.readdirSync(deploymentsDir)
    .filter(file => file.endsWith(".json"))
    .map(file => file.replace(".json", ""));
}

const networkName = process.argv[2] || "sepolia";
showAddresses(networkName);
```

#### 5. Git Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check if deployments are in sync before committing

echo "🔍 Checking deployment synchronization..."

if ! npx ts-node common/scripts/validate-deployment.ts sepolia --quiet; then
  echo "❌ Deployment validation failed!"
  echo "Run: npm run validate-deployment"
  exit 1
fi

echo "✅ Deployment validation passed!"
exit 0
```

---

### Usage Workflow

#### Initial Setup
```bash
# One-time setup
cd common
npm install --save-dev @types/node inquirer
mkdir -p deployments
```

#### Deploy New Contracts
```bash
# Deploy and auto-sync everything
npx hardhat run scripts/deploy-and-sync.ts --network sepolia

# Output:
# 📡 Deploying to sepolia (chainId: 11155111)
# 👤 Deployer: 0x1234...
# ✅ GameToken deployed: 0x5678...
# ✅ ClawMachine deployed: 0x9abc...
# ✅ PrizeNFT deployed: 0x1234...
# ✅ Deployment record saved
# ✅ Frontend config synced
# ✅ Backend config synced
# 🔍 Running validation...
# ✅ All validation checks passed!
```

#### Validate Existing Deployment
```bash
# Check if everything is in sync
npm run validate-deployment sepolia

# Output:
# 🔍 Validating sepolia deployment...
# ✅ All addresses are valid Ethereum addresses
# ✅ All contracts deployed on-chain
# ✅ Frontend config matches deployment
# ✅ Backend config matches deployment
# ✅ Contract ownership verified
# ✅ All validation checks passed!
```

#### Quick Address Lookup
```bash
# Show all deployment info
npm run show-addresses sepolia

# Output:
# 📋 SEPOLIA Deployment Info
# ==================================================
# Network: sepolia (Chain ID: 11155111)
# Deployed: 11/27/2025, 10:30:00 AM
# Deployer: 0x1234...abcd
#
# 📄 Contracts:
#   GameToken:
#     Address: 0x5678...ef01
#     Explorer: https://sepolia.etherscan.io/address/0x5678...ef01
#     Verified: ✅
#     Version: 1.2.0
# ...
```

#### Emergency: Manual Address Update
```bash
# If you must manually update an address
npm run update-address sepolia GameToken 0xNEW_ADDRESS

# This will:
# 1. Update deployments/sepolia.json
# 2. Re-sync frontend and backend
# 3. Run validation
# 4. Prompt for git commit
```

---

### File Structure
```
tokentalon/
├── common/
│   ├── deployments/           (NEW - gitignored for local, committed for shared)
│   │   ├── sepolia.json       (NEW)
│   │   ├── mainnet.json       (NEW)
│   │   └── localhost.json     (NEW)
│   ├── scripts/
│   │   ├── deploy-and-sync.ts      (NEW - replaces manual deployment)
│   │   ├── validate-deployment.ts  (NEW)
│   │   ├── show-addresses.ts       (NEW)
│   │   └── update-address.ts       (NEW - emergency manual update)
│   └── package.json
│       scripts: {
│         "deploy": "hardhat run scripts/deploy-and-sync.ts",
│         "validate": "ts-node scripts/validate-deployment.ts",
│         "addresses": "ts-node scripts/show-addresses.ts"
│       }
├── client/
│   └── lib/
│       └── contracts/
│           └── addresses.ts   (MODIFIED - auto-generated, don't edit manually)
└── server/
    └── src/
        └── config/
            └── contracts.ts   (MODIFIED - auto-generated, don't edit manually)
```

---

### Git Strategy

**Option 1: Commit Deployment Files (Recommended for teams)**
```gitignore
# Don't ignore deployments - commit them
# common/deployments/
```
**Pros**: Team shares deployment info, single source of truth
**Cons**: Merge conflicts if multiple people deploy

**Option 2: Ignore Deployments (For solo dev)**
```gitignore
# Ignore local deployments
common/deployments/
```
**Pros**: No merge conflicts
**Cons**: Must share deployment info manually

---

### NPM Scripts to Add

```json
// common/package.json
{
  "scripts": {
    "deploy": "hardhat run scripts/deploy-and-sync.ts",
    "deploy:sepolia": "hardhat run scripts/deploy-and-sync.ts --network sepolia",
    "deploy:mainnet": "hardhat run scripts/deploy-and-sync.ts --network mainnet",

    "validate": "ts-node scripts/validate-deployment.ts",
    "validate:sepolia": "ts-node scripts/validate-deployment.ts sepolia",

    "addresses": "ts-node scripts/show-addresses.ts",
    "addresses:sepolia": "ts-node scripts/show-addresses.ts sepolia",

    "sync": "ts-node scripts/sync-addresses.ts",
    "sync:force": "ts-node scripts/sync-addresses.ts --force"
  }
}
```

---

### Benefits of This System

1. **⏱️ Time Savings**: Deploy and sync in ~2 minutes vs 30 minutes manual
2. **🔒 Reliability**: Automated sync eliminates human error
3. **✅ Validation**: Catch mismatches before they cause issues
4. **📚 History**: Complete audit trail of all deployments
5. **🔄 Reproducible**: Anyone can redeploy with exact same config
6. **👥 Team-Friendly**: Shared deployment info across team
7. **🐛 Debugging**: Easy to verify what's deployed where

---

### Acceptance Criteria

#### Address Management Complete When:
- ✅ Single `deployments/{network}.json` file is source of truth
- ✅ Deploy script auto-syncs to frontend and backend
- ✅ Validation script catches address mismatches
- ✅ Frontend imports addresses from auto-generated file
- ✅ Backend imports addresses from auto-generated file
- ✅ Can deploy and sync in < 3 minutes
- ✅ Validation runs automatically before commits
- ✅ Team members can see current deployment status
- ✅ Documentation complete with examples
- ✅ Zero manual copy-paste of addresses needed

---

## Implementation Approach

### Phase 1A: Address Management System (Days 1-2) ⭐⭐ **HIGHEST PRIORITY**

**Goal**: Eliminate 6-hour debugging cycles from address mismatches

**Why First**: This must be implemented before deploying any new contracts, as it will save massive time on all future deployments.

1. **Create Deployment Infrastructure**
   - Create `common/deployments/` directory
   - Implement `deploy-and-sync.ts` script
   - Implement `validate-deployment.ts` script
   - Implement `show-addresses.ts` script
   - Implement `update-address.ts` emergency script

2. **Auto-Generate Config Files**
   - Setup auto-generation of `client/lib/contracts/addresses.ts`
   - Setup auto-generation of `server/src/config/contracts.ts`
   - Add header comments: "Auto-generated - DO NOT EDIT MANUALLY"
   - Update `.gitignore` appropriately

3. **Add NPM Scripts**
   - `npm run deploy` - Deploy and sync everything
   - `npm run validate` - Validate deployment sync
   - `npm run addresses` - Show deployment info
   - Add to `package.json` in common/

4. **Test the System**
   - Deploy contracts to local hardhat network
   - Verify auto-sync works
   - Verify validation catches mismatches
   - Deploy to Sepolia testnet
   - Confirm all addresses match across 3 systems

**Acceptance**:
- ✅ Can deploy and sync in < 3 minutes
- ✅ Validation script catches any mismatch
- ✅ Zero manual copy-paste needed
- ✅ Complete deployment history in JSON files

**Time Estimate**: 1-2 days
**ROI**: Saves 6 hours every deployment cycle

---

### Phase 1B: Faucet Configuration (Days 3-5) ⭐ **HIGH PRIORITY**

**Goal**: Make faucet parameters configurable

1. **Modify GameToken.sol**
   - Change `FAUCET_AMOUNT` from constant to state variable
   - Change `FAUCET_COOLDOWN` from constant to state variable
   - Add `setFaucetAmount()` function
   - Add `setFaucetCooldown()` function
   - Add `setFaucetEnabled()` function
   - Add events for all updates
   - Write comprehensive tests

2. **Deploy Updated Contract**
   - Use new `deploy-and-sync.ts` script (from Phase 1A)
   - Auto-sync to frontend and backend
   - Verify on Etherscan
   - Run validation to confirm sync

3. **Create Admin Scripts**
   - `scripts/admin/set-faucet-amount.ts`
   - `scripts/admin/set-faucet-cooldown.ts`
   - `scripts/admin/toggle-faucet.ts`

**Acceptance**:
- ✅ Faucet amount adjustable without redeployment
- ✅ Faucet cooldown adjustable without redeployment
- ✅ Admin scripts work end-to-end
- ✅ All tests pass

**Time Estimate**: 2-3 days

### Phase 2: Admin CLI Tool (Week 2)

**Goal**: Create command-line interface for all admin functions

```bash
# Example usage
npm run admin -- set-faucet-amount --amount 1000 --network sepolia
npm run admin -- set-faucet-cooldown --minutes 10 --network sepolia
npm run admin -- set-game-cost --cost 5 --network sepolia
npm run admin -- pause-game --network sepolia
npm run admin -- get-stats --network sepolia
```

**Implementation**:
- Create `common/scripts/admin-cli.ts`
- Use Commander.js for argument parsing
- Interactive prompts with Inquirer.js
- Confirmation before executing transactions
- Transaction receipt logging
- Error handling and recovery

### Phase 3: Admin Web Dashboard (Week 3-4)

**Goal**: Web interface for non-technical admins

**Features**:
- Connect wallet (admin only)
- View system statistics
- Adjust parameters with sliders/inputs
- Real-time transaction status
- Historical change logs
- Emergency pause button

**Tech Stack**:
- Next.js page at `/admin`
- Wagmi hooks for contract interaction
- TailwindCSS styling matching main site
- Authentication: Check if connected wallet is contract owner

### Phase 4: Advanced Features (Future)

1. **Multi-sig Admin**
   - Integrate Gnosis Safe
   - Require 2-of-3 signatures for critical changes

2. **Timelock Controller**
   - 24-hour delay on major changes
   - Allow community review

3. **Automated Monitoring**
   - Alert if contract balance low
   - Alert on suspicious activity
   - Webhook notifications

---

## Security Considerations

### Access Control

**Current**: Simple `Ownable` pattern (single admin)

**Concerns**:
- Single point of failure
- No separation of duties
- Admin key compromise = full system compromise

**Recommendations**:

1. **Immediate** (Use with current system):
   - Store admin private key in hardware wallet (Ledger/Trezor)
   - Use separate admin key for each network (testnet vs mainnet)
   - Never commit private keys to git
   - Use environment variables for key management

2. **Short-term Enhancement**:
   ```solidity
   // Add role-based access control
   bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
   bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

   // Operators can adjust minor parameters
   function setFaucetAmount(uint256) external onlyRole(OPERATOR_ROLE)

   // Owner can adjust critical parameters
   function setOracleAddress(address) external onlyOwner
   ```

3. **Long-term** (Production):
   - Multi-sig wallet (Gnosis Safe)
   - Timelock controller for critical functions
   - Emergency role for pause functionality

### Parameter Bounds

**All setter functions must validate inputs**:

```solidity
function setFaucetAmount(uint256 newAmount) external onlyOwner {
    require(newAmount > 0, "Amount must be positive");
    require(newAmount <= MAX_FAUCET_AMOUNT, "Amount exceeds maximum");
    // ...
}

function setFaucetCooldown(uint256 newCooldown) external onlyOwner {
    require(newCooldown >= MIN_COOLDOWN, "Cooldown too short");
    require(newCooldown <= MAX_COOLDOWN, "Cooldown too long");
    // ...
}
```

**Suggested Bounds**:
- Faucet Amount: 1 TALON - 10,000 TALON
- Faucet Cooldown: 1 minute - 30 days
- Game Cost: 1 TALON - 1,000 TALON
- Token Price: 0.0001 ETH - 1 ETH

### Event Logging

**All administrative actions MUST emit events**:

```solidity
event FaucetAmountUpdated(uint256 oldAmount, uint256 newAmount);
event FaucetCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
event FaucetStatusUpdated(bool enabled);
event GamePaused(address indexed admin);
event GameUnpaused(address indexed admin);
```

**Benefits**:
- Transparency (on-chain audit trail)
- Off-chain monitoring and alerts
- Frontend can react to changes
- Historical analysis

---

## Testing Strategy

### Unit Tests (Hardhat)

```typescript
// test/GameToken.admin.test.ts
describe("GameToken Admin Functions", () => {
  describe("setFaucetAmount", () => {
    it("should allow owner to update faucet amount");
    it("should revert if non-owner calls");
    it("should revert if amount is 0");
    it("should revert if amount exceeds maximum");
    it("should emit FaucetAmountUpdated event");
  });

  describe("setFaucetCooldown", () => {
    it("should allow owner to update cooldown");
    it("should revert if cooldown too short");
    it("should revert if cooldown too long");
    it("should affect next faucet claim");
  });
});
```

### Integration Tests

1. **Testnet Deployment**
   - Deploy contracts to Sepolia
   - Execute admin functions
   - Verify state changes
   - Test frontend integration

2. **Forked Mainnet**
   - Fork mainnet state
   - Simulate admin operations
   - Test upgrade scenarios

---

## File Structure

```
tokentalon/
├── common/
│   ├── contracts/
│   │   ├── GameToken.sol (MODIFY - add faucet setters)
│   │   ├── ClawMachine.sol (MODIFY - add pause, stats)
│   │   └── PrizeNFT.sol
│   ├── scripts/
│   │   ├── admin/
│   │   │   ├── admin-cli.ts (NEW - CLI tool)
│   │   │   ├── set-faucet-amount.ts (NEW)
│   │   │   ├── set-faucet-cooldown.ts (NEW)
│   │   │   ├── toggle-faucet.ts (NEW)
│   │   │   ├── set-game-cost.ts (NEW)
│   │   │   ├── pause-game.ts (NEW)
│   │   │   ├── withdraw-funds.ts (NEW)
│   │   │   └── get-system-stats.ts (NEW)
│   │   └── deploy/
│   └── test/
│       ├── GameToken.admin.test.ts (NEW)
│       └── ClawMachine.admin.test.ts (NEW)
├── client/
│   ├── app/
│   │   └── admin/
│   │       └── page.tsx (NEW - Phase 3)
│   └── components/
│       └── admin/
│           ├── AdminDashboard.tsx (NEW - Phase 3)
│           ├── FaucetControls.tsx (NEW - Phase 3)
│           └── GameControls.tsx (NEW - Phase 3)
└── ADMIN_FUNCTIONS_SPEC.md (THIS FILE)
```

---

## Example: Admin CLI Usage

### Setting Faucet Amount

```bash
# Navigate to common directory
cd common

# Set faucet amount to 1000 TALON on Sepolia testnet
npx hardhat run scripts/admin/set-faucet-amount.ts --network sepolia

# Interactive prompts:
# ? Current faucet amount: 500 TALON
# ? Enter new faucet amount: 1000
# ? Confirm change from 500 to 1000 TALON? Yes
# ⏳ Sending transaction...
# ✅ Transaction confirmed: 0x123abc...
# ✅ Faucet amount updated to 1000 TALON
```

### Script Implementation

```typescript
// common/scripts/admin/set-faucet-amount.ts
import { ethers } from "hardhat";
import inquirer from "inquirer";

async function main() {
  const [deployer] = await ethers.getSigners();

  const gameToken = await ethers.getContractAt(
    "GameToken",
    process.env.GAMETOKEN_ADDRESS!
  );

  // Get current value
  const currentAmount = await gameToken.faucetAmount();
  console.log(`Current faucet amount: ${ethers.formatEther(currentAmount)} TALON`);

  // Prompt for new value
  const { newAmount } = await inquirer.prompt([{
    type: 'number',
    name: 'newAmount',
    message: 'Enter new faucet amount (in TALON):',
    default: 500,
    validate: (input) => input > 0 && input <= 10000
  }]);

  // Confirm
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: `Confirm change from ${ethers.formatEther(currentAmount)} to ${newAmount} TALON?`
  }]);

  if (!confirm) {
    console.log('❌ Cancelled');
    return;
  }

  // Execute transaction
  const tx = await gameToken.setFaucetAmount(ethers.parseEther(newAmount.toString()));
  console.log(`⏳ Transaction sent: ${tx.hash}`);

  await tx.wait();
  console.log(`✅ Faucet amount updated to ${newAmount} TALON`);
}

main().catch(console.error);
```

---

## Migration Plan

### Option A: Upgrade Existing Contracts (Recommended)

**Requirements**:
- Contracts must use proxy pattern (UUPS or Transparent)
- Current contracts are NOT upgradeable

**Steps**:
1. Deploy new implementation contracts with admin functions
2. Upgrade proxy to point to new implementation
3. Initialize new state variables
4. Test thoroughly

**Challenge**: Current contracts are NOT proxy-based, so this requires redeployment

### Option B: Deploy New Contracts (Current Approach)

**Steps**:
1. Deploy new GameToken with configurable faucet
2. Deploy new ClawMachine with pause functionality
3. Update frontend to use new addresses
4. Update backend oracle to use new addresses
5. Migrate player data (if needed)
6. Deprecate old contracts

**Pros**:
- Clean slate, no technical debt
- Testnet deployment is low-risk
- Can run both versions in parallel during migration

**Cons**:
- Players lose existing token balances (testnet only, acceptable)
- Need to update all contract addresses
- Some downtime during migration

---

## Cost Estimates

### Gas Costs (Sepolia Testnet - Free)
- Deploy updated GameToken: ~2,000,000 gas
- Deploy updated ClawMachine: ~3,000,000 gas
- setFaucetAmount() call: ~50,000 gas
- setFaucetCooldown() call: ~50,000 gas

### Development Time
- **Phase 1** (Contract updates + scripts): 3-5 days
- **Phase 2** (CLI tool): 2-3 days
- **Phase 3** (Web dashboard): 5-7 days
- **Testing & Documentation**: 2-3 days
- **Total**: 2-3 weeks

---

## Acceptance Criteria

### Phase 1 Complete When:
- ✅ Faucet amount can be changed via smart contract call
- ✅ Faucet cooldown can be changed via smart contract call
- ✅ Faucet can be enabled/disabled
- ✅ All changes emit events
- ✅ All functions have input validation
- ✅ Comprehensive tests pass
- ✅ Contracts deployed to Sepolia
- ✅ Admin scripts work correctly
- ✅ Documentation complete

### Full Success Metrics:
- Admin can change faucet amount in < 2 minutes
- All transactions succeed on first try
- No security vulnerabilities in audit
- Frontend automatically reflects admin changes
- Zero downtime during updates
- Complete audit trail of all admin actions

---

## Next Steps

1. **Review & Approve** this specification
2. **Prioritize** which phase to implement first
3. **Set timeline** for implementation
4. **Begin Phase 1** contract modifications
5. **Test** on local hardhat network
6. **Deploy** to Sepolia testnet
7. **Iterate** based on feedback

---

## Questions for Stakeholder

1. **Urgency**: Do we need Phase 1 immediately, or can we plan Phase 2-3 first?
2. **Access Control**: Should we implement multi-sig now or later?
3. **Mainnet**: Will we deploy to mainnet, and if so, when?
4. **Parameters**: What are the desired default values for mainnet vs testnet?
5. **Dashboard**: Is the web dashboard (Phase 3) necessary, or is CLI sufficient?

---

## Appendix: Related Documentation

- [Solidity Best Practices](https://docs.soliditylang.org/en/latest/security-considerations.html)
- [OpenZeppelin Access Control](https://docs.openzeppelin.com/contracts/4.x/access-control)
- [Hardhat Scripts](https://hardhat.org/guides/scripts.html)
- [Gnosis Safe](https://gnosis-safe.io/)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-27
**Author**: Claude (AI Assistant)
**Status**: 📋 Pending Approval
