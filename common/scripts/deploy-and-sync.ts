import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Unified Deployment Script
 *
 * This script:
 * 1. Deploys TokenTalon contracts
 * 2. Saves deployment info to deployments/{network}.json (single source of truth)
 * 3. Auto-generates client/lib/contracts/addresses.ts
 * 4. Auto-generates server/src/config/contracts.ts
 * 5. Validates the deployment
 */

interface DeploymentRecord {
  address: string;
  deployedAt: string;
  blockNumber: number;
  transactionHash: string;
  constructorArgs: any[];
  verified: boolean;
  version: string;
}

interface NetworkDeployment {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
  contracts: {
    GameToken: DeploymentRecord;
    PrizeNFT: DeploymentRecord;
    ClawMachine: DeploymentRecord;
  };
  oracle: {
    address: string;
    description: string;
  };
  metadata: {
    rpcUrl: string;
    explorerUrl: string;
    gasPrice: string;
    deploymentNotes: string;
  };
}

async function main() {
  console.log("🚀 Starting TokenTalon unified deployment...\n");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const network = await ethers.provider.getNetwork();

  console.log("📍 Network:", network.name, `(chainId: ${network.chainId})`);
  console.log("👤 Deployer:", deployerAddress);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)), "ETH\n");

  // Deployment parameters
  const INITIAL_TOKEN_SUPPLY = 1_000_000; // 1 million tokens
  const TOKEN_PRICE_USD = 10000000; // $0.10 per token (with 8 decimals: 10000000 = $0.10)
  const COST_PER_PLAY = ethers.parseEther("10"); // 10 tokens per game

  // Chainlink Price Feed Setup
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
  const gameTokenTx = gameToken.deploymentTransaction();
  console.log("✅ GameToken deployed to:", gameTokenAddress);

  // 2. Deploy PrizeNFT
  console.log("📄 Deploying PrizeNFT...");
  const PrizeNFT = await ethers.getContractFactory("PrizeNFT");
  const prizeNFT = await PrizeNFT.deploy();
  await prizeNFT.waitForDeployment();
  const prizeNFTAddress = await prizeNFT.getAddress();
  const prizeNFTTx = prizeNFT.deploymentTransaction();
  console.log("✅ PrizeNFT deployed to:", prizeNFTAddress);

  // 3. Deploy ClawMachine
  console.log("📄 Deploying ClawMachine...");
  const oracleAddress = process.env.ORACLE_ADDRESS || deployerAddress;
  const ClawMachine = await ethers.getContractFactory("ClawMachine");
  const clawMachine = await ClawMachine.deploy(
    gameTokenAddress,
    prizeNFTAddress,
    oracleAddress,
    COST_PER_PLAY
  );
  await clawMachine.waitForDeployment();
  const clawMachineAddress = await clawMachine.getAddress();
  const clawMachineTx = clawMachine.deploymentTransaction();
  console.log("✅ ClawMachine deployed to:", clawMachineAddress);

  // 4. Grant ClawMachine minter role on PrizeNFT
  console.log("🔐 Granting minter role to ClawMachine...");
  const grantTx = await prizeNFT.grantMinterRole(clawMachineAddress);
  await grantTx.wait();
  console.log("✅ Minter role granted\n");

  // 5. Create deployment record
  const deployment: NetworkDeployment = {
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      GameToken: {
        address: gameTokenAddress,
        deployedAt: new Date().toISOString(),
        blockNumber: gameTokenTx?.blockNumber || 0,
        transactionHash: gameTokenTx?.hash || "",
        constructorArgs: [INITIAL_TOKEN_SUPPLY, TOKEN_PRICE_USD, priceFeedAddress],
        verified: false,
        version: "2.0.0"
      },
      PrizeNFT: {
        address: prizeNFTAddress,
        deployedAt: new Date().toISOString(),
        blockNumber: prizeNFTTx?.blockNumber || 0,
        transactionHash: prizeNFTTx?.hash || "",
        constructorArgs: [],
        verified: false,
        version: "1.0.0"
      },
      ClawMachine: {
        address: clawMachineAddress,
        deployedAt: new Date().toISOString(),
        blockNumber: clawMachineTx?.blockNumber || 0,
        transactionHash: clawMachineTx?.hash || "",
        constructorArgs: [gameTokenAddress, prizeNFTAddress, oracleAddress, COST_PER_PLAY.toString()],
        verified: false,
        version: "1.0.0"
      }
    },
    oracle: {
      address: oracleAddress,
      description: "Backend signing wallet"
    },
    metadata: {
      rpcUrl: getRpcUrl(network.name),
      explorerUrl: getExplorerUrl(network.name),
      gasPrice: (await ethers.provider.getFeeData()).gasPrice?.toString() || "0",
      deploymentNotes: process.env.DEPLOYMENT_NOTES || `Deployed ${network.name} contracts`
    }
  };

  // 6. Save deployment record
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`✅ Deployment record saved to ${deploymentPath}`);

  // 7. Auto-sync to frontend and backend
  await syncToFrontend(deployment);
  await syncToBackend(deployment);

  // 8. Print summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deployment Complete & Synced!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log(`   GameToken:   ${gameTokenAddress}`);
  console.log(`   PrizeNFT:    ${prizeNFTAddress}`);
  console.log(`   ClawMachine: ${clawMachineAddress}`);
  console.log(`   Oracle:      ${oracleAddress}`);

  console.log("\n📁 Files Updated:");
  console.log(`   ✅ common/deployments/${network.name}.json`);
  console.log(`   ✅ client/lib/contracts/addresses.ts`);
  console.log(`   ✅ server/src/config/contracts.ts`);

  console.log("\n🔍 Verify contracts on explorer:");
  console.log(`   ${deployment.metadata.explorerUrl}/address/${gameTokenAddress}`);
  console.log(`   ${deployment.metadata.explorerUrl}/address/${prizeNFTAddress}`);
  console.log(`   ${deployment.metadata.explorerUrl}/address/${clawMachineAddress}`);

  console.log("\n✅ Next steps:");
  console.log(`   1. Verify deployment: npm run validate -- ${network.name}`);
  console.log(`   2. View addresses: npm run addresses -- ${network.name}`);
  console.log(`   3. Verify on Etherscan (optional)`);
  console.log("=".repeat(60) + "\n");
}

