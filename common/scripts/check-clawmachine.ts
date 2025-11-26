import { ethers } from "hardhat";

async function main() {
  const clawMachineAddress = "0x99330FCbCb4e6B77940593eC2405AbBDA7f562f2";
  
  const ClawMachine = await ethers.getContractFactory("ClawMachine");
  const clawMachine = ClawMachine.attach(clawMachineAddress);
  
  const gameTokenAddress = await clawMachine.gameToken();
  const costPerPlay = await clawMachine.costPerPlay();
  
  console.log("ClawMachine Configuration:");
  console.log("  GameToken address:", gameTokenAddress);
  console.log("  Cost per play:", ethers.formatEther(costPerPlay), "TALON");
  
  // Check if it matches our current GameToken
  const expectedGameToken = "0xF3Ab5d4c91415a5fFDdFec3C8084409d4403962c";
  if (gameTokenAddress.toLowerCase() === expectedGameToken.toLowerCase()) {
    console.log("✅ GameToken address matches!");
  } else {
    console.log("❌ GameToken address MISMATCH!");
    console.log("   Expected:", expectedGameToken);
    console.log("   Found:", gameTokenAddress);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
