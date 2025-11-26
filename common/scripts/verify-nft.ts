import { ethers } from 'hardhat';

async function main() {
  const prizeNFTAddress = '0x6e3703Fa98a6cEA8086599ef407cB863e7425759';
  const tokenId = 2954;
  const yourAddress = '0x3cffdae22c533fd8cc498ac773397f3216d8ae67';

  const PrizeNFT = await ethers.getContractAt('PrizeNFT', prizeNFTAddress);

  console.log('\n🔍 Checking NFT #2954...\n');

  try {
    const owner = await PrizeNFT.ownerOf(tokenId);
    console.log('Owner:', owner);
    console.log('Your address:', yourAddress);
    console.log('Match:', owner.toLowerCase() === yourAddress.toLowerCase());

    const balance = await PrizeNFT.balanceOf(yourAddress);
    console.log('\nYour NFT balance:', balance.toString());

    const tokenURI = await PrizeNFT.tokenURI(tokenId);
    console.log('\nToken URI:', tokenURI);

    const prizeInfo = await PrizeNFT.getPrizeInfo(tokenId);
    console.log('\nPrize Info:');
    console.log('  Prize ID:', prizeInfo.prizeId.toString());
    console.log('  Replay Hash:', prizeInfo.replayDataHash);
    console.log('  Difficulty:', prizeInfo.difficulty.toString());
    console.log('  Tokens Spent:', ethers.formatEther(prizeInfo.tokensSpent));

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
