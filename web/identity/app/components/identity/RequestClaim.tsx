'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/app/hooks/useWallet';
import { useTrustedIssuersRegistry } from '@/app/hooks/useTrustedIssuersRegistry';
import { useIdentityRegistry } from '@/app/hooks/useIdentityRegistry';

interface RequestClaimProps {
  identityAddress: string | null;
}

// Mapeo de topic IDs a nombres
const TOPIC_OPTIONS = [
  { value: 1, label: 'KYC - Know Your Customer' },
  { value: 2, label: 'AML - Anti-Money Laundering' },
  { value: 3, label: 'PEP - Politically Exposed Person' },
  { value: 4, label: 'Sanctions' },
  { value: 5, label: 'Geographic' },
  { value: 6, label: 'Tax Compliance' },
  { value: 7, label: 'Accredited' },
  { value: 8, label: 'Risk Assessment' },
  { value: 9, label: 'Source of Funds' },
  { value: 10, label: 'Storage Verification' },
];

// Mapeo de scheme IDs a nombres
const SCHEME_OPTIONS = [
  { value: 1, label: 'ECDSA - Elliptic Curve Digital Signature Algorithm' },
];

export function RequestClaim({ identityAddress: propIdentityAddress }: RequestClaimProps) {
  const { wallet } = useWallet();
  const { identityAddress: registeredIdentityAddress, isRegistered, loading: registryLoading, checkRegistration } = useIdentityRegistry();
  const { 
    trustedIssuers, 
    canIssueTopic,
    loading: issuersLoading 
  } = useTrustedIssuersRegistry();
  
  // Usar el identityAddress del prop si está disponible, sino usar el del registry
  const identityAddress = propIdentityAddress || registeredIdentityAddress;

  // Debug: Log del estado de registro
  useEffect(() => {
    console.log('🔍 RequestClaim - Estado de registro:', {
      isRegistered,
      identityAddress,
      registeredIdentityAddress,
      propIdentityAddress,
      walletAddress: wallet?.address,
      registryLoading,
    });
  }, [isRegistered, identityAddress, registeredIdentityAddress, propIdentityAddress, wallet?.address, registryLoading]);

  // Forzar verificación del registro cuando cambia el wallet o cuando isRegistered es null/false
  useEffect(() => {
    if (wallet?.address && checkRegistration && (isRegistered === null || isRegistered === false)) {
      // Esperar un poco para que el registro se complete si acaba de ocurrir
      const timeoutId = setTimeout(() => {
        console.log('🔄 Forzando verificación del registro...');
        checkRegistration();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [wallet?.address, checkRegistration, isRegistered]);

  // Verificar periódicamente el estado del registro si no está registrado
  useEffect(() => {
    if (!wallet?.address || !checkRegistration || isRegistered === true) {
      return;
    }

    // Verificar cada 5 segundos si no está registrado
    const intervalId = setInterval(() => {
      console.log('🔄 Verificación periódica del estado de registro...');
      checkRegistration();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [wallet?.address, checkRegistration, isRegistered]);
  
  const [topic, setTopic] = useState<string>('1');
  const [scheme, setScheme] = useState<string>('1');
  const [selectedIssuer, setSelectedIssuer] = useState<string>('');
  const [signature, setSignature] = useState('');
  const [dataText, setDataText] = useState('');
  const [uri, setUri] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para validación
  const [issuerValidation, setIssuerValidation] = useState<{
    isValid: boolean | null;
    message: string;
    canIssueThisTopic: boolean | null;
  }>({ isValid: null, message: '', canIssueThisTopic: null });
  const [isValidating, setIsValidating] = useState(false);

  // Validar issuer cuando cambia
  useEffect(() => {
    const validateIssuer = async () => {
      if (!selectedIssuer || !ethers.isAddress(selectedIssuer)) {
        setIssuerValidation({ 
          isValid: null, 
          message: '', 
          canIssueThisTopic: null 
        });
        return;
      }

      setIsValidating(true);
      try {
        const issuerAddress = selectedIssuer.toLowerCase();
        const topicBigInt = BigInt(topic);
        const canIssue = await canIssueTopic(issuerAddress, topicBigInt);

        if (!canIssue) {
          setIssuerValidation({
            isValid: false,
            message: `⚠️ Este Trusted Issuer no tiene permiso para emitir el topic "${TOPIC_OPTIONS.find(t => t.value === parseInt(topic))?.label || topic}".`,
            canIssueThisTopic: false,
          });
        } else {
          setIssuerValidation({
            isValid: true,
            message: '✅ Este Trusted Issuer puede emitir este tipo de claim.',
            canIssueThisTopic: true,
          });
        }
      } catch (err: any) {
        console.error('Error validating issuer:', err);
        setIssuerValidation({
          isValid: null,
          message: 'Error al validar el issuer. Verifica la conexión.',
          canIssueThisTopic: null,
        });
      } finally {
        setIsValidating(false);
      }
    };

    const timeoutId = setTimeout(validateIssuer, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedIssuer, topic, canIssueTopic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet?.address) {
      setError('Wallet no conectado');
      return;
    }

    // Usar identityAddress si está disponible, sino usar wallet.address como fallback
    const effectiveIdentityAddress = identityAddress || wallet.address;

    // Validaciones antes de enviar
    if (!issuerValidation.isValid || !issuerValidation.canIssueThisTopic) {
      setError('Por favor, verifica que el Trusted Issuer seleccionado pueda emitir este tipo de claim.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      // Usar identityAddress si está disponible, sino usar wallet.address como fallback
      const effectiveIdentityAddress = identityAddress || wallet.address;

      console.log('📝 Creando solicitud de claim:', {
        requesterAddress: wallet.address,
        identityAddress: effectiveIdentityAddress,
        topic: parseInt(topic),
        scheme: parseInt(scheme),
        issuerAddress: selectedIssuer,
      });

      // Crear solicitud de claim
      const response = await fetch('/api/identity/claim/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterAddress: wallet.address,
          identityAddress: effectiveIdentityAddress,
          topic: parseInt(topic),
          scheme: parseInt(scheme),
          issuerAddress: selectedIssuer,
          signature: signature.trim() || undefined,
          dataText: dataText.trim() || undefined,
          uri: uri.trim() || undefined,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Error al crear solicitud de claim';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        } catch (parseError) {
          // Si no se puede parsear el JSON, usar el status text
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      setSuccess(`Solicitud de claim creada exitosamente. ID: ${data.claimRequest.id}. El Trusted Issuer revisará tu solicitud.`);
      
      // Disparar evento personalizado para notificar que se creó una nueva solicitud
      // Esto permitirá que ClaimRequestsList se recargue inmediatamente
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('claimRequestCreated', {
          detail: { claimRequestId: data.claimRequest.id }
        }));
      }
      
      // Limpiar formulario
      setTopic('1');
      setScheme('1');
      setSelectedIssuer('');
      setSignature('');
      setDataText('');
      setUri('');
      setIssuerValidation({ isValid: null, message: '', canIssueThisTopic: null });
    } catch (err: any) {
      console.error('Error requesting claim:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      setError(err.message || 'Error al crear solicitud de claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si no hay wallet conectado
  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Solicitar Claim</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para solicitar un claim.
        </p>
      </div>
    );
  }

  // Si está cargando el estado de registro, mostrar mensaje de carga
  if (registryLoading && isRegistered === null) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Solicitar Claim</h3>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">
            🔍 Verificando estado de registro...
          </p>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Por favor espera mientras verificamos si tu wallet está registrado.
          </p>
        </div>
      </div>
    );
  }

  // Si el wallet no está registrado (isRegistered puede ser null, false, o true)
  // Solo mostrar el mensaje si isRegistered es explícitamente false (verificado y no registrado)
  // O si no está cargando y es null (ya se verificó pero no está registrado)
  if (isRegistered === false || (!registryLoading && isRegistered === null && wallet?.address)) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Solicitar Claim</h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            ⚠️ Primero debes registrar tu identidad
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
            Para solicitar claims, primero necesitas registrar tu identidad en el IdentityRegistry.
          </p>
          {checkRegistration && (
            <button
              onClick={() => checkRegistration()}
              className="text-sm text-yellow-800 dark:text-yellow-200 underline hover:no-underline"
            >
              🔄 Reintentar verificación
            </button>
          )}
        </div>
      </div>
    );
  }

  // Si llegamos aquí, el wallet está conectado y registrado
  // Usar identityAddress si está disponible, sino usar wallet.address como fallback
  const effectiveIdentityAddress = identityAddress || wallet.address;
  
  // Mostrar advertencia si no hay identityAddress pero permitir solicitar
  const showIdentityWarning = !identityAddress && isRegistered;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Solicitar Claim</h3>
      
      {/* Mostrar advertencia si no hay identityAddress pero el wallet está registrado */}
      {showIdentityWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            ⚠️ Advertencia: Contrato Identity no disponible
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            Tu wallet está registrado, pero el contrato de identidad no está disponible temporalmente. 
            La solicitud se creará usando tu dirección de wallet como referencia. 
            Asegúrate de tener un contrato Identity válido desplegado.
          </p>
        </div>
      )}
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Solicita un claim verificado a un Trusted Issuer. El Trusted Issuer revisará tu solicitud y, si es aprobada, agregará el claim a tu identidad.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Topic */}
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Tipo de Claim (Topic) <span className="text-red-500">*</span>
          </label>
          <select
            id="topic"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setIssuerValidation({ isValid: null, message: '', canIssueThisTopic: null });
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isSubmitting || issuersLoading}
          >
            {TOPIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Scheme */}
        <div>
          <label
            htmlFor="scheme"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Esquema de Firma (Scheme) <span className="text-red-500">*</span>
          </label>
          <select
            id="scheme"
            value={scheme}
            onChange={(e) => setScheme(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isSubmitting || issuersLoading}
          >
            {SCHEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Algoritmo criptográfico usado para firmar el claim.
          </p>
        </div>

        {/* Trusted Issuer - SELECT */}
        <div>
          <label
            htmlFor="issuer"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Trusted Issuer <span className="text-red-500">*</span>
          </label>
          {issuersLoading ? (
            <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              Cargando Trusted Issuers...
            </div>
          ) : trustedIssuers.length === 0 ? (
            <div className="w-full px-4 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm">
              ⚠️ No hay Trusted Issuers registrados. Contacta al administrador para agregar Trusted Issuers.
            </div>
          ) : (
            <>
              <select
                id="issuer"
                value={selectedIssuer}
                onChange={(e) => setSelectedIssuer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                required
                disabled={isSubmitting || issuersLoading}
              >
                <option value="">Selecciona un Trusted Issuer...</option>
                {trustedIssuers.map((addr) => (
                  <option key={addr} value={addr}>
                    {addr}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Selecciona el Trusted Issuer que revisará y aprobará tu solicitud de claim.
              </p>
              
              {/* Validación del issuer */}
              {isValidating && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-blue-700 dark:text-blue-300 text-xs">
                  🔍 Validando issuer...
                </div>
              )}
              
              {!isValidating && issuerValidation.message && (
                <div
                  className={`mt-2 p-2 rounded text-xs ${
                    issuerValidation.isValid
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  }`}
                >
                  {issuerValidation.message}
                </div>
              )}
            </>
          )}
        </div>

        {/* Signature */}
        <div>
          <label
            htmlFor="signature"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Firma Criptográfica (Signature) <span className="text-gray-500 text-xs">(Opcional)</span>
          </label>
          <input
            type="text"
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="0x... o texto que se convertirá a hex"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Firma criptográfica del claim (si ya la tienes). Si no, el Trusted Issuer la generará al aprobar.
          </p>
        </div>

        {/* Data - Texto simple */}
        <div>
          <label
            htmlFor="data"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Datos Adicionales (Data) <span className="text-gray-500 text-xs">(Opcional)</span>
          </label>
          <textarea
            id="data"
            value={dataText}
            onChange={(e) => setDataText(e.target.value)}
            placeholder="Ingresa información adicional del claim en texto simple..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Información adicional del claim (fechas, niveles, etc.). Se convertirá automáticamente a hexadecimal.
          </p>
        </div>

        {/* URI */}
        <div>
          <label
            htmlFor="uri"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            URI de Documentación <span className="text-gray-500 text-xs">(Opcional)</span>
          </label>
          <input
            type="url"
            id="uri"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="https://ejemplo.com/documentacion-claim"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            URL con documentación adicional sobre este claim (certificados, documentos, etc.).
          </p>
        </div>

        {/* Errores */}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Éxito */}
        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
            <p className="font-semibold">✅ {success}</p>
            <p className="text-xs mt-1">
              Puedes ver el estado de tus solicitudes en la sección de "Mis Solicitudes de Claims".
            </p>
          </div>
        )}

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={
            isSubmitting || 
            !selectedIssuer || 
            !issuerValidation.isValid ||
            !issuerValidation.canIssueThisTopic ||
            isValidating ||
            issuersLoading ||
            trustedIssuers.length === 0
          }
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting 
            ? 'Enviando solicitud...' 
            : !selectedIssuer
            ? 'Selecciona un Trusted Issuer'
            : !issuerValidation.isValid || !issuerValidation.canIssueThisTopic
            ? 'Verifica el Trusted Issuer antes de continuar'
            : 'Solicitar Claim'
          }
        </button>
      </form>
    </div>
  );
}

