'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { TRUSTED_ISSUERS_REGISTRY_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';
import type { TrustedIssuer } from '@/app/lib/types/trusted-issuers';

export function useTrustedIssuersRegistry() {
  const { provider, wallet } = useWallet();
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
        const isTrusted = await registry.isTrustedIssuer(address);
        const claimTopics = await registry.getIssuerClaimTopics(address);
        issuers.push({
          address,
          claimTopics: claimTopics.map((t: bigint) => BigInt(t.toString())),
          isTrusted,
        });
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

  // Agregar trusted issuer (solo owner)
  const addTrustedIssuer = useCallback(
    async (issuerAddress: string, claimTopics: bigint[]) => {
      if (!wallet?.signer || !contracts.trustedIssuersRegistry) {
        throw new Error('Wallet no conectado o contrato no configurado');
      }

      try {
        setLoading(true);
        setError(null);

        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          wallet.signer
        );

        const tx = await registry.addTrustedIssuer(issuerAddress, claimTopics);
        await tx.wait();

        // Recargar lista
        await loadTrustedIssuers();

        return tx.hash;
      } catch (err: any) {
        console.error('Error adding trusted issuer:', err);
        setError(err.message || 'Error al agregar trusted issuer');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet?.signer, loadTrustedIssuers]
  );

  // Remover trusted issuer (solo owner)
  const removeTrustedIssuer = useCallback(
    async (issuerAddress: string) => {
      if (!wallet?.signer || !contracts.trustedIssuersRegistry) {
        throw new Error('Wallet no conectado o contrato no configurado');
      }

      try {
        setLoading(true);
        setError(null);

        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          wallet.signer
        );

        const tx = await registry.removeTrustedIssuer(issuerAddress);
        await tx.wait();

        // Recargar lista
        await loadTrustedIssuers();

        return tx.hash;
      } catch (err: any) {
        console.error('Error removing trusted issuer:', err);
        setError(err.message || 'Error al remover trusted issuer');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet?.signer, loadTrustedIssuers]
  );

  // Verificar si una dirección es trusted issuer
  const isTrustedIssuer = useCallback(
    async (address: string) => {
      if (!provider || !contracts.trustedIssuersRegistry) {
        return false;
      }

      try {
        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );
        return await registry.isTrustedIssuer(address);
      } catch (err: any) {
        console.error('Error checking trusted issuer:', err);
        return false;
      }
    },
    [provider]
  );

  useEffect(() => {
    loadTrustedIssuers();
  }, [loadTrustedIssuers]);

  return {
    trustedIssuers,
    loading,
    error,
    loadTrustedIssuers,
    addTrustedIssuer,
    removeTrustedIssuer,
    isTrustedIssuer,
  };
}

