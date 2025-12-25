'use client';

import React, { useState, useEffect } from 'react';
import { useTokenFactory } from '@/app/hooks/useTokenFactory';
import type { TokenInfo } from '@/app/lib/types/token';

interface TokenWithMetadata extends TokenInfo {
  description?: string;
  website?: string;
  attachments?: any[];
}

export function TokenList() {
  const { tokens, loading, error } = useTokenFactory();
  const [tokensWithMetadata, setTokensWithMetadata] = useState<TokenWithMetadata[]>([]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch('/api/tokens');
        if (response.ok) {
          const data = await response.json();
          const metadataMap = new Map(
            data.tokens.map((t: any) => [t.address.toLowerCase(), t])
          );

          const enriched = tokens.map((token) => {
            const metadata = metadataMap.get(token.address.toLowerCase());
            return {
              ...token,
              description: metadata?.description,
              website: metadata?.website,
              attachments: metadata?.attachments || [],
            };
          });

          setTokensWithMetadata(enriched);
        } else {
          setTokensWithMetadata(tokens);
        }
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
  }, [tokens]);

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

