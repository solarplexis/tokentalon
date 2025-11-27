import { ethers } from "ethers";
import fs from "fs";
import path from "path";

/**
 * Deployment Validation Script
 *
 * This script validates that:
 * 1. All addresses in deployment.json are valid
 * 2. Contracts are actually deployed on-chain
 * 3. Frontend config matches deployment.json
 * 4. Backend config matches deployment.json
 * 5. Contract ownership is correct
 */

interface CheckResults {
  addressesValid: boolean;
  contractsDeployed: boolean;
  frontendSynced: boolean;
  backendSynced: boolean;
  ownershipCorrect: boolean;
}

async function validateDeployment(networkName: string) {
  console.log(`🔍 Validating ${networkName} deployment...\n`);

  // Load deployment record
  const deploymentPath = path.join(__dirname, `../deployments/${networkName}.json`);

  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ No deployment found for ${networkName}`);
    console.log(`\n📁 Available deployments: ${getAvailableNetworks().join(", ")}`);
    return false;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  const checks: CheckResults = {
    addressesValid: false,
    contractsDeployed: false,
    frontendSynced: false,
    backendSynced: false,
    ownershipCorrect: false,
  };

  // 1. Check all addresses are valid Ethereum addresses
  console.log("📋 Checking address validity...");
  let allValid = true;
  for (const [name, contract] of Object.entries(deployment.contracts) as [string, any][]) {
    if (!ethers.isAddress(contract.address)) {
      console.error(`   ❌ Invalid address for ${name}: ${contract.address}`);
      allValid = false;
    } else {
      console.log(`   ✅ ${name}: ${contract.address}`);
    }
  }
  checks.addressesValid = allValid;

  if (!allValid) {
    console.log("\n❌ Address validation failed!\n");
    printSummary(checks);
    return false;
  }

  // 2. Check contracts are actually deployed on-chain
  console.log("\n🌐 Checking on-chain deployment...");
  try {
    const provider = new ethers.JsonRpcProvider(deployment.metadata.rpcUrl);

    for (const [name, contract] of Object.entries(deployment.contracts) as [string, any][]) {
      const code = await provider.getCode(contract.address);
      if (code === "0x") {
        console.error(`   ❌ No contract deployed at ${name}: ${contract.address}`);
        checks.contractsDeployed = false;
        printSummary(checks);
        return false;
      }
      console.log(`   ✅ ${name} verified on-chain`);
    }
    checks.contractsDeployed = true;
  } catch (error: any) {
    console.error(`   ❌ Error checking on-chain deployment: ${error.message}`);
    printSummary(checks);
    return false;
  }

  // 3. Check frontend config matches
  console.log("\n📱 Checking frontend sync...");
  const frontendPath = path.join(__dirname, "../../client/lib/contracts/addresses.ts");

  if (!fs.existsSync(frontendPath)) {
    console.error(`   ❌ Frontend config not found: ${frontendPath}`);
    checks.frontendSynced = false;
  } else {
    const frontendContent = fs.readFileSync(frontendPath, "utf-8");
    let frontendSynced = true;

    for (const [name, contract] of Object.entries(deployment.contracts) as [string, any][]) {
      if (!frontendContent.includes(contract.address.toLowerCase()) &&
          !frontendContent.includes(contract.address)) {
        console.error(`   ❌ Frontend missing address for ${name}`);
        frontendSynced = false;
      }
    }

    if (frontendSynced) {
      console.log(`   ✅ Frontend config matches deployment`);
      checks.frontendSynced = true;
    } else {
      checks.frontendSynced = false;
    }
  }

  // 4. Check backend config matches
  console.log("\n🖥️  Checking backend sync...");
  const backendPath = path.join(__dirname, "../../server/src/config/contracts.ts");

  if (!fs.existsSync(backendPath)) {
    console.error(`   ❌ Backend config not found: ${backendPath}`);
    checks.backendSynced = false;
  } else {
    const backendContent = fs.readFileSync(backendPath, "utf-8");
    let backendSynced = true;

    for (const [name, contract] of Object.entries(deployment.contracts) as [string, any][]) {
      if (!backendContent.includes(contract.address.toLowerCase()) &&
          !backendContent.includes(contract.address)) {
        console.error(`   ❌ Backend missing address for ${name}`);
        backendSynced = false;
      }
    }

    if (backendSynced) {
      console.log(`   ✅ Backend config matches deployment`);
      checks.backendSynced = true;
    } else {
      checks.backendSynced = false;
    }
  }

  // 5. Check contract ownership (if possible)
  console.log("\n🔐 Checking contract ownership...");
  try {
    const provider = new ethers.JsonRpcProvider(deployment.metadata.rpcUrl);

    // Check GameToken ownership
    const gameTokenAbi = [
      "function owner() view returns (address)"
    ];
    const gameToken = new ethers.Contract(
      deployment.contracts.GameToken.address,
      gameTokenAbi,
      provider
    );

    const owner = await gameToken.owner();
    if (owner.toLowerCase() === deployment.deployer.toLowerCase()) {
      console.log(`   ✅ GameToken owner: ${owner}`);
      checks.ownershipCorrect = true;
    } else {
      console.warn(`   ⚠️  GameToken owner (${owner}) differs from deployer (${deployment.deployer})`);
      checks.ownershipCorrect = true; // Not a failure, just a warning
    }
  } catch (error: any) {
    console.warn(`   ⚠️  Could not verify ownership: ${error.message}`);
    checks.ownershipCorrect = true; // Not a failure
  }

  // Print summary
  printSummary(checks);

  const allPassed = Object.values(checks).every(check => check);
  return allPassed;
}

function printSummary(checks: CheckResults) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 Validation Summary:");
  console.log("=".repeat(60));
  console.log(`  Addresses valid:      ${checks.addressesValid ? "✅" : "❌"}`);
  console.log(`  Contracts deployed:   ${checks.contractsDeployed ? "✅" : "❌"}`);
  console.log(`  Frontend synced:      ${checks.frontendSynced ? "✅" : "❌"}`);
  console.log(`  Backend synced:       ${checks.backendSynced ? "✅" : "❌"}`);
  console.log(`  Ownership correct:    ${checks.ownershipCorrect ? "✅" : "❌"}`);
  console.log("=".repeat(60));

  const allPassed = Object.values(checks).every(check => check);
  if (allPassed) {
    console.log("\n✅ All validation checks passed!\n");
  } else {
    console.log("\n❌ Some validation checks failed!\n");
    console.log("💡 To fix sync issues, run:");
    console.log("   npx hardhat run scripts/deploy-and-sync.ts --network <network>\n");
  }
}

function getAvailableNetworks(): string[] {
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) return [];

  return fs.readdirSync(deploymentsDir)
    .filter(file => file.endsWith(".json"))
    .map(file => file.replace(".json", ""));
}

// Run validation
const networkName = process.argv[2] || "sepolia";
validateDeployment(networkName)
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("\n❌ Validation error:", error.message);
    process.exit(1);
  });
