'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { TOKEN_CLONE_FACTORY_ABI, ERC20_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';
import type { TokenInfo } from '@/app/lib/types/token';

export function useTokenFactory() {
  const { provider, wallet } = useWallet();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar todos los tokens creados
  const loadTokens = useCallback(async () => {
    if (!provider || !contracts.tokenCloneFactory) {
      setTokens([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const factory = new ethers.Contract(
        contracts.tokenCloneFactory,
        TOKEN_CLONE_FACTORY_ABI,
        provider
      );

      const tokenAddresses = await factory.getAllTokens();
      const tokenInfos: TokenInfo[] = [];

      for (const address of tokenAddresses) {
        try {
          const token = new ethers.Contract(address, ERC20_ABI, provider);
          const [name, symbol, decimals, totalSupply] = await Promise.all([
            token.name(),
            token.symbol(),
            token.decimals(),
            token.totalSupply(),
          ]);

          tokenInfos.push({
            address,
            name,
            symbol,
            decimals: Number(decimals),
            totalSupply: BigInt(totalSupply.toString()),
            admin: '', // Se puede obtener de eventos si es necesario
            isPaused: false, // Se puede verificar si el token tiene función paused()
          });
        } catch (err) {
          console.error(`Error loading token ${address}:`, err);
          // Continuar con el siguiente token
        }
      }

      setTokens(tokenInfos);
    } catch (err: any) {
      console.error('Error loading tokens:', err);
      setError(err.message || 'Error al cargar tokens');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  // Crear un nuevo token
  const createToken = useCallback(
    async (
      name: string,
      symbol: string,
      admin: string,
      identityRegistry: string,
      trustedIssuersRegistry: string,
      claimTopicsRegistry: string
    ) => {
      if (!wallet?.signer || !contracts.tokenCloneFactory) {
        throw new Error('Wallet no conectado o contrato no configurado');
      }

      try {
        setLoading(true);
        setError(null);

        const factory = new ethers.Contract(
          contracts.tokenCloneFactory,
          TOKEN_CLONE_FACTORY_ABI,
          wallet.signer
        );

        const tx = await factory.createToken(
          name,
          symbol,
          admin,
          identityRegistry,
          trustedIssuersRegistry,
          claimTopicsRegistry
        );

        const receipt = await tx.wait();

        // Obtener la dirección del token del evento
        const tokenCreatedEvent = receipt.logs.find(
          (log: any) =>
            log.topics[0] ===
            ethers.id('TokenCreated(address,string,string,address)')
        );

        let tokenAddress: string | null = null;
        if (tokenCreatedEvent) {
          const decoded = factory.interface.parseLog(tokenCreatedEvent);
          tokenAddress = decoded?.args[0];
        }

        // Recargar lista de tokens
        await loadTokens();

        return { txHash: tx.hash, tokenAddress };
      } catch (err: any) {
        console.error('Error creating token:', err);
        setError(err.message || 'Error al crear token');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet?.signer, loadTokens]
  );

  // Obtener información de un token específico
  const getTokenInfo = useCallback(
    async (tokenAddress: string): Promise<TokenInfo | null> => {
      if (!provider) {
        return null;
      }

      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [name, symbol, decimals, totalSupply] = await Promise.all([
          token.name(),
          token.symbol(),
          token.decimals(),
          token.totalSupply(),
        ]);

        return {
          address: tokenAddress,
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: BigInt(totalSupply.toString()),
          admin: '',
          isPaused: false,
        };
      } catch (err: any) {
        console.error('Error getting token info:', err);
        return null;
      }
    },
    [provider]
  );

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  return {
    tokens,
    loading,
    error,
    loadTokens,
    createToken,
    getTokenInfo,
  };
}

