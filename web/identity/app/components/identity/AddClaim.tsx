'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useIdentity } from '@/app/hooks/useIdentity';
import { useWallet } from '@/app/hooks/useWallet';
import { useTrustedIssuersRegistry } from '@/app/hooks/useTrustedIssuersRegistry';

interface AddClaimProps {
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
  // Puedes agregar más schemes en el futuro
  // { value: 2, label: 'RSA' },
  // { value: 3, label: 'EdDSA' },
];

/**
 * Convierte texto a hexadecimal
 */
function textToHex(text: string): string {
  if (!text.trim()) {
    return '0x';
  }
  try {
    return ethers.toUtf8Bytes(text).length > 0 
      ? ethers.hexlify(ethers.toUtf8Bytes(text))
      : '0x';
  } catch (err) {
    console.error('Error converting text to hex:', err);
    return '0x';
  }
}

export function AddClaim({ identityAddress }: AddClaimProps) {
  const { wallet } = useWallet();
  const { addClaim, loading, error } = useIdentity(identityAddress);
  const { 
    trustedIssuers, 
    isTrustedIssuer, 
    canIssueTopic,
    loading: issuersLoading 
  } = useTrustedIssuersRegistry();
  
  const [topic, setTopic] = useState<string>('1');
  const [scheme, setScheme] = useState<string>('1');
  const [issuer, setIssuer] = useState('');
  const [signature, setSignature] = useState('');
  const [dataText, setDataText] = useState(''); // Texto simple para el usuario
  const [uri, setUri] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      if (!issuer.trim() || !ethers.isAddress(issuer.trim())) {
        setIssuerValidation({ 
          isValid: null, 
          message: '', 
          canIssueThisTopic: null 
        });
        return;
      }

      setIsValidating(true);
      try {
        const issuerAddress = issuer.trim().toLowerCase();
        const isTrusted = await isTrustedIssuer(issuerAddress);
        const topicBigInt = BigInt(topic);
        const canIssue = await canIssueTopic(issuerAddress, topicBigInt);

        if (!isTrusted) {
          setIssuerValidation({
            isValid: false,
            message: '⚠️ Este issuer no está registrado como Trusted Issuer. Solo claims de Trusted Issuers son válidos para verificación.',
            canIssueThisTopic: false,
          });
        } else if (!canIssue) {
          setIssuerValidation({
            isValid: false,
            message: `⚠️ Este Trusted Issuer no tiene permiso para emitir el topic "${TOPIC_OPTIONS.find(t => t.value === parseInt(topic))?.label || topic}".`,
            canIssueThisTopic: false,
          });
        } else {
          setIssuerValidation({
            isValid: true,
            message: '✅ Este es un Trusted Issuer válido y puede emitir este tipo de claim.',
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

    // Debounce para evitar demasiadas llamadas
    const timeoutId = setTimeout(validateIssuer, 500);
    return () => clearTimeout(timeoutId);
  }, [issuer, topic, isTrustedIssuer, canIssueTopic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identityAddress) {
      return;
    }

    // Validaciones antes de enviar
    if (!issuerValidation.isValid) {
      alert('Por favor, verifica que el issuer sea un Trusted Issuer válido antes de continuar.');
      return;
    }

    if (!issuerValidation.canIssueThisTopic) {
      alert('Este Trusted Issuer no puede emitir este tipo de claim. Por favor, selecciona otro issuer o topic.');
      return;
    }

    try {
      setIsSubmitting(true);
      setTxHash(null);

      // Convertir data de texto a hexadecimal
      const dataHex = dataText.trim() ? textToHex(dataText.trim()) : '0x';
      
      // Validar signature (debe ser hex si se proporciona)
      let signatureHex = '0x';
      if (signature.trim()) {
        if (signature.trim().startsWith('0x')) {
          signatureHex = signature.trim();
        } else {
          // Intentar convertir a hex si no tiene prefijo
          try {
            signatureHex = ethers.hexlify(ethers.toUtf8Bytes(signature.trim()));
          } catch {
            signatureHex = '0x' + signature.trim();
          }
        }
      }

      console.log('📝 Agregando claim con validación de producción:', {
        topic: parseInt(topic),
        scheme: parseInt(scheme),
        issuer: issuer.trim(),
        hasSignature: signatureHex !== '0x',
        dataLength: dataHex.length,
        uri: uri.trim() || 'none',
      });

      const hash = await addClaim(
        BigInt(topic),
        BigInt(scheme),
        issuer.trim(),
        signatureHex,
        dataHex,
        uri.trim() || ''
      );

      // Registrar transacción en MongoDB
      if (wallet?.address && hash) {
        try {
          await fetch('/api/identity/claim/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash: hash,
              fromAddress: wallet.address,
              identityAddress,
              topic,
              issuer: issuer.trim(),
            }),
          });
        } catch (apiError) {
          console.warn('No se pudo registrar en MongoDB (la transacción fue exitosa):', apiError);
        }
      }

      setTxHash(hash);
      
      // Limpiar formulario
      setTopic('1');
      setScheme('1');
      setIssuer('');
      setSignature('');
      setDataText('');
      setUri('');
      setIssuerValidation({ isValid: null, message: '', canIssueThisTopic: null });
    } catch (err: any) {
      console.error('Error adding claim:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!identityAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Agregar Claim</h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            ⚠️ No se puede agregar claims
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            El wallet está registrado, pero el contrato de identidad no está disponible. Esto puede ocurrir si:
          </p>
          <ul className="text-yellow-700 dark:text-yellow-300 text-sm mt-2 list-disc list-inside">
            <li>El contrato Identity no está desplegado correctamente</li>
            <li>La dirección del contrato Identity es inválida</li>
            <li>El contrato IdentityRegistry no puede obtener la dirección del contrato Identity</li>
          </ul>
          <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-2">
            Por favor, verifica que todos los contratos estén desplegados correctamente ejecutando: <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">./scripts/deploy-and-start.sh</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Agregar Claim</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Agrega un claim verificado a tu identidad. Solo claims de Trusted Issuers son válidos para verificación.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Topic */}
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Tipo de Claim (Topic)
          </label>
          <select
            id="topic"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              // Resetear validación cuando cambia el topic
              setIssuerValidation({ isValid: null, message: '', canIssueThisTopic: null });
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isSubmitting || loading}
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
            Esquema de Firma (Scheme)
          </label>
          <select
            id="scheme"
            value={scheme}
            onChange={(e) => setScheme(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isSubmitting || loading}
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

        {/* Issuer */}
        <div>
          <label
            htmlFor="issuer"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Dirección del Trusted Issuer <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="issuer"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required
            disabled={isSubmitting || loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Dirección del Trusted Issuer que emitió este claim. Debe estar registrado en TrustedIssuersRegistry.
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

          {/* Lista de Trusted Issuers disponibles */}
          {trustedIssuers.length > 0 && (
            <div className="mt-2">
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                  Ver Trusted Issuers disponibles ({trustedIssuers.length})
                </summary>
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded max-h-40 overflow-y-auto">
                  {trustedIssuers.map((addr) => (
                    <div
                      key={addr}
                      className="font-mono text-xs py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 rounded px-2"
                      onClick={() => setIssuer(addr)}
                    >
                      {addr}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Signature */}
        <div>
          <label
            htmlFor="signature"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Firma Criptográfica (Signature) <span className="text-gray-500 text-xs">(Opcional pero recomendado)</span>
          </label>
          <input
            type="text"
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="0x... o texto que se convertirá a hex"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            disabled={isSubmitting || loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Firma criptográfica del claim generada por el Trusted Issuer. Puede ser hexadecimal (0x...) o texto que se convertirá automáticamente.
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
            disabled={isSubmitting || loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Información adicional del claim (fechas, niveles, etc.). Se convertirá automáticamente a hexadecimal para almacenamiento en blockchain.
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
            disabled={isSubmitting || loading}
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
        {txHash && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
            <p className="font-semibold">✅ Claim agregado exitosamente:</p>
            <p className="font-mono text-xs break-all mt-1">{txHash}</p>
          </div>
        )}

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={
            isSubmitting || 
            loading || 
            !issuer.trim() || 
            !issuerValidation.isValid ||
            !issuerValidation.canIssueThisTopic ||
            isValidating
          }
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting || loading 
            ? 'Agregando claim...' 
            : !issuerValidation.isValid || !issuerValidation.canIssueThisTopic
            ? 'Verifica el Trusted Issuer antes de continuar'
            : 'Agregar Claim'
          }
        </button>
      </form>
    </div>
  );
}
