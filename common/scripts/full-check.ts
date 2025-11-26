import { ethers } from 'hardhat';

async function main() {
  // Latest attempt data
  const playerAddress = '0x3cFfdAe22c533fd8CC498ac773397f3216d8ae67';
  const prizeId = 9636;
  const metadataUri = 'ipfs://bafkreicjydr4hs5bwdfayhslwnbdsp34dif5gcz6jkrdj6iiwypkaljvaa';
  const replayDataHash = 'bafkreig2y2l7w2qlkdx5yivui3nzf35wjw6slmepsqrglu2bvs6rf7npwi';
  const difficulty = 4;
  const nonce = 1764192448668;
  const signature = '0x5e05c3bb7f8dbdc4b17f65b488a1d47f6cd3dc9879ff1e49ac2026dd5046a5515fd0573cd98f50d54f09425f266194d63502c2d805802cd823e3949074d83e8e1c';

  const clawMachineAddress = '0x39f24541e076e8557D20b8CfE695DE72e2f9Ea25';
  const ClawMachine = await ethers.getContractAt('ClawMachine', clawMachineAddress);

  console.log('\n🔍 Testing what the contract will see...\n');

  // Create hash EXACTLY as contract does
  const voucherHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'string', 'string', 'uint8', 'uint256'],
    [playerAddress, prizeId, metadataUri, replayDataHash, difficulty, nonce]
  );

  console.log('Voucher Hash:', voucherHash);

  // Add Ethereum signed message prefix EXACTLY as contract does
  const messageHash = ethers.hashMessage(ethers.getBytes(voucherHash));
  console.log('Message Hash:', messageHash);

  // Recover signer EXACTLY as contract does
  const recovered = ethers.recoverAddress(messageHash, signature);
  console.log('Recovered Signer:', recovered);

  // Check what oracle the contract expects
  const oracleAddress = await ClawMachine.oracleAddress();
  console.log('Contract Oracle:', oracleAddress);

  console.log('\n✅ Match:', recovered.toLowerCase() === oracleAddress.toLowerCase());

  // Check if voucher already used
  const voucherUsed = await ClawMachine.usedVouchers(voucherHash);
  console.log('\nVoucher Used:', voucherUsed);

  // Check grab count for this player
  const grabCount = await ClawMachine.grabCounts(playerAddress);
  console.log('Grab Count:', grabCount.toString());

  console.log('\n📋 All checks:');
  console.log('  ✓ Grab count > 0:', grabCount > 0n);
  console.log('  ✓ Voucher not used:', !voucherUsed);
  console.log('  ✓ Signature valid:', recovered.toLowerCase() === oracleAddress.toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
