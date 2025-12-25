/**
 * ABIs de los contratos TokenCloneFactory y TokenCloneable (ERC20 básico)
 */

export const TOKEN_CLONE_FACTORY_ABI = [
  // createToken
  {
    inputs: [
      { internalType: 'string', name: 'name_', type: 'string' },
      { internalType: 'string', name: 'symbol_', type: 'string' },
      { internalType: 'address', name: 'admin', type: 'address' },
      { internalType: 'address', name: '_identityRegistry', type: 'address' },
      { internalType: 'address', name: '_trustedIssuersRegistry', type: 'address' },
      { internalType: 'address', name: '_claimTopicsRegistry', type: 'address' },
    ],
    name: 'createToken',
    outputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // getTotalTokens
  {
    inputs: [],
    name: 'getTotalTokens',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getToken
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'getToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getAllTokens
  {
    inputs: [],
    name: 'getAllTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // isToken
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'isToken',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // implementation
  {
    inputs: [],
    name: 'implementation',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'token', type: 'address' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'string', name: 'symbol', type: 'string' },
      { indexed: true, internalType: 'address', name: 'admin', type: 'address' },
    ],
    name: 'TokenCreated',
    type: 'event',
  },
] as const;

// ABI básico de ERC20 para interactuar con los tokens creados
export const ERC20_ABI = [
  // name
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // symbol
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // decimals
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  // totalSupply
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // balanceOf
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // transfer
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

