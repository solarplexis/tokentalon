import { ethers } from 'hardhat';

async function main() {
  const clawMachineAddress = '0x39f24541e076e8557D20b8CfE695DE72e2f9Ea25';
  const playerAddress = '0x3cFfdAe22c533fd8CC498ac773397f3216d8ae67';

  const ClawMachine = await ethers.getContractAt('ClawMachine', clawMachineAddress);

  console.log('\n🔍 Checking player grab count...\n');

  const grabCount = await ClawMachine.grabCounts(playerAddress);
  console.log('Player:', playerAddress);
  console.log('Grab Count:', grabCount.toString());
  
  if (grabCount === 0n) {
    console.log('\n❌ No grabs recorded! You need to pay for a grab first.');
    console.log('   The old contract grabs don\'t transfer to the new contract.');
  } else {
    console.log('\n✅ Player has', grabCount.toString(), 'grab(s) on record');
  }

  const costPerPlay = await ClawMachine.costPerPlay();
  console.log('\nCost per play:', ethers.formatEther(costPerPlay), 'TALON');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
