import { ethers } from 'hardhat';

async function main() {
  const clawMachineAddress = '0x39f24541e076e8557D20b8CfE695DE72e2f9Ea25';
  const playerAddress = '0x3cFfdAe22c533fd8CC498ac773397f3216d8ae67';
  const voucherHash = '0x5d212033cc70db20fa2f4c7e0e6c6e0565950acf417b581010e512691c75a7ee';

  const ClawMachine = await ethers.getContractAt('ClawMachine', clawMachineAddress);

  console.log('\n🔍 Checking claim requirements...\n');

  const grabCount = await ClawMachine.grabCounts(playerAddress);
  console.log('Grab Count:', grabCount.toString());
  console.log('Requirement: > 0');
  console.log('✅ Pass:', grabCount > 0n);

  const voucherUsed = await ClawMachine.usedVouchers(voucherHash);
  console.log('\nVoucher Used:', voucherUsed);
  console.log('Requirement: false');
  console.log('✅ Pass:', !voucherUsed);

  const oracleAddress = await ClawMachine.oracleAddress();
  console.log('\nOracle Address:', oracleAddress);
  console.log('Expected: 0x1E8eeB986B71FEf99106f3De93A4B1F01Eff26e9');
  console.log('✅ Match:', oracleAddress.toLowerCase() === '0x1E8eeB986B71FEf99106f3De93A4B1F01Eff26e9'.toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
