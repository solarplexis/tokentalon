import { ethers } from "hardhat";

/**
 * Approve ClawMachine to spend GameToken
 * Run this after redeploying GameToken
 */
async function main() {
  console.log("🔐 Approving ClawMachine to spend GameToken...\n");

  const gameTokenAddress = process.env.SEPOLIA_GAMETOKEN_ADDRESS;
  const clawMachineAddress = process.env.SEPOLIA_CLAWMACHINE_ADDRESS;

  if (!gameTokenAddress || !clawMachineAddress) {
    throw new Error("Missing contract addresses in .env file");
  }

  console.log("GameToken:", gameTokenAddress);
  console.log("ClawMachine:", clawMachineAddress, "\n");

  // Get the GameToken contract
  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = GameToken.attach(gameTokenAddress);

  // Approve a large amount (enough for many games)
  const approvalAmount = ethers.parseEther("1000000"); // 1 million tokens
  
  console.log("🚀 Sending approval transaction...");
  const tx = await gameToken.approve(clawMachineAddress, approvalAmount);
  console.log("Transaction hash:", tx.hash);
  
  console.log("⏳ Waiting for confirmation...");
  await tx.wait();
  
  console.log("✅ ClawMachine approved to spend", ethers.formatEther(approvalAmount), "TALON");
  console.log("\n✨ Setup complete! ClawMachine can now accept game tokens.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
