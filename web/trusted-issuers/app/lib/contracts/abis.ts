/**
 * ABIs de los contratos TrustedIssuersRegistry, ClaimTopicsRegistry e Identity
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

export const TRUSTED_ISSUERS_REGISTRY_ABI = [
  // addTrustedIssuer
  {
    inputs: [
      { internalType: 'address', name: '_issuer', type: 'address' },
      { internalType: 'uint256[]', name: '_claimTopics', type: 'uint256[]' },
    ],
    name: 'addTrustedIssuer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // removeTrustedIssuer
  {
    inputs: [{ internalType: 'address', name: '_issuer', type: 'address' }],
    name: 'removeTrustedIssuer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // updateIssuerClaimTopics
  {
    inputs: [
      { internalType: 'address', name: '_issuer', type: 'address' },
      { internalType: 'uint256[]', name: '_claimTopics', type: 'uint256[]' },
    ],
    name: 'updateIssuerClaimTopics',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // isTrustedIssuer
  {
    inputs: [{ internalType: 'address', name: '_issuer', type: 'address' }],
    name: 'isTrustedIssuer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getIssuerClaimTopics
  {
    inputs: [{ internalType: 'address', name: '_issuer', type: 'address' }],
    name: 'getIssuerClaimTopics',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // hasClaimTopic
  {
    inputs: [
      { internalType: 'address', name: '_issuer', type: 'address' },
      { internalType: 'uint256', name: '_claimTopic', type: 'uint256' },
    ],
    name: 'hasClaimTopic',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getTrustedIssuers
  {
    inputs: [],
    name: 'getTrustedIssuers',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getTrustedIssuersCount
  {
    inputs: [],
    name: 'getTrustedIssuersCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // owner (from Ownable)
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'issuer', type: 'address' },
      { indexed: false, internalType: 'uint256[]', name: 'claimTopics', type: 'uint256[]' },
    ],
    name: 'TrustedIssuerAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'issuer', type: 'address' }],
    name: 'TrustedIssuerRemoved',
    type: 'event',
  },
] as const;

export const CLAIM_TOPICS_REGISTRY_ABI = [
  // addClaimTopic
  {
    inputs: [{ internalType: 'uint256', name: '_claimTopic', type: 'uint256' }],
    name: 'addClaimTopic',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // removeClaimTopic
  {
    inputs: [{ internalType: 'uint256', name: '_claimTopic', type: 'uint256' }],
    name: 'removeClaimTopic',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // getClaimTopics
  {
    inputs: [],
    name: 'getClaimTopics',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // claimTopicExists
  {
    inputs: [{ internalType: 'uint256', name: '_claimTopic', type: 'uint256' }],
    name: 'claimTopicExists',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getClaimTopicsCount
  {
    inputs: [],
    name: 'getClaimTopicsCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

