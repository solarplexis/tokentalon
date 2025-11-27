import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { PRIZENFT_ABI } from '@/lib/web3/abis';
import { CONTRACTS } from '@/lib/web3/config';

// Simple cache to avoid repeated queries (in production, use Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10000; // 10 seconds

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
      return NextResponse.json(cached.data);
    }

    const client = createPublicClient({
      chain: sepolia,
      transport: http(),
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

    if (balanceNum === 0) {
      const result = { balance: 0, nfts: [] };
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    // For simplicity, use Alchemy NFT API if available
    // Otherwise, we'll need to query events or use a subgraph
    const alchemyKey = process.env.ALCHEMY_API_KEY;
    
    if (alchemyKey) {
      // Use Alchemy NFT API
      const alchemyUrl = `https://eth-sepolia.g.alchemy.com/nft/v3/${alchemyKey}/getNFTsForOwner`;
      const alchemyParams = new URLSearchParams({
        owner: address,
        'contractAddresses[]': contractAddress,
        withMetadata: 'true',
      });

      console.log('Fetching from Alchemy:', `${alchemyUrl}?${alchemyParams}`);
      const response = await fetch(`${alchemyUrl}?${alchemyParams}`);
      const data = await response.json();
      console.log('Alchemy response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('Alchemy API error:', data);
        // Fall through to event-based approach
      } else {
        const nfts = data.ownedNfts?.map((nft: any) => {
          console.log('Processing NFT:', JSON.stringify(nft, null, 2));
          
          // Alchemy NFT API v3 format
          const tokenId = nft.tokenId || nft.id?.tokenId || '';
          
          // Try multiple possible locations for tokenURI
          let tokenURI = '';
          
          // Direct tokenUri field
          if (nft.tokenUri) {
            tokenURI = nft.tokenUri.raw || nft.tokenUri.gateway || nft.tokenUri;
          }
          
          // Contract level tokenUri
          if (!tokenURI && nft.contract?.tokenUri) {
            tokenURI = nft.contract.tokenUri;
          }
          
          // Metadata field
          if (!tokenURI && nft.raw?.metadata?.tokenURI) {
            tokenURI = nft.raw.metadata.tokenURI;
          }
          
          // Try to get from contract using tokenId if we have it
          if (!tokenURI && tokenId) {
            // We'll fetch it directly from contract in this case
            console.log(`No tokenURI from Alchemy for token ${tokenId}, will fetch from contract`);
          }
          
          return {
            tokenId,
            tokenURI,
            needsContractFetch: !tokenURI
          };
        }) || [];

        // For NFTs without URI from Alchemy, fetch directly from contract
        const nftsWithUri = await Promise.all(
          nfts.map(async (nft: any) => {
            if (nft.needsContractFetch && nft.tokenId) {
              try {
                const uri = await client.readContract({
                  address: contractAddress,
                  abi: PRIZENFT_ABI,
                  functionName: 'tokenURI',
                  args: [BigInt(nft.tokenId)],
                });
                console.log(`Fetched URI from contract for token ${nft.tokenId}: ${uri}`);
                return { tokenId: nft.tokenId, tokenURI: uri };
              } catch (error) {
                console.error(`Error fetching URI for token ${nft.tokenId}:`, error);
                return nft;
              }
            }
            return nft;
          })
        );

        const validNfts = nftsWithUri.filter((nft: any) => nft.tokenURI);

        console.log(`Found ${validNfts.length} NFTs with valid URIs (${nfts.length} total from Alchemy)`);
        const result = { balance: balanceNum, nfts: validNfts };
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return NextResponse.json(result);
      }
    }

    // Fallback: Query recent PrizeMinted events
    // This works for recently minted NFTs without scanning entire history
    const currentBlock = await client.getBlockNumber();
    const BLOCKS_TO_SCAN = 10000n; // Last ~10k blocks (about 1 day on Sepolia)
    const startBlock = currentBlock > BLOCKS_TO_SCAN ? currentBlock - BLOCKS_TO_SCAN : 0n;
    
    const mintedLogs = await client.getContractEvents({
      address: contractAddress,
      abi: [
        {
          anonymous: false,
          inputs: [
            { indexed: true, name: 'tokenId', type: 'uint256' },
            { indexed: true, name: 'winner', type: 'address' },
            { indexed: true, name: 'prizeId', type: 'uint256' },
            { indexed: false, name: 'metadataURI', type: 'string' },
            { indexed: false, name: 'difficulty', type: 'uint8' }
          ],
          name: 'PrizeMinted',
          type: 'event'
        }
      ],
      eventName: 'PrizeMinted',
      args: {
        winner: address as `0x${string}`
      },
      fromBlock: startBlock,
      toBlock: 'latest'
    });

    // Get token URIs for minted tokens
    const nfts = await Promise.all(
      mintedLogs.slice(0, balanceNum).map(async (log: any) => {
        const tokenId = log.args.tokenId;
        try {
          const uri = await client.readContract({
            address: contractAddress,
            abi: PRIZENFT_ABI,
            functionName: 'tokenURI',
            args: [tokenId],
          });

          return {
            tokenId: tokenId.toString(),
            tokenURI: uri
          };
        } catch (error) {
          console.error(`Error fetching URI for token ${tokenId}:`, error);
          return null;
        }
      })
    );

    const validNfts = nfts.filter(nft => nft !== null);
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
