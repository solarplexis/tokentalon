# Faucet Administration Guide

This guide explains how to manage the GameToken faucet parameters using Hardhat tasks.

## Overview

The faucet system allows users to claim free TALON tokens with configurable parameters:
- **Amount**: How many tokens users receive per claim
- **Cooldown**: How long users must wait between claims
- **Enabled status**: Whether the faucet is active or disabled

## Prerequisites

- Admin/owner wallet with private key in `.env`
- Deployed GameToken contract on target network
- Hardhat environment configured

## Commands

All commands use the format:
```bash
npx hardhat <task-name> --network <network> [options]
```

### 1. Set Faucet Amount

Adjust how many TALON tokens users receive per claim.

**Usage:**
```bash
npx hardhat set-faucet-amount --network sepolia --amount 100
```

**Parameters:**
- `--amount <number>`: Amount in TALON tokens (not wei)

**Safety Limits:**
- Minimum: > 0 TALON
- Maximum: 10,000 TALON

**Example:**
```bash
# Set faucet to 100 TALON on Sepolia
npx hardhat set-faucet-amount --network sepolia --amount 100

# Set faucet to 1000 TALON on localhost
npx hardhat set-faucet-amount --network localhost --amount 1000
```

### 2. Set Faucet Cooldown

Adjust how long users must wait between claims.

**Usage:**
```bash
npx hardhat set-faucet-cooldown --network sepolia --minutes 10
npx hardhat set-faucet-cooldown --network sepolia --hours 2
npx hardhat set-faucet-cooldown --network sepolia --days 1
```

**Parameters (use one):**
- `--minutes <number>`: Cooldown in minutes
- `--hours <number>`: Cooldown in hours
- `--days <number>`: Cooldown in days

**Safety Limits:**
- Minimum: 1 minute
- Maximum: 30 days

**Examples:**
```bash
# Set 10-minute cooldown
npx hardhat set-faucet-cooldown --network sepolia --minutes 10

# Set 2-hour cooldown
npx hardhat set-faucet-cooldown --network sepolia --hours 2

# Set 1-day cooldown
npx hardhat set-faucet-cooldown --network sepolia --days 1
```

### 3. Toggle Faucet

Enable or disable the faucet entirely.

**Usage:**
```bash
npx hardhat toggle-faucet --network sepolia --enable
npx hardhat toggle-faucet --network sepolia --disable
```

**Parameters (use one):**
- `--enable`: Enable the faucet
- `--disable`: Disable the faucet

**Examples:**
```bash
# Enable the faucet
npx hardhat toggle-faucet --network sepolia --enable

# Disable the faucet
npx hardhat toggle-faucet --network sepolia --disable
```

**Use Cases:**
- Disable on mainnet to prevent token drainage
- Temporarily disable during maintenance
- Emergency disable if exploited
- Enable for testnets and development

## How It Works

### Address Resolution

The tasks automatically read contract addresses from the deployment files:
```
common/deployments/{network}.json
```

This integrates with the address management system, ensuring you're always interacting with the latest deployed contract.

### Transaction Flow

1. Task loads contract address from deployment file
2. Connects to contract using admin wallet
3. Displays current value and proposed change
4. Sends transaction to blockchain
5. Waits for confirmation
6. Verifies the change was applied
7. Displays summary

### Event Emission

All parameter changes emit events for audit trail:
- `FaucetAmountUpdated(oldAmount, newAmount)`
- `FaucetCooldownUpdated(oldCooldown, newCooldown)`
- `FaucetStatusUpdated(enabled)`

## Best Practices

### For Testnets (Sepolia, etc.)
```bash
# Generous amount for testing
npx hardhat set-faucet-amount --network sepolia --amount 1000

# Short cooldown for frequent testing
npx hardhat set-faucet-cooldown --network sepolia --minutes 5

# Keep faucet enabled
npx hardhat toggle-faucet --network sepolia --enable
```

### For Mainnet
```bash
# Conservative amount to prevent drainage
npx hardhat set-faucet-amount --network polygon --amount 10

# Long cooldown to limit abuse
npx hardhat set-faucet-cooldown --network polygon --hours 24

# Consider disabling entirely
npx hardhat toggle-faucet --network polygon --disable
```

### For Development (localhost)
```bash
# High amount for quick testing
npx hardhat set-faucet-amount --network localhost --amount 10000

# No cooldown for rapid iteration
npx hardhat set-faucet-cooldown --network localhost --minutes 1
```

## Security Considerations

1. **Owner-Only**: All functions are restricted to contract owner
2. **Safety Limits**: Built-in bounds prevent misconfiguration
3. **Gradual Changes**: Make small adjustments and monitor impact
4. **Event Logging**: All changes are recorded on-chain
5. **Disable First**: When in doubt, disable the faucet first

## Troubleshooting

### "No deployment file found"
```
Error: No deployment file found for network: sepolia
```

**Solution:** Deploy contracts first:
```bash
npm run deploy:sepolia
```

### "Ownable: caller is not the owner"
```
Error: Ownable: caller is not the owner
```

**Solution:** Ensure your `.env` has the correct `PRIVATE_KEY` for the contract owner.

### "Amount exceeds maximum"
```
Error: Amount exceeds maximum (10,000 TALON)
```

**Solution:** Reduce the amount to be within safety limits (≤ 10,000 TALON).

### "Cooldown too short"
```
Error: Cooldown too short (minimum: 1 minute)
```

**Solution:** Increase cooldown to at least 1 minute (60 seconds).

## Examples by Scenario

### Scenario: High Traffic Testing
```bash
# Increase amount to handle more users
npx hardhat set-faucet-amount --network sepolia --amount 500

# Increase cooldown to prevent abuse
npx hardhat set-faucet-cooldown --network sepolia --hours 1
```

### Scenario: Limited Token Supply
```bash
# Decrease amount to conserve tokens
npx hardhat set-faucet-amount --network sepolia --amount 50

# Increase cooldown to slow distribution
npx hardhat set-faucet-cooldown --network sepolia --days 1
```

### Scenario: Maintenance Window
```bash
# Disable faucet during maintenance
npx hardhat toggle-faucet --network sepolia --disable

# ... perform maintenance ...

# Re-enable when ready
npx hardhat toggle-faucet --network sepolia --enable
```

### Scenario: Suspected Abuse
```bash
# Immediately disable faucet
npx hardhat toggle-faucet --network sepolia --disable

# Investigate and adjust parameters
npx hardhat set-faucet-amount --network sepolia --amount 100
npx hardhat set-faucet-cooldown --network sepolia --days 1

# Re-enable with stricter limits
npx hardhat toggle-faucet --network sepolia --enable
```

## Integration with Address Management

These tasks are fully integrated with the address management system from Phase 1A:

- ✅ Automatically use latest deployed addresses
- ✅ No need to manually specify contract addresses
- ✅ Work across all networks (localhost, sepolia, polygon)
- ✅ Consistent with frontend/backend address sources

## Related Documentation

- [Address Management System](../ADDRESS_MANAGEMENT.md)
- [Admin Functions Specification](../ADMIN_FUNCTIONS_SPEC.md)
- [GameToken Contract](./contracts/GameToken.sol)
