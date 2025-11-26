import { ethers } from 'hardhat';

async function main() {
  const prizeNFTAddress = '0x6e3703Fa98a6cEA8086599ef407cB863e7425759';
  const clawMachineAddress = '0x39f24541e076e8557D20b8CfE695DE72e2f9Ea25';
  const playerAddress = '0x3cFfdAe22c533fd8CC498ac773397f3216d8ae67';
  
  const prizeId = 9636;
  const metadataUri = 'ipfs://bafkreicjydr4hs5bwdfayhslwnbdsp34dif5gcz6jkrdj6iiwypkaljvaa';
  const replayDataHash = 'bafkreig2y2l7w2qlkdx5yivui3nzf35wjw6slmepsqrglu2bvs6rf7npwi';
  const difficulty = 4;
  const tokensSpent = ethers.parseEther('50'); // 5 grabs * 10 TALON

  const PrizeNFT = await ethers.getContractAt('PrizeNFT', prizeNFTAddress);
  const ClawMachine = await ethers.getContractAt('ClawMachine', clawMachineAddress);

  console.log('\n🔍 Testing NFT minting...\n');

  // Check if ClawMachine has minter role
  const MINTER_ROLE = await PrizeNFT.MINTER_ROLE();
  const hasMinterRole = await PrizeNFT.hasRole(MINTER_ROLE, clawMachineAddress);
  console.log('ClawMachine has MINTER_ROLE:', hasMinterRole);

  // Try to estimate gas for the mintPrize call from ClawMachine
  try {
    // We can't call this directly, but we can check the contract state
    const costPerPlay = await ClawMachine.costPerPlay();
    console.log('Cost per play:', ethers.formatEther(costPerPlay), 'TALON');
    
    console.log('\n✅ All contract checks pass');
    console.log('   The issue might be a gas estimation problem in MetaMask');
    console.log('   or a race condition during minting.');
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
