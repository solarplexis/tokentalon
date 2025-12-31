import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { PRIZENFT_ABI } from '@/lib/web3/abis';
import { CONTRACTS } from '@/lib/web3/config';

// Disable Next.js route caching for real-time NFT updates
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simple cache to avoid repeated queries (in production, use Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds - reduced for faster NFT updates

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Missing address parameter' },
      { status: 400 }
    );
  }

  try {
    // Check cache
    const cacheKey = `nfts_${address.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`🔄 Returning cached data for ${address}`);
      return NextResponse.json(cached.data);
    }

    // Use public Sepolia RPC (thirdweb allows 1000 blocks, Alchemy free tier only 10)
    const client = createPublicClient({
      chain: sepolia,
      transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
    });

    const contractAddress = CONTRACTS.sepolia.prizeNFT;

    // Get balance
    const balance = await client.readContract({
      address: contractAddress,
      abi: PRIZENFT_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    const balanceNum = Number(balance);
    console.log(`📊 Balance for ${address}: ${balanceNum}`);

    if (balanceNum === 0) {
      const result = { balance: 0, nfts: [] };
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    // Query PrizeClaimed events from ClawMachine contract
    // This is more efficient than Transfer events since it's more targeted
    console.log(`🔍 Scanning PrizeClaimed events to find owned NFTs...`);

    const clawMachineAddress = CONTRACTS.sepolia.clawMachine;
    const currentBlock = await client.getBlockNumber();

    // Scan last 1000 blocks (about 2-3 hours on Sepolia), should catch recent claims
    const BLOCKS_TO_SCAN = 1000n;
    const startBlock = currentBlock > BLOCKS_TO_SCAN ? currentBlock - BLOCKS_TO_SCAN : 0n;

    console.log(`📊 Scanning blocks ${startBlock} to ${currentBlock}`);

    // Declare ownedTokenIds outside try block for proper scoping
    const ownedTokenIds = new Set<string>();

    try {
      // Get all PrizeClaimed events for this player
      const claimedEvents = await client.getContractEvents({
        address: clawMachineAddress,
        abi: [
          {
            anonymous: false,
            inputs: [
              { indexed: true, name: 'player', type: 'address' },
              { indexed: true, name: 'tokenId', type: 'uint256' },
              { indexed: false, name: 'prizeId', type: 'uint256' },
              { indexed: false, name: 'voucherHash', type: 'bytes32' }
            ],
            name: 'PrizeClaimed',
            type: 'event'
          }
        ],
        eventName: 'PrizeClaimed',
        args: {
          player: address as `0x${string}`
        },
        fromBlock: startBlock,
        toBlock: 'latest'
      });

      console.log(`🎁 Found ${claimedEvents.length} PrizeClaimed events`);

      // Extract token IDs from events
      claimedEvents.forEach((log: any) => {
        ownedTokenIds.add(log.args.tokenId.toString());
        console.log(`  Token ID: ${log.args.tokenId}, Prize ID: ${log.args.prizeId}`);
      });

      // Also check for any NFTs transferred to this address (not claimed)
      // This catches NFTs received via transfer
      try {
        const transfersTo = await client.getContractEvents({
          address: contractAddress,
          abi: [
            {
              anonymous: false,
              inputs: [
                { indexed: true, name: 'from', type: 'address' },
                { indexed: true, name: 'to', type: 'address' },
                { indexed: true, name: 'tokenId', type: 'uint256' }
              ],
              name: 'Transfer',
              type: 'event'
            }
          ],
          eventName: 'Transfer',
          args: {
            to: address as `0x${string}`
          },
          fromBlock: startBlock,
          toBlock: 'latest'
        });

        console.log(`📥 Found ${transfersTo.length} Transfer events TO address`);
        transfersTo.forEach((log: any) => {
          ownedTokenIds.add(log.args.tokenId.toString());
        });
      } catch (error) {
        console.warn(`⚠️ Could not scan Transfer events (using PrizeClaimed only):`, error);
      }

    } catch (error) {
      console.error(`❌ Error scanning PrizeClaimed events:`, error);
      throw error;
    }

    console.log(`🎯 Calculated ${ownedTokenIds.size} owned tokens (balance: ${balanceNum})`);

    // Get token URIs for owned tokens in batches to avoid rate limits
    const BATCH_SIZE = 5;
    const tokenIdArray = Array.from(ownedTokenIds);
    const nfts: any[] = [];

    for (let i = 0; i < tokenIdArray.length; i += BATCH_SIZE) {
      const batch = tokenIdArray.slice(i, i + BATCH_SIZE);
      console.log(`📦 Fetching URIs for batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} tokens)`);

      const batchResults = await Promise.all(
        batch.map(async (tokenId) => {
          try {
            const uri = await client.readContract({
              address: contractAddress,
              abi: PRIZENFT_ABI,
              functionName: 'tokenURI',
              args: [BigInt(tokenId)],
            });

            // console.log(`✅ Token ID=${tokenId}, URI=${uri}`);

            return {
              tokenId: tokenId,
              tokenURI: uri
            };
          } catch (error) {
            console.error(`❌ Error fetching URI for token ${tokenId}:`, error);
            return null;
          }
        })
      );

      nfts.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < tokenIdArray.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const validNfts = nfts.filter(nft => nft !== null);
    // console.log(`✅ Found ${validNfts.length} valid NFTs with URIs`);

    const result = { balance: balanceNum, nfts: validNfts };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching owned NFTs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs' },
      { status: 500 }
    );
  }
}
