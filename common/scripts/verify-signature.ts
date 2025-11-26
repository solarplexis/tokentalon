import { ethers } from 'hardhat';

async function main() {
  // Data from LATEST transaction with correct oracle key
  const playerAddress = '0x3cFfdAe22c533fd8CC498ac773397f3216d8ae67';
  const prizeId = 9636;
  const metadataUri = 'ipfs://bafkreicjydr4hs5bwdfayhslwnbdsp34dif5gcz6jkrdj6iiwypkaljvaa';
  const replayDataHash = 'bafkreig2y2l7w2qlkdx5yivui3nzf35wjw6slmepsqrglu2bvs6rf7npwi';
  const difficulty = 4;
  const nonce = 1764192448668;
  const signature = '0x5e05c3bb7f8dbdc4b17f65b488a1d47f6cd3dc9879ff1e49ac2026dd5046a5515fd0573cd98f50d54f09425f266194d63502c2d805802cd823e3949074d83e8e1c';

  console.log('\n🔍 Verifying oracle signature...\n');

  // Recreate the voucher hash using solidityPackedKeccak256 (matches abi.encodePacked)
  const voucherHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'string', 'string', 'uint8', 'uint256'],
    [playerAddress, prizeId, metadataUri, replayDataHash, difficulty, nonce]
  );

  console.log('Voucher Hash:', voucherHash);

  // Create Ethereum signed message hash
  const messageHash = ethers.hashMessage(ethers.getBytes(voucherHash));
  console.log('Message Hash:', messageHash);

  // Recover signer
  const recoveredAddress = ethers.recoverAddress(messageHash, signature);
  console.log('\nRecovered Signer:', recoveredAddress);

  // Check against oracle address
  const clawMachineAddress = '0x39f24541e076e8557D20b8CfE695DE72e2f9Ea25';
  const ClawMachine = await ethers.getContractAt('ClawMachine', clawMachineAddress);
  const oracleAddress = await ClawMachine.oracleAddress();
  
  console.log('Expected Oracle:', oracleAddress);
  console.log('\nSignature Valid:', recoveredAddress.toLowerCase() === oracleAddress.toLowerCase());

  if (recoveredAddress.toLowerCase() !== oracleAddress.toLowerCase()) {
    console.log('\n❌ SIGNATURE MISMATCH!');
    console.log('   The backend is signing with a different key than what the contract expects.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
