import { ethers } from "hardhat";

/**
 * Redeploy only the GameToken contract with faucet functionality
 * This preserves the existing PrizeNFT and ClawMachine deployments
 */
async function main() {
  console.log("🔄 Redeploying GameToken with faucet functionality...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // GameToken parameters
  const INITIAL_SUPPLY = 1000000; // 1 million tokens
  const TOKEN_PRICE = ethers.parseEther("0.001"); // 0.001 ETH per token

  console.log("📝 Deployment parameters:");
  console.log("- Initial Supply:", INITIAL_SUPPLY, "TALON");
  console.log("- Token Price:", ethers.formatEther(TOKEN_PRICE), "ETH per TALON\n");

  // Deploy GameToken
  console.log("🚀 Deploying GameToken...");
  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy(INITIAL_SUPPLY, TOKEN_PRICE);
  await gameToken.waitForDeployment();
  const gameTokenAddress = await gameToken.getAddress();
  console.log("✅ GameToken deployed to:", gameTokenAddress, "\n");

  // Get existing contract addresses from environment
  const prizeNFTAddress = process.env.SEPOLIA_PRIZENFT_ADDRESS;
  const clawMachineAddress = process.env.SEPOLIA_CLAWMACHINE_ADDRESS;

  console.log("📋 Contract Addresses:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("GameToken (NEW):   ", gameTokenAddress);
  console.log("PrizeNFT (KEEP):   ", prizeNFTAddress);
  console.log("ClawMachine (KEEP):", clawMachineAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("⚠️  IMPORTANT: Update the following files with the new GameToken address:");
  console.log("1. server/.env → SEPOLIA_GAMETOKEN_ADDRESS");
  console.log("2. client/.env.local → NEXT_PUBLIC_SEPOLIA_GAMETOKEN_ADDRESS (if exists)");
  console.log("\n⚠️  CRITICAL: You must approve the NEW GameToken for ClawMachine!");
  console.log("Run this command after updating .env:");
  console.log(`npx hardhat run scripts/approve-tokens.ts --network sepolia\n`);

  console.log("✨ Redeployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
