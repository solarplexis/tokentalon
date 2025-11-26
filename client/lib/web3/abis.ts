/**
 * Contract ABIs for frontend interaction
 * These are minimal ABIs containing only the functions needed by the frontend
 */

export const GAMETOKEN_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const PRIZENFT_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const CLAWMACHINE_ABI = [
  {
    inputs: [],
    name: 'costPerPlay',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'startGame',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'sessionId', type: 'uint256' },
      { internalType: 'uint8', name: 'prizeId', type: 'uint8' },
      { internalType: 'string', name: 'replayDataCID', type: 'string' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'claimPrize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'sessionId', type: 'uint256' }],
    name: 'getGameSession',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'player', type: 'address' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
          { internalType: 'bool', name: 'prizeClaimed', type: 'bool' },
        ],
        internalType: 'struct ClawMachine.GameSession',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getPlayerStats',
    outputs: [
      { internalType: 'uint256', name: 'gamesPlayed', type: 'uint256' },
      { internalType: 'uint256', name: 'prizesWon', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'sessionId', type: 'uint256' },
    ],
    name: 'GameStarted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'sessionId', type: 'uint256' },
      { indexed: false, internalType: 'uint8', name: 'prizeId', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'PrizeClaimed',
    type: 'event',
  },
] as const;
