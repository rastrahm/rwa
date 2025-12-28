'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { contracts } from '@/shared/lib/client';

// ABI del TrustedIssuersRegistry
const TRUSTED_ISSUERS_REGISTRY_ABI = [
  'function getTrustedIssuers() external view returns (address[])',
  'function isTrustedIssuer(address _issuer) external view returns (bool)',
  'function getIssuerClaimTopics(address _issuer) external view returns (uint256[])',
] as const;

export interface TrustedIssuer {
  address: string;
  claimTopics: bigint[];
  isTrusted: boolean;
}

export function useTrustedIssuersRegistry() {
  const { provider } = useWallet();
  const [trustedIssuers, setTrustedIssuers] = useState<TrustedIssuer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar todos los trusted issuers
  const loadTrustedIssuers = useCallback(async () => {
    if (!provider || !contracts.trustedIssuersRegistry) {
      setTrustedIssuers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const registry = new ethers.Contract(
        contracts.trustedIssuersRegistry,
        TRUSTED_ISSUERS_REGISTRY_ABI,
        provider
      );

      const addresses = await registry.getTrustedIssuers();
      const issuers: TrustedIssuer[] = [];

      for (const address of addresses) {
        try {
          const isTrusted = await registry.isTrustedIssuer(address);
          const claimTopics = await registry.getIssuerClaimTopics(address);
          issuers.push({
            address,
            claimTopics: claimTopics.map((t: bigint) => BigInt(t.toString())),
            isTrusted,
          });
        } catch (err) {
          console.warn(`Error loading issuer ${address}:`, err);
        }
      }

      setTrustedIssuers(issuers);
    } catch (err: any) {
      console.error('Error loading trusted issuers:', err);
      setError(err.message || 'Error al cargar trusted issuers');
      setTrustedIssuers([]);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    loadTrustedIssuers();
  }, [loadTrustedIssuers]);

  return {
    trustedIssuers,
    loading,
    error,
    loadTrustedIssuers,
  };
}

