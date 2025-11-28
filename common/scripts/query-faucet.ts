import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const network = await ethers.provider.getNetwork();

  // Get GameToken address from deployment file
  const deploymentPath = path.join(__dirname, `../deployments/${network.name}.json`);
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  const gameTokenAddress = deployment.contracts.GameToken.address;

  console.log(`\n📊 Querying GameToken on ${network.name}`);
  console.log(`Contract: ${gameTokenAddress}\n`);

  const gameToken = await ethers.getContractAt("GameToken", gameTokenAddress);

  const faucetAmount = await gameToken.faucetAmount();
  const faucetCooldown = await gameToken.faucetCooldown();
  const faucetEnabled = await gameToken.faucetEnabled();

  console.log(`Faucet Amount: ${ethers.formatEther(faucetAmount)} TALON`);
  console.log(`Faucet Cooldown: ${Number(faucetCooldown) / 60} minutes`);
  console.log(`Faucet Enabled: ${faucetEnabled}\n`);
}

main().catch(console.error);
