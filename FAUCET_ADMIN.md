# Faucet Administration Guide

This guide explains how to manage the TokenTalon faucet parameters using the admin scripts.

## Overview

The faucet system now has **configurable parameters** that can be adjusted without redeploying the contract:

- **Faucet Amount**: How many tokens users receive per claim
- **Faucet Cooldown**: How long users must wait between claims
- **Faucet Status**: Enable or disable the faucet entirely

## Prerequisites

- Admin wallet with contract owner privileges
- Private key set in `.env` as `PRIVATE_KEY`
- Contract addresses in `.env` (e.g., `SEPOLIA_GAMETOKEN_ADDRESS`)

## Admin Functions

### 1. Set Faucet Amount

Change the number of tokens given per faucet claim.

**Usage:**
```bash
cd common
npx hardhat run scripts/admin/set-faucet-amount.ts --network sepolia -- --amount 1000
```

**Parameters:**
- `--amount <tokens>` - New faucet amount in whole tokens

**Safety Limits:**
- Minimum: > 0 TALON
- Maximum: 10,000 TALON

**Examples:**
```bash
# Set to 1000 tokens
npx hardhat run scripts/admin/set-faucet-amount.ts --network sepolia -- --amount 1000

# Set to 100 tokens (conservative)
npx hardhat run scripts/admin/set-faucet-amount.ts --network sepolia -- --amount 100

# Set to 5000 tokens (generous for testing)
npx hardhat run scripts/admin/set-faucet-amount.ts --network sepolia -- --amount 5000
```

**Use Cases:**
- **Testnet**: Higher amounts (500-1000 TALON) for rapid testing
- **Mainnet**: Lower amounts (10-50 TALON) or disabled entirely
- **Promotional**: Temporary increases during marketing campaigns
- **Economic**: Decrease as token value increases

---

### 2. Set Faucet Cooldown

Change how long users must wait between faucet claims.

**Usage:**
```bash
cd common
npx hardhat run scripts/admin/set-faucet-cooldown.ts --network sepolia -- --hours 24
```

**Parameters:**
- `--minutes <n>` - Cooldown in minutes
- `--hours <n>` - Cooldown in hours
- `--days <n>` - Cooldown in days

**Safety Limits:**
- Minimum: 1 minute
- Maximum: 30 days

**Examples:**
```bash
# Set to 5 minutes (for rapid testing)
npx hardhat run scripts/admin/set-faucet-cooldown.ts --network sepolia -- --minutes 5

# Set to 1 hour
npx hardhat run scripts/admin/set-faucet-cooldown.ts --network sepolia -- --hours 1

# Set to 24 hours (daily claims)
npx hardhat run scripts/admin/set-faucet-cooldown.ts --network sepolia -- --hours 24

# Set to 7 days (weekly claims)
npx hardhat run scripts/admin/set-faucet-cooldown.ts --network sepolia -- --days 7
```

**Use Cases:**
- **Development**: 1-5 minutes for rapid testing
- **Testnet**: 1-24 hours for realistic testing
- **Mainnet**: 24 hours - 7 days for anti-abuse
- **Promotional**: Temporary reductions

---

### 3. Toggle Faucet (Enable/Disable)

Enable or disable the faucet entirely.

**Usage:**
```bash
cd common
# Enable faucet
npx hardhat run scripts/admin/toggle-faucet.ts --network sepolia -- --enable

# Disable faucet
npx hardhat run scripts/admin/toggle-faucet.ts --network sepolia -- --disable
```

**Parameters:**
- `--enable` - Enable the faucet
- `--disable` - Disable the faucet

**Examples:**
```bash
# Enable faucet
npx hardhat run scripts/admin/toggle-faucet.ts --network sepolia -- --enable

# Disable faucet
npx hardhat run scripts/admin/toggle-faucet.ts --network sepolia -- --disable
```

**Use Cases:**
- Disable faucet on mainnet without removing code
- Temporary disable during migrations
- Emergency disable if exploited
- Enable during testnet phases

---

## Typical Configurations

### Development (Local/Hardhat)
```bash
# Fast testing with generous amounts
npx hardhat run scripts/admin/set-faucet-amount.ts --network localhost -- --amount 1000
npx hardhat run scripts/admin/set-faucet-cooldown.ts --network localhost -- --minutes 1
npx hardhat run scripts/admin/toggle-faucet.ts --network localhost -- --enable
```

