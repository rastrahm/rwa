'use client';

import React, { useState, useEffect } from 'react';
import { useTokenFactory } from '@/app/hooks/useTokenFactory';
import { useWallet } from '@/app/hooks/useWallet';
import { ERC20_ABI } from '@/app/lib/contracts/abis';
import { ethers } from 'ethers';
import type { TokenInfo } from '@/app/lib/types/token';

interface OwnedToken extends TokenInfo {
  balance: bigint;
  balanceFormatted: string;
  description?: string;
  website?: string;
}

export function MyTokens() {
  const { wallet, provider } = useWallet();
  const { tokens, loading: tokensLoading } = useTokenFactory();
  const [ownedTokens, setOwnedTokens] = useState<OwnedToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOwnedTokens = async () => {
      if (!wallet?.address || !provider) {
        setOwnedTokens([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const owned: OwnedToken[] = [];
        
        // Cargar tokens desde MongoDB para incluir todos los tokens disponibles
        let allTokens: TokenInfo[] = [...tokens];
        try {
          const response = await fetch('/api/tokens');
          if (response.ok) {
            const data = await response.json();
            const dbTokens = data.tokens || [];
            
            // Agregar tokens de MongoDB que no están en la lista de factory
            for (const dbToken of dbTokens) {
              const exists = allTokens.find(
                t => t.address.toLowerCase() === dbToken.address.toLowerCase()
              );
              if (!exists) {
                // Crear TokenInfo básico desde MongoDB
                allTokens.push({
                  address: dbToken.address,
                  name: dbToken.name || 'Unknown Token',
                  symbol: dbToken.symbol || 'UNK',
                  decimals: dbToken.decimals || 18,
                  totalSupply: BigInt(dbToken.totalSupply || 0),
                });
              }
            }
          }
        } catch (err) {
          console.warn('Error loading tokens from MongoDB:', err);
          // Continuar con los tokens del factory si MongoDB falla
        }

        // Verificar balance para cada token
        for (const token of allTokens) {
          try {
            // Primero verificar que el contrato tenga código
            const code = await provider.getCode(token.address);
            if (!code || code === '0x' || code === '0x0') {
              console.warn(`Token ${token.address} no tiene código, saltando...`);
              continue;
            }

            const tokenContract = new ethers.Contract(
              token.address,
              ERC20_ABI,
              provider
            );

            // Verificar que el contrato tenga la función balanceOf
            let balance;
            try {
              balance = await tokenContract.balanceOf(wallet.address);
            } catch (balanceError: any) {
              // Si balanceOf falla, el token podría no ser ERC20 válido
              console.warn(`Error al obtener balance de ${token.address}:`, balanceError.message);
              continue;
            }

            const balanceBigInt = BigInt(balance.toString());

            // Solo incluir tokens con balance > 0
            if (balanceBigInt > 0n) {
              // Formatear balance con decimales
              const formatted = ethers.formatUnits(balance, token.decimals);

              // Cargar metadatos desde MongoDB si están disponibles
              let description: string | undefined;
              let website: string | undefined;

              try {
                const response = await fetch('/api/tokens');
                if (response.ok) {
                  const data = await response.json();
                  const metadata = data.tokens.find(
                    (t: any) =>
                      t.address.toLowerCase() === token.address.toLowerCase()
                  );
                  if (metadata) {
                    description = metadata.description;
                    website = metadata.website;
                  }
                }
              } catch (err) {
                // Ignorar errores al cargar metadatos
                console.warn('Error loading metadata:', err);
              }

              owned.push({
                ...token,
                balance: balanceBigInt,
                balanceFormatted: formatted,
                description,
                website,
              });
            }
          } catch (err) {
            console.error(`Error checking balance for token ${token.address}:`, err);
            // Continuar con el siguiente token
          }
        }

        // Ordenar por balance (mayor a menor)
        owned.sort((a, b) => {
          if (a.balance > b.balance) return -1;
          if (a.balance < b.balance) return 1;
          return 0;
        });

        setOwnedTokens(owned);
      } catch (err: any) {
        console.error('Error loading owned tokens:', err);
        setError(err.message || 'Error al cargar tokens');
        setOwnedTokens([]);
      } finally {
        setLoading(false);
      }
    };

    if (tokensLoading) {
      return;
    }

    loadOwnedTokens();
  }, [wallet?.address, provider, tokens, tokensLoading]);

  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Mis Tokens
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para ver tus tokens.
        </p>
      </div>
    );
  }

  if (loading || tokensLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Mis Tokens
        </h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Mis Tokens
        </h3>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Mis Tokens
      </h3>

      {ownedTokens.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No tienes tokens en tu wallet. Compra tokens en el marketplace para comenzar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ownedTokens.map((token) => (
            <div
              key={token.address}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                    {token.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {token.symbol}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {parseFloat(token.balanceFormatted).toLocaleString('es-ES', {
                      maximumFractionDigits: 6,
                    })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {token.symbol}
                  </p>
                </div>
              </div>

              {token.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {token.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <p>
                    <span className="font-medium">Dirección:</span>{' '}
                    <span className="font-mono">
                      {token.address.slice(0, 10)}...{token.address.slice(-8)}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Supply Total:</span>{' '}
                    {token.totalSupply.toString()}
                  </p>
                </div>
                {token.website && (
                  <a
                    href={token.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Website →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

