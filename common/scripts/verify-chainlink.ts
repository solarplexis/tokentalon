import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("\n🔗 Verifying Chainlink Integration on Sepolia...\n");

  // Load deployment
  const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  const gameTokenAddress = deployment.contracts.GameToken.address;

  console.log("📍 GameToken:", gameTokenAddress);

  // Connect to contract
  const gameToken = await ethers.getContractAt("GameToken", gameTokenAddress);

  // Read values
  const tokenPriceUsd = await gameToken.tokenPriceUsd();
  const tokenPriceEth = await gameToken.getTokenPriceEth();
  const priceFeed = await gameToken.priceFeed();

  console.log("\n📊 Contract Values:");
  console.log("=".repeat(60));
  console.log(`Token Price (USD):     ${tokenPriceUsd.toString()} (8 decimals)`);
  console.log(`                       $${(Number(tokenPriceUsd) / 1e8).toFixed(8)} USD`);
  console.log();
  console.log(`Token Price (ETH):     ${ethers.formatEther(tokenPriceEth)} ETH`);
  console.log();
  console.log(`Price Feed Address:    ${priceFeed}`);
  console.log(`Expected (Sepolia):    0x694AA1769357215DE4FAC081bf1f309aDC325306`);
  console.log();

  // Calculate game cost
  const gameCostUsd = (Number(tokenPriceUsd) / 1e8) * 10;
  const gameCostEth = ethers.formatEther(tokenPriceEth * BigInt(10));

  console.log("🎮 Game Cost (10 TALON):");
  console.log(`   USD: $${gameCostUsd.toFixed(6)}`);
  console.log(`   ETH: ${gameCostEth} ETH`);
  console.log();

  // Verify price feed is correct
  if (priceFeed.toLowerCase() === "0x694AA1769357215DE4FAC081bf1f309aDC325306".toLowerCase()) {
    console.log("✅ Chainlink price feed correctly configured!");
  } else {
    console.log("❌ Warning: Price feed address doesn't match expected Sepolia address");
  }

  // Try to get the current ETH/USD price from Chainlink
  const priceFeedContract = await ethers.getContractAt(
    ["function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"],
    priceFeed
  );

  try {
    const roundData = await priceFeedContract.latestRoundData();
    const ethUsdPrice = Number(roundData.answer) / 1e8;
    console.log(`\n💹 Current ETH/USD from Chainlink: $${ethUsdPrice.toFixed(2)}`);
    console.log("✅ Successfully reading live price data from Chainlink!");
  } catch (error) {
    console.log("\n❌ Error reading from Chainlink price feed:", error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Chainlink Integration Verification Complete!");
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
