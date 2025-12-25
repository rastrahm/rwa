/**
 * Utilidades para acceder a las direcciones de contratos
 */

import { env } from './env';

export const contracts = {
  identityRegistry: env.IDENTITY_REGISTRY_ADDRESS,
  trustedIssuersRegistry: env.TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  claimTopicsRegistry: env.CLAIM_TOPICS_REGISTRY_ADDRESS,
  tokenCloneFactory: env.TOKEN_CLONE_FACTORY_ADDRESS,
} as const;

/**
 * Valida que las direcciones de contratos estén configuradas
 */
export function validateContracts() {
  const missing: string[] = [];

  if (!contracts.identityRegistry) {
    missing.push('IDENTITY_REGISTRY_ADDRESS');
  }
  if (!contracts.trustedIssuersRegistry) {
    missing.push('TRUSTED_ISSUERS_REGISTRY_ADDRESS');
  }
  if (!contracts.tokenCloneFactory) {
    missing.push('TOKEN_CLONE_FACTORY_ADDRESS');
  }

  if (missing.length > 0) {
    console.warn(
      `⚠️  Contract addresses not configured: ${missing.join(', ')}\n` +
      'Please update your .env.local file with the deployed contract addresses.'
    );
    return false;
  }

  return true;
}

