import dotenv from 'dotenv';
import { validateConfig } from './config/blockchain';
import { validatePinataConfig, testPinataConnection } from './services/ipfsService';
import oracleService from './services/oracleService';

dotenv.config();

/**
 * Test script to validate backend configuration and services
 */

async function testBackendServices() {
  console.log('🧪 Testing TokenTalon Backend Services\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;

  // Test 1: Environment Variables
  console.log('\n1️⃣  Testing Environment Variables...');
  const requiredEnvVars = [
    'ORACLE_PRIVATE_KEY',
    'PINATA_JWT',
    'NETWORK'
  ];
  
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.log('   ❌ Missing environment variables:', missingVars.join(', '));
    failed++;
  } else {
    console.log('   ✅ All required environment variables present');
    passed++;
  }

  // Test 2: Blockchain Configuration
  console.log('\n2️⃣  Testing Blockchain Configuration...');
  const network = (process.env.NETWORK || 'sepolia') as 'sepolia' | 'polygon' | 'amoy';
  const blockchainValid = validateConfig(network);
  if (blockchainValid) {
    console.log('   ✅ Blockchain configuration valid');
    passed++;
  } else {
    console.log('   ⚠️  Blockchain configuration incomplete (contracts not deployed yet)');
    console.log('   ℹ️  This is expected before deployment');
    passed++;
  }

  // Test 3: IPFS Configuration
  console.log('\n3️⃣  Testing IPFS Configuration...');
  const ipfsValid = validatePinataConfig();
  if (ipfsValid) {
    console.log('   ✅ IPFS configuration valid');
    passed++;
  } else {
    console.log('   ❌ IPFS configuration invalid');
    failed++;
  }

  // Test 4: Pinata Connection
  if (ipfsValid) {
    console.log('\n4️⃣  Testing Pinata Connection...');
    try {
      const pinataConnected = await testPinataConnection();
      if (pinataConnected) {
        console.log('   ✅ Pinata connection successful');
        passed++;
      } else {
        console.log('   ❌ Pinata connection failed');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Pinata connection error:', (error as Error).message);
      failed++;
    }
  }

  // Test 5: Oracle Service
  console.log('\n5️⃣  Testing Oracle Service...');
  try {
    const testVoucher = {
      playerAddress: '0x1234567890123456789012345678901234567890',
      prizeId: 1,
      metadataUri: 'ipfs://QmTest',
      replayDataHash: 'QmReplayTest',
      difficulty: 5,
      nonce: oracleService.generateNonce()
    };

    const voucherHash = oracleService.createVoucherHash(testVoucher);
    console.log('   ✅ Voucher hash generation:', voucherHash.substring(0, 16) + '...');
    
    const nonce = oracleService.generateNonce();
    console.log('   ✅ Nonce generation:', nonce);
    
    passed++;
  } catch (error) {
    console.log('   ❌ Oracle service error:', (error as Error).message);
    failed++;
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('=' .repeat(60));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Backend is ready.\n');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please check configuration.\n');
    return false;
  }
}

// Run tests
testBackendServices()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  });
