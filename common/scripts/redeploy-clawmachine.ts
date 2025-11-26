import { ethers } from "hardhat";

async function main() {
  console.log("🔄 Redeploying ClawMachine with updated GameToken...\n");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  console.log("📍 Deploying with account:", deployerAddress);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)), "ETH\n");

  // Contract addresses
  const gameTokenAddress = "0xba2300B8c318b8054D7Bd688ADFd659bD4EBECc2"; // NEW GameToken with 500 TALON faucet / 5min
  const prizeNFTAddress = "0x6e3703Fa98a6cEA8086599ef407cB863e7425759"; // Existing PrizeNFT
  const COST_PER_PLAY = ethers.parseEther("10"); // 10 tokens per game

  console.log("📄 Deploying ClawMachine...");
  const ClawMachine = await ethers.getContractFactory("ClawMachine");
  const clawMachine = await ClawMachine.deploy(
    gameTokenAddress,
    prizeNFTAddress,
    deployerAddress, // Use deployer as oracle
    COST_PER_PLAY
  );
  await clawMachine.waitForDeployment();
  const clawMachineAddress = await clawMachine.getAddress();
  console.log("✅ ClawMachine deployed to:", clawMachineAddress);
  console.log("   - GameToken:", gameTokenAddress);
  console.log("   - PrizeNFT:", prizeNFTAddress);
  console.log("   - Cost per play:", ethers.formatEther(COST_PER_PLAY), "TALON\n");

  // Grant minter role to ClawMachine
  console.log("🔑 Granting MINTER_ROLE to ClawMachine...");
  const PrizeNFT = await ethers.getContractFactory("PrizeNFT");
  const prizeNFT = PrizeNFT.attach(prizeNFTAddress);
  const MINTER_ROLE = await prizeNFT.MINTER_ROLE();
  const tx = await prizeNFT.grantRole(MINTER_ROLE, clawMachineAddress);
  await tx.wait();
  console.log("✅ MINTER_ROLE granted\n");

  console.log("📝 Update your .env files with:");
  console.log(`SEPOLIA_CLAWMACHINE_ADDRESS=${clawMachineAddress}`);
  console.log(`NEXT_PUBLIC_SEPOLIA_CLAWMACHINE_ADDRESS=${clawMachineAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
