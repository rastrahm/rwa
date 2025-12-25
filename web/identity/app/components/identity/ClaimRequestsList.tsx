'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/app/hooks/useWallet';

interface ClaimRequestsListProps {
  identityAddress: string | null;
}

interface ClaimRequest {
  id: string;
  requesterAddress: string;
  identityAddress: string;
  topic: number;
  scheme: number;
  issuerAddress: string;
  signature?: string;
  dataText?: string;
  dataHex?: string;
  uri?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  claimTxHash?: string;
  rejectionReason?: string;
  issuerNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

// Mapeo de topic IDs a nombres
const TOPIC_OPTIONS: Record<number, string> = {
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

export function ClaimRequestsList({ identityAddress }: ClaimRequestsListProps) {
  const { wallet } = useWallet();
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClaimRequests = useCallback(async () => {
    if (!wallet?.address) {
      setClaimRequests([]);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/identity/claim/request?requesterAddress=${wallet.address}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al cargar solicitudes de claims');
      }

      const data = await response.json();
      setClaimRequests(data.claimRequests || []);
    } catch (err: any) {
      console.error('Error loading claim requests:', err);
      setError(err.message || 'Error al cargar solicitudes de claims');
      setClaimRequests([]);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  useEffect(() => {
    if (!wallet?.address) {
      return;
    }

    loadClaimRequests();
    
    // Recargar cada 10 segundos para ver actualizaciones
    const interval = setInterval(loadClaimRequests, 10000);
    
    // Escuchar evento personalizado cuando se crea una nueva solicitud
    const handleClaimRequestCreated = () => {
      console.log('🔄 Nueva solicitud de claim detectada, recargando lista...');
      // Esperar un poco para que la base de datos se actualice
      setTimeout(() => {
        loadClaimRequests();
      }, 500);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('claimRequestCreated', handleClaimRequestCreated);
    }
    
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('claimRequestCreated', handleClaimRequestCreated);
      }
    };
  }, [wallet?.address, loadClaimRequests]);

  if (!wallet?.address) {
    return null;
  }

  if (loading && claimRequests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Mis Solicitudes de Claims
        </h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (claimRequests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Mis Solicitudes de Claims
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          No tienes solicitudes de claims pendientes.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Mis Solicitudes de Claims
        </h3>
        <button
          onClick={loadClaimRequests}
          disabled={loading}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {claimRequests.map((request) => (
          <div
            key={request.id}
            className={`p-4 rounded-lg border ${
              request.status === 'completed'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : request.status === 'rejected'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : request.status === 'approved'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {TOPIC_OPTIONS[request.topic] || `Topic ${request.topic}`}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  Issuer: {request.issuerAddress}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  request.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                    : request.status === 'rejected'
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                    : request.status === 'approved'
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                    : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                }`}
              >
                {request.status === 'completed'
                  ? '✅ Completado'
                  : request.status === 'rejected'
                  ? '❌ Rechazado'
                  : request.status === 'approved'
                  ? '✓ Aprobado'
                  : '⏳ Pendiente'}
              </span>
            </div>

            {request.status === 'completed' && request.claimTxHash && (
              <div className="mt-2 text-xs">
                <p className="text-green-700 dark:text-green-300">
                  Claim agregado exitosamente
                </p>
                <p className="font-mono text-green-600 dark:text-green-400 break-all">
                  TX: {request.claimTxHash}
                </p>
              </div>
            )}

            {request.status === 'rejected' && request.rejectionReason && (
              <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                <p className="font-semibold">Razón de rechazo:</p>
                <p>{request.rejectionReason}</p>
              </div>
            )}

            {request.issuerNotes && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                <p className="font-semibold">Notas del Issuer:</p>
                <p>{request.issuerNotes}</p>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Creado: {new Date(request.createdAt).toLocaleString()}
              {request.reviewedAt &&
                ` • Revisado: ${new Date(request.reviewedAt).toLocaleString()}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

