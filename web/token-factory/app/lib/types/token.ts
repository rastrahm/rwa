/**
 * Tipos TypeScript para TokenCloneFactory y TokenCloneable
 */

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  admin: string;
  isPaused: boolean;
}

export interface CreateTokenParams {
  name: string;
  symbol: string;
  admin: string;
  identityRegistry: string;
  trustedIssuersRegistry: string;
  claimTopicsRegistry: string;
}

export interface TokenMetadata {
  tokenAddress: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  website?: string;
  requiredClaimTopics?: number[];
  price?: string; // Precio en ETH o stablecoin
  availableSupply?: bigint;
  totalSupply?: bigint;
}

