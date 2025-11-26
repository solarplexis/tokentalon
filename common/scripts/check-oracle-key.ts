import { ethers } from 'hardhat';

async function main() {
  const wrongKey = 'e0381640f25a1b9d8cf17615385766c6b97e581f9663b1879c846c6760ea8f94';
  const wrongWallet = new ethers.Wallet(wrongKey);
  
  console.log('\n🔍 Current ORACLE_PRIVATE_KEY in server/.env:');
  console.log('Private Key:', wrongKey);
  console.log('Address:', wrongWallet.address);
  console.log('');
  
  console.log('❌ This does NOT match the oracle address in the contract!');
  console.log('');
  console.log('Expected Oracle Address: 0x1E8eeB986B71FEf99106f3De93A4B1F01Eff26e9');
  console.log('');
  
  // Get the correct private key from environment (deployment account)
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  
  console.log('✅ Correct oracle address (deployment account):', deployer.address);
  console.log('');
  console.log('The ORACLE_PRIVATE_KEY in server/.env should be the same private key used for deployment.');
  console.log('Check your .env file in the common folder for PRIVATE_KEY.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
