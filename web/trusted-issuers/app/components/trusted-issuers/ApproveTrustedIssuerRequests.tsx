'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/app/hooks/useWallet';
import { useTrustedIssuersRegistry } from '@/app/hooks/useTrustedIssuersRegistry';
import { TRUSTED_ISSUERS_REGISTRY_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';
import { CLAIM_TOPICS } from '@/app/lib/types/trusted-issuers';

interface TrustedIssuerRequest {
  _id: string;
  requesterAddress: string;
  organizationName: string;
  description?: string;
  contactEmail?: string;
  website?: string;
  claimTopics: number[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  attachments?: any[];
}

export function ApproveTrustedIssuerRequests() {
  const { wallet, provider } = useWallet();
  const { addTrustedIssuer, loading } = useTrustedIssuersRegistry();
  const [requests, setRequests] = useState<TrustedIssuerRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [checkingOwner, setCheckingOwner] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Verificar si el wallet conectado es el owner del contrato
  useEffect(() => {
    const checkOwner = async () => {
      if (!wallet?.address || !provider) {
        setIsOwner(null);
        return;
      }

      if (!contracts.trustedIssuersRegistry) {
        console.warn('TrustedIssuersRegistry address not configured');
        setIsOwner(false);
        return;
      }

      try {
        setCheckingOwner(true);
        setError(null);
        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        const owner = await registry.owner();
        const isOwnerAddress = owner.toLowerCase() === wallet.address.toLowerCase();
        console.log('🔍 Verificando owner:', {
          contractOwner: owner,
          walletAddress: wallet.address,
          isOwner: isOwnerAddress,
        });
        setIsOwner(isOwnerAddress);
      } catch (err: any) {
        console.error('❌ Error checking owner:', err);
        setIsOwner(false);
        // No establecer error aquí, solo si no es owner
      } finally {
        setCheckingOwner(false);
      }
    };

    checkOwner();
  }, [wallet?.address, provider, contracts.trustedIssuersRegistry]);

  // Cargar solicitudes pendientes
  const loadRequests = React.useCallback(async () => {
    try {
      setLoadingRequests(true);
      setError(null);
      console.log('📋 Cargando solicitudes de Trusted Issuer...');
      const response = await fetch('/api/trusted-issuers/request?status=pending');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al cargar solicitudes');
      }

      const data = await response.json();
      console.log('✅ Solicitudes cargadas:', data.requests?.length || 0, data.requests);
      setRequests(data.requests || []);
    } catch (err: any) {
      console.error('❌ Error loading requests:', err);
      setError(err.message || 'Error al cargar solicitudes');
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner === true) {
      loadRequests();
      // Recargar cada 10 segundos
      const interval = setInterval(loadRequests, 10000);
      return () => clearInterval(interval);
    } else {
      // Limpiar solicitudes si no es owner
      setRequests([]);
      setError(null);
    }
  }, [isOwner, loadRequests]);

  const handleApprove = async (request: TrustedIssuerRequest) => {
    if (!wallet?.signer) {
      setError('Wallet no conectado');
      return;
    }

    try {
      setProcessingId(request._id);
      setError(null);

      // Agregar el Trusted Issuer al contrato
      const txHash = await addTrustedIssuer(
        request.requesterAddress,
        request.claimTopics.map((t) => BigInt(t))
      );

      // Actualizar la solicitud en MongoDB
      const response = await fetch('/api/trusted-issuers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request._id,
          txHash,
          issuerContractAddress: request.requesterAddress,
          reviewerAddress: wallet.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al aprobar solicitud');
      }

      // Recargar solicitudes
      await loadRequests();
    } catch (err: any) {
      console.error('Error approving request:', err);
      setError(err.message || 'Error al aprobar solicitud');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: TrustedIssuerRequest, reason: string) => {
    if (!wallet?.address) {
      setError('Wallet no conectado');
      return;
    }

    try {
      setProcessingId(request._id);
      setError(null);

      const response = await fetch('/api/trusted-issuers/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request._id,
          reviewerAddress: wallet.address,
          rejectionReason: reason || 'Rechazado por el administrador',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al rechazar solicitud');
      }

      // Recargar solicitudes
      await loadRequests();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      setError(err.message || 'Error al rechazar solicitud');
    } finally {
      setProcessingId(null);
    }
  };

  const getTopicName = (topicId: number) => {
    const topic = CLAIM_TOPICS.find((t) => t.id === topicId);
    return topic ? topic.name : `Topic ${topicId}`;
  };

  // No renderizar nada si no hay wallet o si no es owner
  if (!wallet?.address) {
    return null; // No mostrar nada si no hay wallet conectado
  }

  if (checkingOwner) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (isOwner === false || isOwner === null) {
    return null; // No mostrar nada si no es owner o aún no se ha verificado
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Aprobar Solicitudes de Trusted Issuers
        </h3>
        <button
          onClick={loadRequests}
          disabled={loadingRequests}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
        >
          {loadingRequests ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loadingRequests ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No hay solicitudes pendientes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request._id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {request.organizationName}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {request.requesterAddress}
                </p>
              </div>

              {request.description && (
                <div className="mb-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {request.description}
                  </p>
                </div>
              )}

              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Claim Topics Solicitados:
                </p>
                <div className="flex flex-wrap gap-2">
                  {request.claimTopics.map((topicId) => (
                    <span
                      key={topicId}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      {getTopicName(topicId)}
                    </span>
                  ))}
                </div>
              </div>

              {(request.contactEmail || request.website) && (
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                  {request.contactEmail && <p>Email: {request.contactEmail}</p>}
                  {request.website && <p>Website: {request.website}</p>}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleApprove(request)}
                  disabled={processingId === request._id || loading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {processingId === request._id ? 'Procesando...' : 'Aprobar'}
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Razón del rechazo (opcional):');
                    if (reason !== null) {
                      handleReject(request, reason);
                    }
                  }}
                  disabled={processingId === request._id}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Rechazar
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Creado: {new Date(request.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

