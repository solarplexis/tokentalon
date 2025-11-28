import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Admin tasks for managing contract parameters
 *
 * These tasks provide a clean CLI interface for admin operations
 * using Hardhat's built-in task system.
 */

/**
 * Helper function to get contract address from deployment files
 */
function getContractAddress(networkName: string, contractName: string): string {
  const deploymentPath = path.join(__dirname, `../deployments/${networkName}.json`);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment file found for network: ${networkName}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  const address = deployment.contracts?.[contractName]?.address;

  if (!address) {
    throw new Error(`${contractName} address not found in ${networkName} deployment`);
  }

  return address;
}

/**
 * Task: set-faucet-amount
 * Sets the faucet amount in the GameToken contract
 *
 * Usage:
 *   npx hardhat set-faucet-amount --network sepolia --amount 100
 */
task("set-faucet-amount", "Set the faucet amount")
  .addParam("amount", "The new faucet amount in TALON tokens")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const network = await hre.ethers.provider.getNetwork();
    console.log(`\n🔧 Setting Faucet Amount on ${network.name}\n`);

    // Get deployer/admin
    const [admin] = await hre.ethers.getSigners();
    console.log(`👤 Admin address: ${admin.address}`);

    // Get GameToken address from deployment files
    let gameTokenAddress: string;
    try {
      gameTokenAddress = getContractAddress(network.name, "GameToken");
      console.log(`📄 GameToken address: ${gameTokenAddress}\n`);
    } catch (error: any) {
      console.error(`❌ ${error.message}`);
      console.log(`   Make sure you've deployed to ${network.name} first.`);
      console.log(`   Run: npm run deploy:${network.name}`);
      process.exit(1);
    }

    // Get contract instance
    const gameToken = await hre.ethers.getContractAt("GameToken", gameTokenAddress);

    // Get current faucet amount
    const currentAmount = await gameToken.faucetAmount();
    console.log(`Current faucet amount: ${hre.ethers.formatEther(currentAmount)} TALON`);

    // Parse and validate new amount
    const newAmount = hre.ethers.parseEther(taskArgs.amount);

    if (newAmount <= 0n) {
      console.error("❌ Amount must be greater than 0");
      process.exit(1);
    }

    const maxAmount = hre.ethers.parseEther("10000");
    if (newAmount > maxAmount) {
      console.error("❌ Amount exceeds maximum (10,000 TALON)");
      process.exit(1);
    }

    console.log(`\n📝 Proposed change:`);
    console.log(`   From: ${hre.ethers.formatEther(currentAmount)} TALON`);
    console.log(`   To:   ${hre.ethers.formatEther(newAmount)} TALON`);

    // Execute transaction
    console.log(`\n⏳ Sending transaction...`);
    const tx = await gameToken.setFaucetAmount(newAmount);
    console.log(`   Transaction hash: ${tx.hash}`);

    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`   Block number: ${receipt?.blockNumber}`);

    // Verify the change
    const updatedAmount = await gameToken.faucetAmount();
    console.log(`\n✅ Faucet amount updated successfully!`);
    console.log(`   New amount: ${hre.ethers.formatEther(updatedAmount)} TALON`);

    console.log(`\n📊 Summary:`);
    console.log(`   Network: ${network.name}`);
    console.log(`   Contract: ${gameTokenAddress}`);
    console.log(`   Faucet amount: ${hre.ethers.formatEther(updatedAmount)} TALON`);
    console.log();
  });

/**
 * Task: set-faucet-cooldown
 * Sets the faucet cooldown period in the GameToken contract
 *
 * Usage:
 *   npx hardhat set-faucet-cooldown --network sepolia --minutes 10
 *   npx hardhat set-faucet-cooldown --network sepolia --hours 2
 *   npx hardhat set-faucet-cooldown --network sepolia --days 1
 */
task("set-faucet-cooldown", "Set the faucet cooldown period")
  .addOptionalParam("minutes", "Cooldown in minutes")
  .addOptionalParam("hours", "Cooldown in hours")
  .addOptionalParam("days", "Cooldown in days")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const network = await hre.ethers.provider.getNetwork();
    console.log(`\n🔧 Setting Faucet Cooldown on ${network.name}\n`);

    // Get deployer/admin
    const [admin] = await hre.ethers.getSigners();
    console.log(`👤 Admin address: ${admin.address}`);

    // Get GameToken address from deployment files
    let gameTokenAddress: string;
    try {
      gameTokenAddress = getContractAddress(network.name, "GameToken");
      console.log(`📄 GameToken address: ${gameTokenAddress}\n`);
    } catch (error: any) {
      console.error(`❌ ${error.message}`);
      console.log(`   Make sure you've deployed to ${network.name} first.`);
      console.log(`   Run: npm run deploy:${network.name}`);
      process.exit(1);
    }

    // Get contract instance
    const gameToken = await hre.ethers.getContractAt("GameToken", gameTokenAddress);

    // Get current cooldown
    const currentCooldown = await gameToken.faucetCooldown();
    const currentMinutes = Number(currentCooldown) / 60;
    console.log(`Current faucet cooldown: ${currentMinutes} minutes`);

    // Calculate new cooldown from arguments
    let newCooldownSeconds: number;

    if (taskArgs.minutes) {
      newCooldownSeconds = parseInt(taskArgs.minutes) * 60;
    } else if (taskArgs.hours) {
      newCooldownSeconds = parseInt(taskArgs.hours) * 3600;
    } else if (taskArgs.days) {
      newCooldownSeconds = parseInt(taskArgs.days) * 86400;
    } else {
      console.log("\nℹ️  No cooldown specified. Use one of:");
      console.log("   --minutes N  (e.g., --minutes 10)");
      console.log("   --hours N    (e.g., --hours 2)");
      console.log("   --days N     (e.g., --days 1)");
      console.log("\nSafety limits:");
      console.log("   - Minimum: 1 minute");
      console.log("   - Maximum: 30 days");
      process.exit(0);
    }

    // Validate cooldown
    const MIN_COOLDOWN = 60; // 1 minute
    const MAX_COOLDOWN = 30 * 24 * 3600; // 30 days

    if (newCooldownSeconds < MIN_COOLDOWN) {
      console.error("❌ Cooldown too short (minimum: 1 minute)");
      process.exit(1);
    }

    if (newCooldownSeconds > MAX_COOLDOWN) {
      console.error("❌ Cooldown too long (maximum: 30 days)");
      process.exit(1);
    }

    const newMinutes = newCooldownSeconds / 60;
    console.log(`\n📝 Proposed change:`);
    console.log(`   From: ${currentMinutes} minutes`);
    console.log(`   To:   ${newMinutes} minutes`);

    // Execute transaction
    console.log(`\n⏳ Sending transaction...`);
    const tx = await gameToken.setFaucetCooldown(newCooldownSeconds);
    console.log(`   Transaction hash: ${tx.hash}`);

    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`   Block number: ${receipt?.blockNumber}`);

    // Verify the change
    const updatedCooldown = await gameToken.faucetCooldown();
    const updatedMinutes = Number(updatedCooldown) / 60;
    console.log(`\n✅ Faucet cooldown updated successfully!`);
    console.log(`   New cooldown: ${updatedMinutes} minutes`);

    console.log(`\n📊 Summary:`);
    console.log(`   Network: ${network.name}`);
    console.log(`   Contract: ${gameTokenAddress}`);
    console.log(`   Faucet cooldown: ${updatedMinutes} minutes`);
    console.log();
  });

