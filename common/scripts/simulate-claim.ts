import { ethers } from 'hardhat';

async function main() {
  const clawMachineAddress = '0x39f24541e076e8557D20b8CfE695DE72e2f9Ea25';
  const playerAddress = '0x3cFfdAe22c533fd8CC498ac773397f3216d8ae67';
  
  const prizeId = 9636;
  const metadataUri = 'ipfs://bafkreicjydr4hs5bwdfayhslwnbdsp34dif5gcz6jkrdj6iiwypkaljvaa';
  const replayDataHash = 'bafkreig2y2l7w2qlkdx5yivui3nzf35wjw6slmepsqrglu2bvs6rf7npwi';
  const difficulty = 4;
  const nonce = 1764192448668;
  const signature = '0x5e05c3bb7f8dbdc4b17f65b488a1d47f6cd3dc9879ff1e49ac2026dd5046a5515fd0573cd98f50d54f09425f266194d63502c2d805802cd823e3949074d83e8e1c';

  const ClawMachine = await ethers.getContractAt('ClawMachine', clawMachineAddress);

  console.log('\n🔍 Simulating claimPrize transaction...\n');

  try {
    // Try to estimate gas which will reveal errors
    const gas = await ClawMachine.claimPrize.estimateGas(
      prizeId,
      metadataUri,
      replayDataHash,
      difficulty,
      nonce,
      signature
    );
    console.log('✅ Transaction would succeed! Estimated gas:', gas.toString());
  } catch (error: any) {
    console.log('❌ Transaction would fail!');
    console.log('Error:', error.shortMessage || error.message);
    
    if (error.data) {
      console.log('Error data:', error.data);
    }
    
    // Try to decode the revert reason
    if (error.message.includes('Invalid oracle signature')) {
      console.log('\n🔍 Issue: Signature verification failing on-chain');
    } else if (error.message.includes('No grabs recorded')) {
      console.log('\n🔍 Issue: Player has no recorded grabs');
    } else if (error.message.includes('Voucher already used')) {
      console.log('\n🔍 Issue: This voucher was already claimed');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