async function syncToFrontend(deployment: NetworkDeployment) {
  const networkKey = getNetworkKey(deployment.network);
  const frontendPath = path.join(__dirname, "../../client/lib/contracts/addresses.ts");

  // Load existing networks if file exists
  let existingNetworks: Record<string, any> = {};
  if (fs.existsSync(frontendPath)) {
    try {
      const existingContent = fs.readFileSync(frontendPath, 'utf-8');
      // Extract existing networks (simple parsing - looks for network keys)
      const networksMatch = existingContent.match(/export const CONTRACTS = \{([^}]+(?:\{[^}]+\}[^}]*)*)\}/s);
      if (networksMatch) {
        // Parse existing networks (we'll regenerate the file, but keep other networks)
        const existingDeployments = fs.readdirSync(path.join(__dirname, "../deployments"))
          .filter(f => f.endsWith('.json') && f !== `${deployment.network}.json`)
          .map(f => f.replace('.json', ''));

        for (const net of existingDeployments) {
          const depPath = path.join(__dirname, `../deployments/${net}.json`);
          const dep = JSON.parse(fs.readFileSync(depPath, 'utf-8'));
          const key = getNetworkKey(dep.network);
          existingNetworks[key] = {
            gameToken: dep.contracts.GameToken.address,
            prizeNFT: dep.contracts.PrizeNFT.address,
            clawMachine: dep.contracts.ClawMachine.address,
          };
        }
      }
    } catch (error) {
      console.log('   Note: Could not parse existing config, will overwrite');
    }
  }

  // Add/update current network
  existingNetworks[networkKey] = {
    gameToken: deployment.contracts.GameToken.address,
    prizeNFT: deployment.contracts.PrizeNFT.address,
    clawMachine: deployment.contracts.ClawMachine.address,
  };

  // Generate config with all networks
  const networksConfig = Object.entries(existingNetworks)
    .map(([key, addrs]) => `  ${key}: {
    gameToken: "${addrs.gameToken}" as \`0x\${string}\`,
    prizeNFT: "${addrs.prizeNFT}" as \`0x\${string}\`,
    clawMachine: "${addrs.clawMachine}" as \`0x\${string}\`,
  }`)
    .join(',\n');

  const frontendConfig = `// Auto-generated by deploy-and-sync.ts - DO NOT EDIT MANUALLY
// Last updated: ${deployment.deployedAt}
// Latest deployment: ${deployment.network} (chainId: ${deployment.chainId})

export const CONTRACTS = {
${networksConfig}
} as const;

export const ORACLE_ADDRESS = "${deployment.oracle.address}" as \`0x\${string}\`;

// Deployment metadata for latest deployment
export const DEPLOYMENT_INFO = {
  network: "${deployment.network}",
  chainId: ${deployment.chainId},
  explorerUrl: "${deployment.metadata.explorerUrl}",
  deployedAt: "${deployment.deployedAt}",
  deployer: "${deployment.deployer}",
  version: "${deployment.contracts.GameToken.version}",
} as const;
`;

  fs.writeFileSync(frontendPath, frontendConfig);
  console.log(`✅ Frontend config synced: ${frontendPath}`);
  console.log(`   Networks in config: ${Object.keys(existingNetworks).join(', ')}`);
}

