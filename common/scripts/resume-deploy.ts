import { ethers } from "hardhat";

/**
 * Resume deployment script - picks up where deploy.ts left off
 * Use this if the main deployment script fails partway through
 */

async function main() {
  console.log("🔄 Resuming TokenTalon contract deployment...\n");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  console.log("📍 Deploying contracts with account:", deployerAddress);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)), "ETH\n");

  // Deployment parameters
  const COST_PER_PLAY = ethers.parseEther("10"); // 10 tokens per game

  // If you have already deployed contracts, enter their addresses here:
  const GAMETOKEN_ADDRESS = "0xc5c8658d92727f609e72F63994fA345224526e67"; // Update if already deployed
  const PRIZENFT_ADDRESS = ""; // Will deploy
  const CLAWMACHINE_ADDRESS = ""; // Will deploy

  let gameTokenAddress = GAMETOKEN_ADDRESS;
  let prizeNFTAddress = PRIZENFT_ADDRESS;
  let clawMachineAddress = CLAWMACHINE_ADDRESS;

  // Deploy PrizeNFT if not already deployed
  if (!prizeNFTAddress) {
    console.log("📄 Deploying PrizeNFT...");
    const PrizeNFT = await ethers.getContractFactory("PrizeNFT");
    const prizeNFT = await PrizeNFT.deploy();
    await prizeNFT.waitForDeployment();
    prizeNFTAddress = await prizeNFT.getAddress();
    console.log("✅ PrizeNFT deployed to:", prizeNFTAddress, "\n");
  } else {
    console.log("ℹ️  Using existing PrizeNFT at:", prizeNFTAddress, "\n");
  }

  // Deploy ClawMachine if not already deployed
  if (!clawMachineAddress) {
    console.log("📄 Deploying ClawMachine...");
    const ClawMachine = await ethers.getContractFactory("ClawMachine");
    const clawMachine = await ClawMachine.deploy(
      gameTokenAddress,
      prizeNFTAddress,
      deployerAddress, // Use deployer as oracle initially
      COST_PER_PLAY
    );
    await clawMachine.waitForDeployment();
    clawMachineAddress = await clawMachine.getAddress();
    console.log("✅ ClawMachine deployed to:", clawMachineAddress);
    console.log("   - Cost per play:", ethers.formatEther(COST_PER_PLAY), "tokens");
    console.log("   - Oracle address:", deployerAddress, "\n");
  } else {
    console.log("ℹ️  Using existing ClawMachine at:", clawMachineAddress, "\n");
  }

  // Grant ClawMachine minter role on PrizeNFT
  console.log("🔐 Granting minter role to ClawMachine...");
  const PrizeNFT = await ethers.getContractFactory("PrizeNFT");
  const prizeNFT = PrizeNFT.attach(prizeNFTAddress);
  const tx = await prizeNFT.grantMinterRole(clawMachineAddress);
  await tx.wait();
  console.log("✅ Minter role granted\n");

  // Summary
  console.log("=" .repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("=" .repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   GameToken:    ", gameTokenAddress);
  console.log("   PrizeNFT:     ", prizeNFTAddress);
  console.log("   ClawMachine:  ", clawMachineAddress);
  
  console.log("\n📝 Environment Variables (add to server/.env):");
  console.log(`SEPOLIA_GAMETOKEN_ADDRESS=${gameTokenAddress}`);
  console.log(`SEPOLIA_PRIZENFT_ADDRESS=${prizeNFTAddress}`);
  console.log(`SEPOLIA_CLAWMACHINE_ADDRESS=${clawMachineAddress}`);
  console.log(`ORACLE_PRIVATE_KEY=${process.env.PRIVATE_KEY}`);
  
  console.log("\n🔍 Verify contracts on Etherscan:");
  console.log(`npx hardhat verify --network sepolia ${gameTokenAddress} 1000000 1000000000000000`);
  console.log(`npx hardhat verify --network sepolia ${prizeNFTAddress}`);
  console.log(`npx hardhat verify --network sepolia ${clawMachineAddress} ${gameTokenAddress} ${prizeNFTAddress} ${deployerAddress} ${COST_PER_PLAY}`);
  
  console.log("\n✅ Next steps:");
  console.log("   1. Update server/.env with contract addresses");
  console.log("   2. Update client config with contract addresses");
  console.log("   3. Verify contracts on Etherscan (optional)");
  console.log("   4. Test on Sepolia testnet");
  console.log("=" .repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