/**
 * Task: toggle-faucet
 * Enable or disable the faucet in the GameToken contract
 *
 * Usage:
 *   npx hardhat toggle-faucet --network sepolia --enable
 *   npx hardhat toggle-faucet --network sepolia --disable
 */
task("toggle-faucet", "Enable or disable the faucet")
  .addFlag("enable", "Enable the faucet")
  .addFlag("disable", "Disable the faucet")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const network = await hre.ethers.provider.getNetwork();
    console.log(`\n🔧 Toggling Faucet on ${network.name}\n`);

    // Get deployer/admin
    const [admin] = await hre.ethers.getSigners();
    console.log(`👤 Admin address: ${admin.address}`);

    // Get GameToken address from deployment files
    let gameTokenAddress: string;
    try {
      gameTokenAddress = getContractAddress(network.name, "GameToken");
      console.log(`📄 GameToken address: ${gameTokenAddress}\n`);
    } catch (error: any) {
      console.error(`❌ ${error.message}`);
      console.log(`   Make sure you've deployed to ${network.name} first.`);
      console.log(`   Run: npm run deploy:${network.name}`);
      process.exit(1);
    }

    // Get contract instance
    const gameToken = await hre.ethers.getContractAt("GameToken", gameTokenAddress);

    // Get current status
    const currentStatus = await gameToken.faucetEnabled();
    console.log(`Current faucet status: ${currentStatus ? "✅ ENABLED" : "❌ DISABLED"}`);

    // Determine new status from flags
    let newStatus: boolean | undefined;

    if (taskArgs.enable && taskArgs.disable) {
      console.error("❌ Cannot use both --enable and --disable flags");
      process.exit(1);
    }

    if (taskArgs.enable) {
      newStatus = true;
    } else if (taskArgs.disable) {
      newStatus = false;
    } else {
      console.log("\nℹ️  No action specified. Use --enable or --disable flag.");
      console.log("   Examples:");
      console.log("     --enable     Enable the faucet");
      console.log("     --disable    Disable the faucet");
      console.log("\nℹ️  Use cases:");
      console.log("   • Disable faucet on mainnet");
      console.log("   • Temporarily disable during maintenance");
      console.log("   • Emergency disable if exploited");
      process.exit(0);
    }

    // Check if change is needed
    if (newStatus === currentStatus) {
      console.log(`\n⚠️  Faucet is already ${newStatus ? "enabled" : "disabled"}`);
      console.log("   No action needed.");
      process.exit(0);
    }

    console.log(`\n📝 Proposed change:`);
    console.log(`   From: ${currentStatus ? "ENABLED" : "DISABLED"}`);
    console.log(`   To:   ${newStatus ? "ENABLED" : "DISABLED"}`);

    // Execute transaction
    console.log(`\n⏳ Sending transaction...`);
    const tx = await gameToken.setFaucetEnabled(newStatus);
    console.log(`   Transaction hash: ${tx.hash}`);

    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`   Block number: ${receipt?.blockNumber}`);

    // Verify the change
    const updatedStatus = await gameToken.faucetEnabled();
    console.log(`\n✅ Faucet status updated successfully!`);
    console.log(`   New status: ${updatedStatus ? "✅ ENABLED" : "❌ DISABLED"}`);

    if (updatedStatus) {
      const faucetAmount = await gameToken.faucetAmount();
      const faucetCooldown = await gameToken.faucetCooldown();
      const cooldownMinutes = Number(faucetCooldown) / 60;

      console.log(`\n📊 Faucet configuration:`);
      console.log(`   Amount: ${hre.ethers.formatEther(faucetAmount)} TALON`);
      console.log(`   Cooldown: ${cooldownMinutes} minutes`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Network: ${network.name}`);
    console.log(`   Contract: ${gameTokenAddress}`);
    console.log(`   Status: ${updatedStatus ? "ENABLED" : "DISABLED"}`);
    console.log();
  });