async function syncToBackend(deployment: NetworkDeployment) {
  const networkKey = getNetworkKey(deployment.network);
  const backendPath = path.join(__dirname, "../../server/src/config/contracts.ts");

  // Load existing networks if file exists
  let existingNetworks: Record<string, any> = {};
  if (fs.existsSync(backendPath)) {
    try {
      // Load from deployment files to rebuild all networks
      const existingDeployments = fs.readdirSync(path.join(__dirname, "../deployments"))
        .filter(f => f.endsWith('.json') && f !== `${deployment.network}.json`)
        .map(f => f.replace('.json', ''));

      for (const net of existingDeployments) {
        const depPath = path.join(__dirname, `../deployments/${net}.json`);
        const dep = JSON.parse(fs.readFileSync(depPath, 'utf-8'));
        const key = getNetworkKey(dep.network);
        existingNetworks[key] = {
          gameToken: dep.contracts.GameToken.address,
          prizeNFT: dep.contracts.PrizeNFT.address,
          clawMachine: dep.contracts.ClawMachine.address,
        };
      }
    } catch (error) {
      console.log('   Note: Could not load existing deployments, will create new config');
    }
  }

  // Add/update current network
  existingNetworks[networkKey] = {
    gameToken: deployment.contracts.GameToken.address,
    prizeNFT: deployment.contracts.PrizeNFT.address,
    clawMachine: deployment.contracts.ClawMachine.address,
  };

  // Generate config with all networks
  const networksConfig = Object.entries(existingNetworks)
    .map(([key, addrs]) => `  ${key}: {
    gameToken: "${addrs.gameToken}",
    prizeNFT: "${addrs.prizeNFT}",
    clawMachine: "${addrs.clawMachine}",
  }`)
    .join(',\n');

  const backendConfig = `// Auto-generated by deploy-and-sync.ts - DO NOT EDIT MANUALLY
// Last updated: ${deployment.deployedAt}
// Latest deployment: ${deployment.network} (chainId: ${deployment.chainId})

export const CONTRACTS = {
${networksConfig}
};

export const ORACLE_ADDRESS = "${deployment.oracle.address}";

// Deployment metadata for latest deployment
export const DEPLOYMENT_INFO = {
  network: "${deployment.network}",
  chainId: ${deployment.chainId},
  rpcUrl: "${deployment.metadata.rpcUrl}",
  explorerUrl: "${deployment.metadata.explorerUrl}",
  deployedAt: "${deployment.deployedAt}",
  deployer: "${deployment.deployer}",
  blockNumbers: {
    gameToken: ${deployment.contracts.GameToken.blockNumber},
    prizeNFT: ${deployment.contracts.PrizeNFT.blockNumber},
    clawMachine: ${deployment.contracts.ClawMachine.blockNumber},
  },
};
`;

  fs.writeFileSync(backendPath, backendConfig);
  console.log(`✅ Backend config synced: ${backendPath}`);
  console.log(`   Networks in config: ${Object.keys(existingNetworks).join(', ')}`);
}

function getNetworkKey(networkName: string): string {
  const networkMap: Record<string, string> = {
    'sepolia': 'sepolia',
    'polygon': 'polygon',
    'amoy': 'polygonAmoy',
    'localhost': 'localhost',
    'hardhat': 'localhost',
  };
  return networkMap[networkName.toLowerCase()] || networkName;
}

function getRpcUrl(networkName: string): string {
  const envKey = `${networkName.toUpperCase()}_RPC_URL`;
  const defaultUrls: Record<string, string> = {
    'sepolia': 'https://ethereum-sepolia-rpc.publicnode.com',
    'polygon': 'https://polygon-rpc.com',
    'amoy': 'https://rpc-amoy.polygon.technology',
    'localhost': 'http://localhost:8545',
  };
  return process.env[envKey] || defaultUrls[networkName.toLowerCase()] || '';
}

function getExplorerUrl(networkName: string): string {
  const explorers: Record<string, string> = {
    'sepolia': 'https://sepolia.etherscan.io',
    'polygon': 'https://polygonscan.com',
    'amoy': 'https://amoy.polygonscan.com',
    'localhost': 'http://localhost:8545',
  };
  return explorers[networkName.toLowerCase()] || '';
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
