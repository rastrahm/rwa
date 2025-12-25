/**
 * Tipos TypeScript para Identity y IdentityRegistry
 */

export interface Claim {
  topic: bigint;
  scheme: bigint;
  issuer: string;
  signature: string;
  data: string;
  uri: string;
}

export interface IdentityInfo {
  address: string;
  owner: string;
  isRegistered: boolean;
}

export interface IdentityWithClaims extends IdentityInfo {
  claims: Claim[];
}

export interface RegisterIdentityParams {
  walletAddress: string;
  identityAddress: string;
}

export interface AddClaimParams {
  identityAddress: string;
  topic: bigint;
  scheme: bigint;
  issuer: string;
  signature: string;
  data: string;
  uri: string;
}

export interface RemoveClaimParams {
  identityAddress: string;
  topic: bigint;
  issuer: string;
}

