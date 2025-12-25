'use client';

import React, { useState, useEffect } from 'react';
import { useIdentity } from '@/app/hooks/useIdentity';
import type { Claim } from '@/app/lib/types/identity';

interface ClaimsListProps {
  identityAddress: string | null;
}

// Mapeo de topic IDs a nombres
const TOPIC_NAMES: Record<number, string> = {
  1: 'KYC - Know Your Customer',
  2: 'AML - Anti-Money Laundering',
  3: 'PEP - Politically Exposed Person',
  4: 'Sanctions',
  5: 'Geographic',
  6: 'Tax Compliance',
  7: 'Accredited',
  8: 'Risk Assessment',
  9: 'Source of Funds',
  10: 'Storage Verification',
};

interface ClaimWithMetadata extends Claim {
  id?: string;
  claimTxHash?: string;
  createdAt?: string;
  reviewedAt?: string;
}

export function ClaimsList({ identityAddress }: ClaimsListProps) {
  const { loading, error: identityError } = useIdentity(identityAddress);
  const [claims, setClaims] = useState<ClaimWithMetadata[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar claims desde MongoDB (solicitudes completadas)
  const loadClaims = async () => {
    if (!identityAddress) {
      setClaims([]);
      setError(null);
      return;
    }

    try {
      setLoadingClaims(true);
      setError(null);

      const response = await fetch(
        `/api/identity/claims?identityAddress=${identityAddress}`
      );

      if (!response.ok) {
        // Si es un error 503 (Service Unavailable), es un problema de conexión a la BD
        if (response.status === 503) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Error de conexión a la base de datos';
          setError(errorMessage);
          setClaims([]);
          return; // No lanzar error, solo mostrar mensaje
        }

        // Para otros errores, intentar obtener el mensaje del servidor
        let errorMessage = 'Error al cargar claims';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          // Si no se puede parsear el JSON, usar el mensaje por defecto
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        
        // Para errores 404 o similares, simplemente mostrar que no hay claims
        if (response.status === 404) {
          setClaims([]);
          setError(null);
          return;
        }
        
        // Para otros errores, mostrar el mensaje pero no lanzar excepción
        setError(errorMessage);
        setClaims([]);
        return;
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.claims)) {
        setClaims(data.claims);
        // Si no hay claims, limpiar el error
        if (data.claims.length === 0) {
          setError(null);
        }
      } else {
        setClaims([]);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error loading claims:', err);
      // Solo mostrar error si no es un error de red o conexión esperado
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        setError('Error de conexión. Por favor, verifica tu conexión a internet.');
      } else {
        setError(err.message || 'Error al cargar claims');
      }
      setClaims([]);
    } finally {
      setLoadingClaims(false);
    }
  };

  useEffect(() => {
    loadClaims();
    // Recargar cada 10 segundos para ver actualizaciones
    const interval = setInterval(loadClaims, 10000);
    return () => clearInterval(interval);
  }, [identityAddress]);

  if (!identityAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">
          No hay identidad registrada para mostrar claims.
        </p>
      </div>
    );
  }

  if (loading || loadingClaims) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Claims de Identidad
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

  if (identityError && !identityAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{identityError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Claims de Identidad
        </h3>
        <button
          onClick={loadClaims}
          disabled={loadingClaims}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
        >
          {loadingClaims ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {claims.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No hay claims registrados. Solicita un claim a un Trusted Issuer para comenzar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div
              key={claim.id || `${claim.topic}-${claim.issuer}`}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      ✅ {TOPIC_NAMES[Number(claim.topic)] || `Topic ${claim.topic}`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Scheme: {claim.scheme.toString()}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Trusted Issuer:
                      </span>{' '}
                      <span className="font-mono text-gray-900 dark:text-white text-xs">
                        {claim.issuer}
                      </span>
                    </p>
                    {claim.uri && (
                      <p>
                        <span className="font-medium text-gray-700 dark:text-gray-300">URI:</span>{' '}
                        <a
                          href={claim.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs break-all"
                        >
                          {claim.uri}
                        </a>
                      </p>
                    )}
                    {claim.claimTxHash && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        TX: <span className="font-mono">{claim.claimTxHash}</span>
                      </p>
                    )}
                    {claim.reviewedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Aprobado: {new Date(claim.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