### Testnet (Sepolia)
```bash
# Moderate amounts with reasonable cooldown
npx hardhat run scripts/admin/set-faucet-amount.ts --network sepolia -- --amount 500
npx hardhat run scripts/admin/set-faucet-cooldown.ts --network sepolia -- --hours 1
npx hardhat run scripts/admin/toggle-faucet.ts --network sepolia -- --enable
```

### Mainnet (Production)
```bash
# Conservative or disabled
npx hardhat run scripts/admin/set-faucet-amount.ts --network polygon -- --amount 50
npx hardhat run scripts/admin/set-faucet-cooldown.ts --network polygon -- --days 7
# Or disable entirely:
npx hardhat run scripts/admin/toggle-faucet.ts --network polygon -- --disable
```

---

## Contract Functions

If you prefer to interact directly with the contract (via Etherscan, etc.):

### setFaucetAmount(uint256 newAmount)
- **Access**: Owner only
- **Parameters**: `newAmount` in wei (e.g., `500000000000000000000` for 500 tokens)
- **Emits**: `FaucetAmountUpdated(uint256 oldAmount, uint256 newAmount)`

### setFaucetCooldown(uint256 newCooldown)
- **Access**: Owner only
- **Parameters**: `newCooldown` in seconds (e.g., `300` for 5 minutes)
- **Emits**: `FaucetCooldownUpdated(uint256 oldCooldown, uint256 newCooldown)`

### setFaucetEnabled(bool enabled)
- **Access**: Owner only
- **Parameters**: `enabled` - `true` to enable, `false` to disable
- **Emits**: `FaucetStatusUpdated(bool enabled)`

---

## Monitoring Events

All faucet parameter changes emit events that can be monitored:

```solidity
event FaucetAmountUpdated(uint256 oldAmount, uint256 newAmount);
event FaucetCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
event FaucetStatusUpdated(bool enabled);
```

Use these events to:
- Track admin actions on-chain
- Trigger alerts or notifications
- Update frontend UI automatically
- Maintain audit trail

---

## Troubleshooting

### "OwnableUnauthorizedAccount" Error
- **Cause**: Calling wallet is not the contract owner
- **Solution**: Ensure you're using the correct admin private key in `.env`

### "Amount exceeds maximum" Error
- **Cause**: Trying to set faucet amount > 10,000 TALON
- **Solution**: Use a smaller amount within safety limits

### "Cooldown too short/long" Error
- **Cause**: Cooldown outside the 1 minute - 30 days range
- **Solution**: Use a cooldown within safety limits

### Contract Address Not Found
- **Cause**: Missing environment variable for the network
- **Solution**: Add `<NETWORK>_GAMETOKEN_ADDRESS` to `.env`

---

## Security Considerations

### Access Control
- Only the contract owner can modify faucet parameters
- Store admin private key in a hardware wallet (Ledger/Trezor) for production
- Use separate admin keys for each network (testnet vs mainnet)
- Never commit private keys to git

### Safety Limits
All setter functions have built-in safety limits to prevent:
- Setting faucet amount too high (max 10,000 TALON)
- Setting cooldown too short (min 1 minute) or too long (max 30 days)
- Setting amount to zero

### Emergency Response
If the faucet is being exploited:
```bash
# Immediately disable the faucet
npx hardhat run scripts/admin/toggle-faucet.ts --network <network> -- --disable
```

---

## Best Practices

1. **Test First**: Always test parameter changes on testnet before mainnet
2. **Gradual Changes**: Make incremental adjustments rather than dramatic shifts
3. **Monitor Impact**: Watch user behavior after changes
4. **Document Changes**: Keep notes on why parameters were changed
5. **Announce Changes**: Inform users of significant faucet policy updates

---

## Related Documentation

- [ADMIN_FUNCTIONS_SPEC.md](../ADMIN_FUNCTIONS_SPEC.md) - Full admin functions specification
- [ADDRESS_MANAGEMENT.md](./ADDRESS_MANAGEMENT.md) - Address management system
- [README.md](./README.md) - Main project documentation

---

**Last Updated**: 2025-11-27
**Status**: ✅ Implemented and Tested (Phase 1B)
