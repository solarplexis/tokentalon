import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const privateKey = process.env.ORACLE_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ ORACLE_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey);
  
  console.log('\n🔍 Backend Oracle Configuration:\n');
  console.log('Oracle Address:', wallet.address);
  
  // Test signing the same data
  const playerAddress = '0x3cFfdAe22c533fd8CC498ac773397f3216d8ae67';
  const prizeId = 2954;
  const metadataUri = 'ipfs://bafkreibu76nap6gdx3nfqojatg4cgnrguqibtfdss5o53pllp6ukxttvski';
  const replayDataHash = 'bafkreihyq3oaehazssmmjapzm24onm3cb3wsc75fiw3hoe3qquhlw5gn5m';
  const difficulty = 4;
  const nonce = 111989877863570;

  const voucherHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'string', 'string', 'uint8', 'uint256'],
    [playerAddress, prizeId, metadataUri, replayDataHash, difficulty, nonce]
  );

  console.log('Voucher Hash:', voucherHash);

  const signature = await wallet.signMessage(ethers.getBytes(voucherHash));
  console.log('Signature:', signature);
  
  // Verify
  const messageHash = ethers.hashMessage(ethers.getBytes(voucherHash));
  const recovered = ethers.recoverAddress(messageHash, signature);
  console.log('Recovered Address:', recovered);
  console.log('Match:', recovered.toLowerCase() === wallet.address.toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
