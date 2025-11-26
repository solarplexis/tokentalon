import { ethers } from 'hardhat';

async function main() {
  const prizeNFTAddress = '0x6e3703Fa98a6cEA8086599ef407cB863e7425759';
  const clawMachineAddress = '0x39f24541e076e8557D20b8CfE695DE72e2f9Ea25';

  const PrizeNFT = await ethers.getContractAt('PrizeNFT', prizeNFTAddress);

  console.log('\n🔍 Checking MINTER_ROLE...\n');

  const MINTER_ROLE = await PrizeNFT.MINTER_ROLE();
  const hasMinterRole = await PrizeNFT.hasRole(MINTER_ROLE, clawMachineAddress);

  console.log('PrizeNFT:', prizeNFTAddress);
  console.log('ClawMachine:', clawMachineAddress);
  console.log('Has MINTER_ROLE:', hasMinterRole);

  if (!hasMinterRole) {
    console.log('\n❌ ClawMachine does NOT have MINTER_ROLE!');
    console.log('   This is why NFT minting is failing.');
    console.log('   Run the grant-minter-role script to fix this.');
  } else {
    console.log('\n✅ ClawMachine has MINTER_ROLE');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
