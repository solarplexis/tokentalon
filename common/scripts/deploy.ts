import { ethers } from "hardhat";

/**
 * Deployment script for TokenTalon smart contracts
 * Deploys GameToken, PrizeNFT, and ClawMachine contracts
 */

async function main() {
  console.log("🚀 Starting TokenTalon contract deployment...\n");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  console.log("📍 Deploying contracts with account:", deployerAddress);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)), "ETH\n");

  // Deployment parameters
  const INITIAL_TOKEN_SUPPLY = 1_000_000; // 1 million tokens
  const TOKEN_PRICE_USD = 10000000; // $0.10 per token (with 8 decimals: 10000000 = $0.10)
  const COST_PER_PLAY = ethers.parseEther("10"); // 10 tokens per game

  // Chainlink Price Feed Setup
  const network = await ethers.provider.getNetwork();
  const PRICE_FEED_ADDRESSES: Record<string, string> = {
    'sepolia': '0x694AA1769357215DE4FAC081bf1f309aDC325306', // ETH/USD on Sepolia
    'polygon': '0xF9680D99D6C9589e2a93a78A04A279e509205945', // ETH/USD on Polygon
    'amoy': '0xF0d50568e3A7e8259E16663972b11910F89BD8e7', // ETH/USD on Polygon Amoy
  };

  let priceFeedAddress: string;
  const networkName = network.name.toLowerCase();

  // Deploy mock price feed for local networks
  if (networkName === 'localhost' || networkName === 'hardhat') {
    console.log("📄 Deploying MockChainlinkPriceFeed for local testing...");
    const MOCK_ETH_USD_PRICE = 304501000000; // $3,045.01 with 8 decimals
    const MockPriceFeed = await ethers.getContractFactory("MockChainlinkPriceFeed");
    const mockPriceFeed = await MockPriceFeed.deploy(MOCK_ETH_USD_PRICE);
    await mockPriceFeed.waitForDeployment();
    priceFeedAddress = await mockPriceFeed.getAddress();
    console.log("✅ MockChainlinkPriceFeed deployed to:", priceFeedAddress);
    console.log("   Mock ETH/USD Price: $3,045.01\n");
  } else {
    priceFeedAddress = PRICE_FEED_ADDRESSES[networkName];
    if (!priceFeedAddress) {
      throw new Error(`No Chainlink price feed configured for network: ${network.name}`);
    }
    console.log("🔗 Using Chainlink Price Feed:", priceFeedAddress, "\n");
  }

  // 1. Deploy GameToken
  console.log("📄 Deploying GameToken...");
  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy(INITIAL_TOKEN_SUPPLY, TOKEN_PRICE_USD, priceFeedAddress);
  await gameToken.waitForDeployment();
  const gameTokenAddress = await gameToken.getAddress();
  console.log("✅ GameToken deployed to:", gameTokenAddress);
  console.log("   - Initial supply:", INITIAL_TOKEN_SUPPLY, "tokens");
  console.log("   - Token price (USD):", TOKEN_PRICE_USD, "($0.10)\n");

  // 2. Deploy PrizeNFT
  console.log("📄 Deploying PrizeNFT...");
  const PrizeNFT = await ethers.getContractFactory("PrizeNFT");
  const prizeNFT = await PrizeNFT.deploy();
  await prizeNFT.waitForDeployment();
  const prizeNFTAddress = await prizeNFT.getAddress();
  console.log("✅ PrizeNFT deployed to:", prizeNFTAddress, "\n");

  // 3. Deploy ClawMachine
  console.log("📄 Deploying ClawMachine...");
  const ClawMachine = await ethers.getContractFactory("ClawMachine");
  const clawMachine = await ClawMachine.deploy(
    gameTokenAddress,
    prizeNFTAddress,
    deployerAddress, // Use deployer as oracle initially
    COST_PER_PLAY
  );
  await clawMachine.waitForDeployment();
  const clawMachineAddress = await clawMachine.getAddress();
  console.log("✅ ClawMachine deployed to:", clawMachineAddress);
  console.log("   - Cost per play:", ethers.formatEther(COST_PER_PLAY), "tokens");
  console.log("   - Oracle address:", deployerAddress, "\n");

  // 4. Grant ClawMachine minter role on PrizeNFT
  console.log("🔐 Granting minter role to ClawMachine...");
  const tx = await prizeNFT.grantMinterRole(clawMachineAddress);
  await tx.wait();
  console.log("✅ Minter role granted\n");

  // Summary
  console.log("=" .repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("=" .repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   GameToken:    ", gameTokenAddress);
  console.log("   PrizeNFT:     ", prizeNFTAddress);
  console.log("   ClawMachine:  ", clawMachineAddress);
  
  console.log("\n📝 Environment Variables (add to .env):");
  console.log(`SEPOLIA_GAMETOKEN_ADDRESS=${gameTokenAddress}`);
  console.log(`SEPOLIA_PRIZENFT_ADDRESS=${prizeNFTAddress}`);
  console.log(`SEPOLIA_CLAWMACHINE_ADDRESS=${clawMachineAddress}`);
  console.log(`ORACLE_PRIVATE_KEY=${process.env.SEPOLIA_PRIVATE_KEY}`);
  
  console.log("\n🔍 Verify contracts on Etherscan:");
  console.log(`npx hardhat verify --network sepolia ${gameTokenAddress} ${INITIAL_TOKEN_SUPPLY} ${TOKEN_PRICE_USD} ${priceFeedAddress}`);
  console.log(`npx hardhat verify --network sepolia ${prizeNFTAddress}`);
  console.log(`npx hardhat verify --network sepolia ${clawMachineAddress} ${gameTokenAddress} ${prizeNFTAddress} ${deployerAddress} ${COST_PER_PLAY}`);
  
  console.log("\n✅ Next steps:");
  console.log("   1. Update server/.env with contract addresses");
  console.log("   2. Update client config with contract addresses");
  console.log("   3. Verify contracts on Etherscan (optional)");
  console.log("   4. Test on Sepolia testnet");
  console.log("=" .repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
