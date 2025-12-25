'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { contracts } from '@/shared/lib/client';

// ABI del TrustedIssuersRegistry
const TRUSTED_ISSUERS_REGISTRY_ABI = [
  // isTrustedIssuer
  {
    inputs: [{ internalType: 'address', name: '_issuer', type: 'address' }],
    name: 'isTrustedIssuer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
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
  // getIssuerClaimTopics
  {
    inputs: [{ internalType: 'address', name: '_issuer', type: 'address' }],
    name: 'getIssuerClaimTopics',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
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
] as const;

export function useTrustedIssuersRegistry() {
  const { provider } = useWallet();
  const [trustedIssuers, setTrustedIssuers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar lista de Trusted Issuers
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

      const issuers = await registry.getTrustedIssuers();
      setTrustedIssuers(issuers.map((addr: string) => addr.toLowerCase()));
    } catch (err: any) {
      console.error('Error loading trusted issuers:', err);
      setError(err.message || 'Error al cargar Trusted Issuers');
      setTrustedIssuers([]);
    } finally {
      setLoading(false);
    }
  }, [provider, contracts.trustedIssuersRegistry]);

  // Verificar si un issuer es confiable
  const isTrustedIssuer = useCallback(
    async (issuerAddress: string): Promise<boolean> => {
      if (!provider || !contracts.trustedIssuersRegistry || !issuerAddress) {
        return false;
      }

      try {
        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        const isTrusted = await registry.isTrustedIssuer(issuerAddress);
        return isTrusted;
      } catch (err: any) {
        console.error('Error checking trusted issuer:', err);
        return false;
      }
    },
    [provider, contracts.trustedIssuersRegistry]
  );

  // Verificar si un issuer puede emitir un topic específico
  const canIssueTopic = useCallback(
    async (issuerAddress: string, topic: bigint): Promise<boolean> => {
      if (!provider || !contracts.trustedIssuersRegistry || !issuerAddress) {
        return false;
      }

      try {
        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        const canIssue = await registry.hasClaimTopic(issuerAddress, topic);
        return canIssue;
      } catch (err: any) {
        console.error('Error checking claim topic:', err);
        return false;
      }
    },
    [provider, contracts.trustedIssuersRegistry]
  );

  // Obtener topics que un issuer puede emitir
  const getIssuerTopics = useCallback(
    async (issuerAddress: string): Promise<bigint[]> => {
      if (!provider || !contracts.trustedIssuersRegistry || !issuerAddress) {
        return [];
      }

      try {
        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        const topics = await registry.getIssuerClaimTopics(issuerAddress);
        return topics.map((t: bigint) => BigInt(t.toString()));
      } catch (err: any) {
        console.error('Error getting issuer topics:', err);
        return [];
      }
    },
    [provider, contracts.trustedIssuersRegistry]
  );

  useEffect(() => {
    loadTrustedIssuers();
  }, [loadTrustedIssuers]);

  return {
    trustedIssuers,
    loading,
    error,
    loadTrustedIssuers,
    isTrustedIssuer,
    canIssueTopic,
    getIssuerTopics,
  };
}

