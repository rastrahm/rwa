'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/app/hooks/useWallet';
import { useTrustedIssuersRegistry } from '@/app/hooks/useTrustedIssuersRegistry';
import { contracts } from '@/shared/lib/client';
import { ERC20_ABI } from '@/app/lib/contracts/abis';
import { CLAIM_TOPICS } from '@/app/lib/types/trusted-issuers';

// ABI para funciones de AccessControl y registries
const TOKEN_REGISTRY_ABI = [
  'function trustedIssuersRegistry() external view returns (address)',
  'function identityRegistry() external view returns (address)',
  'function claimTopicsRegistry() external view returns (address)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
  'function COMPLIANCE_ROLE() external view returns (bytes32)',
  'function setTrustedIssuersRegistry(address _trustedIssuersRegistry) external',
] as const;

interface TokenTrustedIssuersProps {
  tokenAddress: string;
}

export function TokenTrustedIssuers({ tokenAddress }: TokenTrustedIssuersProps) {
  const { wallet, provider } = useWallet();
  const { trustedIssuers, loading: loadingIssuers } = useTrustedIssuersRegistry();
  const [tokenRegistry, setTokenRegistry] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar el TrustedIssuersRegistry del token
  useEffect(() => {
    const loadTokenRegistry = async () => {
      if (!tokenAddress || !provider) {
        setTokenRegistry(null);
        return;
      }

      try {
        setLoading(true);
        const token = new ethers.Contract(
          tokenAddress,
          [...ERC20_ABI, ...TOKEN_REGISTRY_ABI],
          provider
        );

        const registryAddress = await token.trustedIssuersRegistry();
        setTokenRegistry(registryAddress);

        // Verificar si el usuario es admin del token
        if (wallet?.address) {
          try {
            const adminRole = await token.DEFAULT_ADMIN_ROLE();
            const hasAdminRole = await token.hasRole(adminRole, wallet.address);
            setIsAdmin(hasAdminRole);
          } catch {
            setIsAdmin(false);
          }
        }
      } catch (err: any) {
        console.error('Error loading token registry:', err);
        setError('No se pudo cargar la información del registry del token');
      } finally {
        setLoading(false);
      }
    };

    loadTokenRegistry();
  }, [tokenAddress, provider, wallet?.address]);

  const getTopicName = (topicId: bigint) => {
    const topic = CLAIM_TOPICS.find((t) => t.id === Number(topicId));
    return topic ? topic.name : `Topic ${topicId}`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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

  const isUsingGlobalRegistry = tokenRegistry?.toLowerCase() === contracts.trustedIssuersRegistry?.toLowerCase();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Trusted Issuers del Token
      </h3>

      <div className="space-y-4">
        {/* Información del Registry */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            TrustedIssuersRegistry Configurado
          </label>
          <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
            {tokenRegistry || 'No configurado'}
          </p>
          {isUsingGlobalRegistry && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              ✅ Usando el TrustedIssuersRegistry global
            </p>
          )}
        </div>

        {/* Lista de Trusted Issuers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Trusted Issuers Disponibles
            {loadingIssuers && <span className="ml-2 text-xs text-gray-500">(Cargando...)</span>}
          </label>

          {trustedIssuers.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No hay trusted issuers registrados en el TrustedIssuersRegistry.
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                Ve a "Trusted Issuers Management" para agregar trusted issuers.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {trustedIssuers.map((issuer) => (
                <div
                  key={issuer.address}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Dirección
                    </label>
                    <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                      {issuer.address}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Claim Topics Permitidos
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {issuer.claimTopics.length === 0 ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Ninguno
                        </span>
                      ) : (
                        issuer.claimTopics.map((topic) => (
                          <span
                            key={topic.toString()}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            {getTopicName(topic)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-blue-800 dark:text-blue-200 text-xs">
            <strong>ℹ️ Información:</strong> Los trusted issuers se gestionan en el TrustedIssuersRegistry global.
            Cuando creas un token, se le asigna este registry y automáticamente tiene acceso a todos los trusted issuers registrados.
            Para agregar nuevos trusted issuers, ve a "Trusted Issuers Management".
          </p>
        </div>

        {/* Opción para cambiar el registry (solo si es admin) */}
        {isAdmin && !isUsingGlobalRegistry && contracts.trustedIssuersRegistry && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-yellow-800 dark:text-yellow-200 text-xs mb-2">
              <strong>⚠️ Nota:</strong> Este token está usando un TrustedIssuersRegistry diferente al global.
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 text-xs">
              Como administrador del token, puedes cambiarlo al registry global usando la función setTrustedIssuersRegistry del contrato.
            </p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}

