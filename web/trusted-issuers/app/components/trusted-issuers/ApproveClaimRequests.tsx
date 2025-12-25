'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/app/hooks/useWallet';
// useIdentity no es necesario aquí, usamos el contrato directamente
import { IDENTITY_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';

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

export function ApproveClaimRequests() {
  const { wallet, provider, signer } = useWallet();
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isTrustedIssuer, setIsTrustedIssuer] = useState<boolean | null>(null);
  const [checkingIssuer, setCheckingIssuer] = useState(false);

  // Verificar si el wallet conectado es un Trusted Issuer
  useEffect(() => {
    const checkTrustedIssuer = async () => {
      if (!wallet?.address || !provider) {
        setIsTrustedIssuer(null);
        return;
      }

      if (!contracts.trustedIssuersRegistry) {
        setIsTrustedIssuer(false);
        return;
      }

      try {
        setCheckingIssuer(true);
        const { TRUSTED_ISSUERS_REGISTRY_ABI } = await import('@/app/lib/contracts/abis');
        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        const isTrusted = await registry.isTrustedIssuer(wallet.address);
        setIsTrustedIssuer(isTrusted);
      } catch (err: any) {
        console.error('Error checking trusted issuer:', err);
        setIsTrustedIssuer(false);
      } finally {
        setCheckingIssuer(false);
      }
    };

    checkTrustedIssuer();
  }, [wallet?.address, provider]);

  // Cargar solicitudes de claims pendientes
  const loadClaimRequests = useCallback(async () => {
    if (!wallet?.address || !isTrustedIssuer) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/claims/request?issuerAddress=${wallet.address}&status=pending`
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
  }, [wallet?.address, isTrustedIssuer]);

  useEffect(() => {
    if (isTrustedIssuer === true) {
      loadClaimRequests();
      // Recargar cada 10 segundos
      const interval = setInterval(loadClaimRequests, 10000);
      return () => clearInterval(interval);
    } else {
      setClaimRequests([]);
    }
  }, [isTrustedIssuer, loadClaimRequests]);

  // Aprobar una solicitud de claim
  const approveClaimRequest = useCallback(async (claimRequest: ClaimRequest) => {
    if (!wallet?.address || !signer || !isTrustedIssuer) {
      throw new Error('Wallet no conectado o no eres un Trusted Issuer');
    }

    if (claimRequest.issuerAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error('Solo puedes aprobar solicitudes dirigidas a tu dirección de Trusted Issuer');
    }

    try {
      setProcessingId(claimRequest.id);
      setError(null);

      // Obtener el contrato Identity del solicitante y el issuer
      const identityAddress = claimRequest.identityAddress;
      const issuer = claimRequest.issuerAddress;
      const topic = BigInt(claimRequest.topic);
      
      // Verificar que el wallet conectado es el issuer (requisito del contrato)
      if (wallet.address.toLowerCase() !== issuer.toLowerCase()) {
        throw new Error(`El wallet conectado (${wallet.address}) debe ser el issuer (${issuer}) para agregar el claim`);
      }

      // Verificar que el contrato Identity existe
      const code = await provider?.getCode(identityAddress);
      if (!code || code === '0x') {
        throw new Error('El contrato Identity no existe en esta dirección');
      }

      // Instanciar el contrato Identity
      const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, provider);

      // Verificar si el wallet es el owner del contrato Identity
      const identityOwner = await identity.owner();
      const isOwner = identityOwner.toLowerCase() === wallet.address.toLowerCase();

      // Si no es el owner, verificar que el TrustedIssuersRegistry esté configurado
      if (!isOwner) {
        let trustedIssuersRegistryAddress: string | null = null;
        try {
          trustedIssuersRegistryAddress = await identity.trustedIssuersRegistry();
          
          if (!trustedIssuersRegistryAddress || trustedIssuersRegistryAddress === ethers.ZeroAddress) {
            throw new Error(
              `El contrato Identity no tiene configurado el TrustedIssuersRegistry. ` +
              `El owner del contrato (${identityOwner}) debe configurarlo usando setTrustedIssuersRegistry().`
            );
          }

          // Verificar que el issuer está registrado como Trusted Issuer
          const { TRUSTED_ISSUERS_REGISTRY_ABI } = await import('@/app/lib/contracts/abis');
          const trustedIssuersRegistry = new ethers.Contract(
            trustedIssuersRegistryAddress,
            TRUSTED_ISSUERS_REGISTRY_ABI,
            provider
          );

          const isTrusted = await trustedIssuersRegistry.isTrustedIssuer(issuer);
          if (!isTrusted) {
            throw new Error(
              `El issuer ${issuer} no está registrado como Trusted Issuer en el TrustedIssuersRegistry. ` +
              `Debe ser agregado primero usando addTrustedIssuer().`
            );
          }

          // Verificar que el issuer tiene permiso para emitir este topic
          const hasTopic = await trustedIssuersRegistry.hasClaimTopic(issuer, topic);
          if (!hasTopic) {
            throw new Error(
              `El Trusted Issuer ${issuer} no tiene permiso para emitir el topic ${topic}. ` +
              `Debe ser agregado usando updateIssuerClaimTopics() o addTrustedIssuer().`
            );
          }

          console.log('✅ Validaciones pasadas:', {
            isOwner,
            trustedIssuersRegistry: trustedIssuersRegistryAddress,
            isTrusted,
            hasTopic,
          });
        } catch (checkError: any) {
          // Si el error es de validación, lanzarlo
          if (checkError.message?.includes('no tiene permiso') || 
              checkError.message?.includes('no está registrado') ||
              checkError.message?.includes('no tiene configurado')) {
            throw checkError;
          }
          // Si es otro error, lanzarlo también para que el usuario sepa qué pasó
          throw new Error(`Error al verificar permisos: ${checkError.message}`);
        }
      } else {
        console.log('✅ El wallet es el owner del contrato Identity, no se requiere TrustedIssuersRegistry');
      }

      // Preparar los datos del claim
      const scheme = BigInt(claimRequest.scheme);
      const signature = claimRequest.signature || '0x';
      const data = claimRequest.dataHex || (claimRequest.dataText ? ethers.toUtf8Bytes(claimRequest.dataText) : '0x');
      const dataHex = typeof data === 'string' ? data : ethers.hexlify(data);
      const uri = claimRequest.uri || '';

      // Instanciar el contrato Identity con el signer para la transacción
      const identityWithSigner = new ethers.Contract(identityAddress, IDENTITY_ABI, signer);

      // Intentar usar addClaimByIssuer primero, si falla usar addClaim como fallback
      let tx;
      try {
        // Llamar a addClaimByIssuer en el contrato Identity
        // La función addClaimByIssuer requiere que msg.sender sea el issuer o el owner
        console.log('🔄 Intentando usar addClaimByIssuer...');
        tx = await identityWithSigner.addClaimByIssuer(
          topic,
          scheme,
          issuer,
          signature,
          dataHex,
          uri
        );
      } catch (addClaimByIssuerError: any) {
        // Si addClaimByIssuer no existe o falla, usar addClaim (solo owner)
        if (addClaimByIssuerError.message?.includes('no matching fragment') || 
            addClaimByIssuerError.message?.includes('execution reverted')) {
          console.log('⚠️ addClaimByIssuer no disponible o falló, usando addClaim como fallback...');
          
          // Verificar que el wallet es el owner antes de usar addClaim
          const identityOwner = await identity.owner();
          if (identityOwner.toLowerCase() !== wallet.address.toLowerCase()) {
            throw new Error(
              `No se puede agregar el claim: el wallet conectado no es el owner del contrato Identity. ` +
              `Owner: ${identityOwner}, Wallet: ${wallet.address}. ` +
              `El contrato Identity necesita tener la función addClaimByIssuer o el wallet debe ser el owner.`
            );
          }
          
          // Usar addClaim como fallback (solo funciona si es owner)
          console.log('✅ Usando addClaim (wallet es owner)...');
          tx = await identityWithSigner.addClaim(
            topic,
            scheme,
            issuer,
            signature,
            dataHex,
            uri
          );
        } else {
          throw addClaimByIssuerError;
        }
      }
      
      await tx.wait();

      // Actualizar el estado de la solicitud en MongoDB
      // Usar 'completed' porque el claim ya fue agregado exitosamente al contrato
      const updateResponse = await fetch('/api/identity/claim/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimRequestId: claimRequest.id,
          issuerAddress: wallet.address,
          txHash: tx.hash,
          status: 'completed', // 'completed' porque el claim ya fue agregado al contrato
        }),
      });

      if (!updateResponse.ok) {
        console.error('Error updating claim request status:', await updateResponse.text());
        // No lanzar error aquí, el claim ya fue agregado al contrato
      }

      // Recargar solicitudes
      await loadClaimRequests();
    } catch (err: any) {
      console.error('Error approving claim request:', err);
      setError(err.message || 'Error al aprobar solicitud de claim');
      throw err;
    } finally {
      setProcessingId(null);
    }
  }, [wallet?.address, signer, isTrustedIssuer, provider, loadClaimRequests]);

  // Rechazar una solicitud de claim
  const rejectClaimRequest = useCallback(async (claimRequest: ClaimRequest, reason: string) => {
    if (!wallet?.address || !isTrustedIssuer) {
      throw new Error('Wallet no conectado o no eres un Trusted Issuer');
    }

    if (claimRequest.issuerAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error('Solo puedes rechazar solicitudes dirigidas a tu dirección de Trusted Issuer');
    }

    try {
      setProcessingId(claimRequest.id);
      setError(null);

      const response = await fetch('/api/identity/claim/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimRequestId: claimRequest.id,
          issuerAddress: wallet.address,
          rejectionReason: reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al rechazar solicitud');
      }

      // Recargar solicitudes
      await loadClaimRequests();
    } catch (err: any) {
      console.error('Error rejecting claim request:', err);
      setError(err.message || 'Error al rechazar solicitud de claim');
      throw err;
    } finally {
      setProcessingId(null);
    }
  }, [wallet?.address, isTrustedIssuer, loadClaimRequests]);

  if (checkingIssuer) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Aprobar Solicitudes de Claims
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para ver las solicitudes de claims pendientes.
        </p>
      </div>
    );
  }

  if (isTrustedIssuer === false) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Aprobar Solicitudes de Claims
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            ⚠️ No eres un Trusted Issuer
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            Solo los Trusted Issuers registrados pueden aprobar solicitudes de claims.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Aprobar Solicitudes de Claims
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Revisa y aprueba las solicitudes de claims pendientes dirigidas a tu dirección de Trusted Issuer.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading && claimRequests.length === 0 ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : claimRequests.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200">
            No hay solicitudes de claims pendientes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {claimRequests.map((request) => (
            <ClaimRequestCard
              key={request.id}
              request={request}
              onApprove={approveClaimRequest}
              onReject={rejectClaimRequest}
              processing={processingId === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ClaimRequestCardProps {
  request: ClaimRequest;
  onApprove: (request: ClaimRequest) => Promise<void>;
  onReject: (request: ClaimRequest, reason: string) => Promise<void>;
  processing: boolean;
}

function ClaimRequestCard({ request, onApprove, onReject, processing }: ClaimRequestCardProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await onApprove(request);
    } catch (err) {
      // El error ya se maneja en el componente padre
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return;
    }

    try {
      setIsRejecting(true);
      await onReject(request, rejectionReason.trim());
      setShowRejectForm(false);
      setRejectionReason('');
    } catch (err) {
      // El error ya se maneja en el componente padre
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {TOPIC_OPTIONS[request.topic] || `Topic ${request.topic}`}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Solicitante: <span className="font-mono text-xs">{request.requesterAddress}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Identity: <span className="font-mono text-xs">{request.identityAddress}</span>
          </p>
        </div>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Pendiente
        </span>
      </div>

      {request.dataText && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Datos:</strong> {request.dataText}
          </p>
        </div>
      )}

      {request.uri && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>URI:</strong>{' '}
            <a href={request.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
              {request.uri}
            </a>
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleApprove}
          disabled={processing || isApproving || isRejecting}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isApproving ? 'Aprobando...' : 'Aprobar'}
        </button>
        <button
          onClick={() => setShowRejectForm(!showRejectForm)}
          disabled={processing || isApproving || isRejecting}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          Rechazar
        </button>
      </div>

      {showRejectForm && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Razón del rechazo:
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explica por qué se rechaza esta solicitud..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isRejecting || isApproving}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isRejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setRejectionReason('');
              }}
              disabled={isRejecting || isApproving}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

