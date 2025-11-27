import fs from "fs";
import path from "path";

/**
 * Show Deployment Addresses
 *
 * Quick reference script to display contract addresses and deployment info
 */

function showAddresses(networkName: string) {
  const deploymentPath = path.join(__dirname, `../deployments/${networkName}.json`);

  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ No deployment found for ${networkName}`);
    console.log(`\n📁 Available networks: ${getAvailableNetworks().join(", ")}`);
    return;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  console.log("\n" + "=".repeat(70));
  console.log(`📋 ${networkName.toUpperCase()} Deployment Info`);
  console.log("=".repeat(70));

  console.log(`\n🌐 Network Details:`);
  console.log(`   Name:      ${deployment.network}`);
  console.log(`   Chain ID:  ${deployment.chainId}`);
  console.log(`   Deployed:  ${new Date(deployment.deployedAt).toLocaleString()}`);
  console.log(`   Deployer:  ${deployment.deployer}`);

  console.log(`\n📄 Contract Addresses:`);

  for (const [name, contract] of Object.entries(deployment.contracts) as [string, any][]) {
    console.log(`\n   ${name}:`);
    console.log(`      Address:     ${contract.address}`);
    console.log(`      Explorer:    ${deployment.metadata.explorerUrl}/address/${contract.address}`);
    console.log(`      Block:       ${contract.blockNumber}`);
    console.log(`      Tx Hash:     ${contract.transactionHash}`);
    console.log(`      Verified:    ${contract.verified ? "✅" : "❌ (run verify command)"}`);
    console.log(`      Version:     ${contract.version}`);
  }

  console.log(`\n🔐 Oracle Configuration:`);
  console.log(`   Address:     ${deployment.oracle.address}`);
  console.log(`   Description: ${deployment.oracle.description}`);

  console.log(`\n⚙️  Network Configuration:`);
  console.log(`   RPC URL:     ${deployment.metadata.rpcUrl}`);
  console.log(`   Explorer:    ${deployment.metadata.explorerUrl}`);

  if (deployment.metadata.deploymentNotes) {
    console.log(`\n📝 Notes:`);
    console.log(`   ${deployment.metadata.deploymentNotes}`);
  }

  console.log("\n" + "=".repeat(70));

  console.log("\n📋 Quick Copy-Paste:\n");
  console.log("   Environment Variables:");
  console.log(`   ${networkName.toUpperCase()}_GAMETOKEN_ADDRESS=${deployment.contracts.GameToken.address}`);
  console.log(`   ${networkName.toUpperCase()}_PRIZENFT_ADDRESS=${deployment.contracts.PrizeNFT.address}`);
  console.log(`   ${networkName.toUpperCase()}_CLAWMACHINE_ADDRESS=${deployment.contracts.ClawMachine.address}`);

  console.log("\n   Verification Commands:");
  const gameTokenArgs = deployment.contracts.GameToken.constructorArgs.join(" ");
  const clawMachineArgs = deployment.contracts.ClawMachine.constructorArgs.join(" ");

  console.log(`   npx hardhat verify --network ${networkName} ${deployment.contracts.GameToken.address} ${gameTokenArgs}`);
  console.log(`   npx hardhat verify --network ${networkName} ${deployment.contracts.PrizeNFT.address}`);
  console.log(`   npx hardhat verify --network ${networkName} ${deployment.contracts.ClawMachine.address} ${clawMachineArgs}`);

  console.log("\n" + "=".repeat(70) + "\n");
}

function showAllDeployments() {
  const networks = getAvailableNetworks();

  if (networks.length === 0) {
    console.log("\n❌ No deployments found");
    console.log("\n💡 Deploy contracts first:");
    console.log("   npx hardhat run scripts/deploy-and-sync.ts --network <network>\n");
    return;
  }

  console.log("\n" + "=".repeat(70));
  console.log("📋 All Deployments");
  console.log("=".repeat(70) + "\n");

  for (const network of networks) {
    const deploymentPath = path.join(__dirname, `../deployments/${network}.json`);
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

    console.log(`🌐 ${network.toUpperCase()}`);
    console.log(`   Deployed:    ${new Date(deployment.deployedAt).toLocaleString()}`);
    console.log(`   GameToken:   ${deployment.contracts.GameToken.address}`);
    console.log(`   PrizeNFT:    ${deployment.contracts.PrizeNFT.address}`);
    console.log(`   ClawMachine: ${deployment.contracts.ClawMachine.address}`);
    console.log();
  }

  console.log("💡 View details: npm run addresses -- <network>");
  console.log("💡 Validate sync: npm run validate -- <network>");
  console.log("=".repeat(70) + "\n");
}

function getAvailableNetworks(): string[] {
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) return [];

  return fs.readdirSync(deploymentsDir)
    .filter(file => file.endsWith(".json"))
    .map(file => file.replace(".json", ""));
}

// Main execution
const networkName = process.argv[2];

if (!networkName || networkName === "all") {
  showAllDeployments();
} else {
  showAddresses(networkName);
}
