'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { CLAIM_TOPICS_REGISTRY_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';

export function useClaimTopicsRegistry() {
  const { provider, wallet } = useWallet();
  const [claimTopics, setClaimTopics] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar claim topics
  const loadClaimTopics = useCallback(async () => {
    if (!provider || !contracts.claimTopicsRegistry) {
      setClaimTopics([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const registry = new ethers.Contract(
        contracts.claimTopicsRegistry,
        CLAIM_TOPICS_REGISTRY_ABI,
        provider
      );

      const topics = await registry.getClaimTopics();
      setClaimTopics(topics.map((t: bigint) => BigInt(t.toString())));
    } catch (err: any) {
      console.error('Error loading claim topics:', err);
      setError(err.message || 'Error al cargar claim topics');
      setClaimTopics([]);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  // Agregar claim topic (solo owner)
  const addClaimTopic = useCallback(
    async (topic: bigint) => {
      if (!wallet?.signer || !contracts.claimTopicsRegistry) {
        throw new Error('Wallet no conectado o contrato no configurado');
      }

      try {
        setLoading(true);
        setError(null);

        const registry = new ethers.Contract(
          contracts.claimTopicsRegistry,
          CLAIM_TOPICS_REGISTRY_ABI,
          wallet.signer
        );

        const tx = await registry.addClaimTopic(topic);
        await tx.wait();

        // Recargar lista
        await loadClaimTopics();

        return tx.hash;
      } catch (err: any) {
        console.error('Error adding claim topic:', err);
        setError(err.message || 'Error al agregar claim topic');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet?.signer, loadClaimTopics]
  );

  // Verificar si un topic existe
  const topicExists = useCallback(
    async (topic: bigint) => {
      if (!provider || !contracts.claimTopicsRegistry) {
        return false;
      }

      try {
        const registry = new ethers.Contract(
          contracts.claimTopicsRegistry,
          CLAIM_TOPICS_REGISTRY_ABI,
          provider
        );
        return await registry.claimTopicExists(topic);
      } catch (err: any) {
        console.error('Error checking claim topic:', err);
        return false;
      }
    },
    [provider]
  );

  useEffect(() => {
    loadClaimTopics();
  }, [loadClaimTopics]);

  return {
    claimTopics,
    loading,
    error,
    loadClaimTopics,
    addClaimTopic,
    topicExists,
  };
}

