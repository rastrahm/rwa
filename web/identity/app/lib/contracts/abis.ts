/**
 * ABIs de los contratos Identity y IdentityRegistry
 */

export const IDENTITY_ABI = [
  // addClaim
  {
    inputs: [
      { internalType: 'uint256', name: '_topic', type: 'uint256' },
      { internalType: 'uint256', name: '_scheme', type: 'uint256' },
      { internalType: 'address', name: '_issuer', type: 'address' },
      { internalType: 'bytes', name: '_signature', type: 'bytes' },
      { internalType: 'bytes', name: '_data', type: 'bytes' },
      { internalType: 'string', name: '_uri', type: 'string' },
    ],
    name: 'addClaim',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // removeClaim
  {
    inputs: [
      { internalType: 'uint256', name: '_topic', type: 'uint256' },
      { internalType: 'address', name: '_issuer', type: 'address' },
    ],
    name: 'removeClaim',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // getClaim
  {
    inputs: [
      { internalType: 'uint256', name: '_topic', type: 'uint256' },
      { internalType: 'address', name: '_issuer', type: 'address' },
    ],
    name: 'getClaim',
    outputs: [
      { internalType: 'uint256', name: 'topic', type: 'uint256' },
      { internalType: 'uint256', name: 'scheme', type: 'uint256' },
      { internalType: 'address', name: 'issuer', type: 'address' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
      { internalType: 'string', name: 'uri', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // claimExists
  {
    inputs: [
      { internalType: 'uint256', name: '_topic', type: 'uint256' },
      { internalType: 'address', name: '_issuer', type: 'address' },
    ],
    name: 'claimExists',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // owner
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // addClaimByIssuer
  {
    inputs: [
      { internalType: 'uint256', name: '_topic', type: 'uint256' },
      { internalType: 'uint256', name: '_scheme', type: 'uint256' },
      { internalType: 'address', name: '_issuer', type: 'address' },
      { internalType: 'bytes', name: '_signature', type: 'bytes' },
      { internalType: 'bytes', name: '_data', type: 'bytes' },
      { internalType: 'string', name: '_uri', type: 'string' },
    ],
    name: 'addClaimByIssuer',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // setTrustedIssuersRegistry
  {
    inputs: [{ internalType: 'address', name: '_trustedIssuersRegistry', type: 'address' }],
    name: 'setTrustedIssuersRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // trustedIssuersRegistry
  {
    inputs: [],
    name: 'trustedIssuersRegistry',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'topic', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'scheme', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'issuer', type: 'address' },
      { indexed: false, internalType: 'bytes', name: 'signature', type: 'bytes' },
      { indexed: false, internalType: 'bytes', name: 'data', type: 'bytes' },
      { indexed: false, internalType: 'string', name: 'uri', type: 'string' },
    ],
    name: 'ClaimAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'topic', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'issuer', type: 'address' },
    ],
    name: 'ClaimRemoved',
    type: 'event',
  },
] as const;

export const IDENTITY_REGISTRY_ABI = [
  // registerIdentity
  {
    inputs: [
      { internalType: 'address', name: '_wallet', type: 'address' },
      { internalType: 'address', name: '_identity', type: 'address' },
    ],
    name: 'registerIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // registerSelf
  {
    inputs: [{ internalType: 'address', name: '_identity', type: 'address' }],
    name: 'registerSelf',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // updateIdentity
  {
    inputs: [
      { internalType: 'address', name: '_wallet', type: 'address' },
      { internalType: 'address', name: '_identity', type: 'address' },
    ],
    name: 'updateIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // removeIdentity
  {
    inputs: [{ internalType: 'address', name: '_wallet', type: 'address' }],
    name: 'removeIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // getIdentity
  {
    inputs: [{ internalType: 'address', name: '_wallet', type: 'address' }],
    name: 'getIdentity',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // isRegistered
  {
    inputs: [{ internalType: 'address', name: '_wallet', type: 'address' }],
    name: 'isRegistered',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getRegisteredCount
  {
    inputs: [],
    name: 'getRegisteredCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getRegisteredAddress
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'getRegisteredAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'wallet', type: 'address' },
      { indexed: true, internalType: 'address', name: 'identity', type: 'address' },
    ],
    name: 'IdentityRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'wallet', type: 'address' },
      { indexed: true, internalType: 'address', name: 'identity', type: 'address' },
    ],
    name: 'IdentityRemoved',
    type: 'event',
  },
] as const;

