'use client';

import React, { useState, useEffect } from 'react';
import { useTokenFactory } from '@/app/hooks/useTokenFactory';
import { useWallet } from '@/app/hooks/useWallet';
import { ERC20_ABI } from '@/app/lib/contracts/abis';
import { ethers } from 'ethers';
import type { TokenInfo } from '@/app/lib/types/token';

// ABI para funciones de AccessControl
const ACCESS_CONTROL_ABI = [
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
  'function getRoleMember(bytes32 role, uint256 index) external view returns (address)',
  'function getRoleMemberCount(bytes32 role) external view returns (uint256)',
];

interface TokenWithMetadata extends TokenInfo {
  description?: string;
  website?: string;
  attachments?: any[];
  admin?: string;
}

export function TokenList() {
  const { tokens, loading, error } = useTokenFactory();
  const { provider } = useWallet();
  const [tokensWithMetadata, setTokensWithMetadata] = useState<TokenWithMetadata[]>([]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        // Cargar metadatos desde MongoDB
        const response = await fetch('/api/tokens');
        const metadataMap = new Map();
        
        if (response.ok) {
          const data = await response.json();
          data.tokens.forEach((t: any) => {
            metadataMap.set(t.address.toLowerCase(), t);
          });
        }

        // Enriquecer tokens con metadatos y admin
        const enriched = await Promise.all(
          tokens.map(async (token) => {
            const metadata = metadataMap.get(token.address.toLowerCase());
            let admin: string | undefined;

            // Intentar obtener el admin del token
            if (provider) {
              try {
                const code = await provider.getCode(token.address);
                if (code && code !== '0x' && code !== '0x0') {
                  const tokenContract = new ethers.Contract(
                    token.address,
                    [...ERC20_ABI, ...ACCESS_CONTROL_ABI],
                    provider
                  );

                  try {
                    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
                    const adminRole = await tokenContract.DEFAULT_ADMIN_ROLE().catch(() => DEFAULT_ADMIN_ROLE);
                    const adminCount = await tokenContract.getRoleMemberCount(adminRole).catch(() => 0);
                    
                    if (adminCount > 0) {
                      admin = await tokenContract.getRoleMember(adminRole, 0).catch(() => undefined);
                    }
                  } catch (err) {
                    // Si falla, no mostrar admin
                    console.warn(`Error getting admin for ${token.address}:`, err);
                  }
                }
              } catch (err) {
                // Ignorar errores al obtener admin
                console.warn(`Error checking code for ${token.address}:`, err);
              }
            }

            return {
              ...token,
              description: metadata?.description,
              website: metadata?.website,
              attachments: metadata?.attachments || [],
              admin,
            };
          })
        );

        setTokensWithMetadata(enriched);
      } catch (err) {
        console.error('Error loading metadata:', err);
        setTokensWithMetadata(tokens);
      }
    };

    if (tokens.length > 0) {
      loadMetadata();
    } else {
      setTokensWithMetadata([]);
    }
  }, [tokens, provider]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Tokens Disponibles
      </h3>

      {tokensWithMetadata.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No hay tokens creados aún. Crea el primer token para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tokensWithMetadata.map((token) => (
            <div
              key={token.address}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {token.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {token.symbol}
                  </p>
                </div>
                {token.isPaused && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Pausado
                  </span>
                )}
              </div>

              {token.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {token.description}
                </p>
              )}

              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <p>
                  <span className="font-medium">Supply:</span>{' '}
                  {token.totalSupply.toString()}
                </p>
                {token.admin && (
                  <p>
                    <span className="font-medium">Administrador:</span>{' '}
                    <span className="font-mono">
                      {token.admin.slice(0, 10)}...{token.admin.slice(-8)}
                    </span>
                  </p>
                )}
                <p className="font-mono break-all">
                  {token.address.slice(0, 10)}...{token.address.slice(-8)}
                </p>
              </div>

              {token.website && (
                <a
                  href={token.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Ver website →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

