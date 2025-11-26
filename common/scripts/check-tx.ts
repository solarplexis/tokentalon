import { ethers } from 'hardhat';

async function main() {
  const txHash = '0xac8f53af8798f5b7b5364c5ec19d5d52bf5bdc46384fc1c1ce9395abf61778d6';
  
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  
  console.log('\n🔍 Checking transaction...\n');
  
  const tx = await provider.getTransaction(txHash);
  console.log('Transaction found:', !!tx);
  
  if (tx) {
    console.log('From:', tx.from);
    console.log('To:', tx.to);
    console.log('Block:', tx.blockNumber);
    console.log('Data:', tx.data);
    
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      console.log('\nReceipt:');
      console.log('Status:', receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED');
      console.log('Gas used:', receipt.gasUsed.toString());
      console.log('Block:', receipt.blockNumber);
      
      console.log('\nLogs:');
      receipt.logs.forEach((log, i) => {
        console.log(`  Log ${i}:`, log.address);
        console.log(`    Topics:`, log.topics);
      });
      
      // Try to get revert reason
      try {
        await provider.call(tx, tx.blockNumber);
      } catch (error: any) {
        console.log('\n❌ Revert reason:', error.message || error.reason || error);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
