'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/app/hooks/useWallet';
import { useTrustedIssuersRegistry } from '@/app/hooks/useTrustedIssuersRegistry';
import { CLAIM_TOPICS } from '@/app/lib/types/trusted-issuers';
import { TRUSTED_ISSUERS_REGISTRY_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';

export function AddTrustedIssuer() {
  const { wallet, provider } = useWallet();
  const { addTrustedIssuer, updateIssuerClaimTopics, loadTrustedIssuers, loading, error } = useTrustedIssuersRegistry();
  const [issuerAddress, setIssuerAddress] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [checkingOwner, setCheckingOwner] = useState(false);
  const [existingIssuer, setExistingIssuer] = useState<{ address: string; topics: number[] } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Verificar si el wallet conectado es el owner del contrato
  useEffect(() => {
    const checkOwner = async () => {
      if (!wallet?.address || !provider || !contracts.trustedIssuersRegistry) {
        setIsOwner(null);
        return;
      }

      try {
        setCheckingOwner(true);
        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        const owner = await registry.owner();
        setIsOwner(owner.toLowerCase() === wallet.address.toLowerCase());
      } catch (err: any) {
        console.error('Error checking owner:', err);
        setIsOwner(false);
      } finally {
        setCheckingOwner(false);
      }
    };

    checkOwner();
  }, [wallet?.address, provider, contracts.trustedIssuersRegistry]);

  // Verificar si el issuer ya existe cuando cambia la dirección
  useEffect(() => {
    const checkExistingIssuer = async () => {
      if (!issuerAddress.trim() || !ethers.isAddress(issuerAddress.trim()) || !provider || !contracts.trustedIssuersRegistry) {
        setExistingIssuer(null);
        return;
      }

      try {
        setCheckingExisting(true);
        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        const isTrusted = await registry.isTrustedIssuer(issuerAddress.trim());
        if (isTrusted) {
          const topics = await registry.getIssuerClaimTopics(issuerAddress.trim());
          setExistingIssuer({
            address: issuerAddress.trim(),
            topics: topics.map((t: bigint) => Number(t)),
          });
        } else {
          setExistingIssuer(null);
        }
      } catch (err: any) {
        console.error('Error checking existing issuer:', err);
        setExistingIssuer(null);
      } finally {
        setCheckingExisting(false);
      }
    };

    // Debounce para no hacer demasiadas llamadas
    const timeoutId = setTimeout(checkExistingIssuer, 500);
    return () => clearTimeout(timeoutId);
  }, [issuerAddress, provider, contracts.trustedIssuersRegistry]);

  const handleTopicToggle = (topicId: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet?.address) {
      setSubmitError('Conecta tu wallet para continuar');
      return;
    }

    if (!issuerAddress.trim() || !ethers.isAddress(issuerAddress.trim())) {
      setSubmitError('Dirección del issuer inválida');
      return;
    }

    if (selectedTopics.length === 0) {
      setSubmitError('Selecciona al menos un claim topic');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSuccess(null);

      let txHash: string;
      
      // Si el issuer ya existe, actualizar sus topics en lugar de agregarlo
      if (existingIssuer) {
        console.log('📝 Issuer ya existe, actualizando topics...', {
          existing: existingIssuer.topics,
          nuevos: selectedTopics,
        });
        txHash = await updateIssuerClaimTopics(
          issuerAddress.trim(),
          selectedTopics.map((t) => BigInt(t))
        );
        setSuccess(`Topics del Trusted Issuer actualizados exitosamente. TX: ${txHash}`);
      } else {
        txHash = await addTrustedIssuer(
          issuerAddress.trim(),
          selectedTopics.map((t) => BigInt(t))
        );
        setSuccess(`Trusted Issuer agregado exitosamente. TX: ${txHash}`);
      }
      
      // El contexto ya recarga automáticamente la lista después de addTrustedIssuer o updateIssuerClaimTopics
      // No es necesario llamar loadTrustedIssuers manualmente
      
      // Limpiar formulario
      setIssuerAddress('');
      setSelectedTopics([]);
      setExistingIssuer(null);
    } catch (err: any) {
      console.error('Error adding/updating trusted issuer:', err);
      let errorMessage = err.message || 'Error al agregar/actualizar trusted issuer';
      
      // Si el error es "Issuer already trusted", sugerir usar updateIssuerClaimTopics
      if (errorMessage.includes('Issuer already trusted') || errorMessage.includes('already trusted')) {
        errorMessage = `El issuer ${issuerAddress.trim()} ya está registrado como Trusted Issuer. ` +
          `Si quieres actualizar sus topics, el sistema debería detectarlo automáticamente. ` +
          `Si el problema persiste, verifica que el issuer esté en la lista de Trusted Issuers.`;
      }
      
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (isOwner === false) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Agregar Trusted Issuer
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            ⚠️ No tienes permisos
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            Solo el owner del contrato TrustedIssuersRegistry puede agregar Trusted Issuers.
            Tu wallet: <span className="font-mono text-xs">{wallet?.address}</span>
          </p>
        </div>
      </div>
    );
  }

  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para agregar Trusted Issuers.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Agregar Trusted Issuer
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Como owner del contrato, puedes agregar Trusted Issuers directamente.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="issuerAddress"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Dirección del Trusted Issuer <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="issuerAddress"
            value={issuerAddress}
            onChange={(e) => setIssuerAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required
            disabled={isSubmitting || loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Dirección del wallet que será registrado como Trusted Issuer.
          </p>
          {checkingExisting && (
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              🔍 Verificando si el issuer ya existe...
            </p>
          )}
          {existingIssuer && !checkingExisting && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                ℹ️ Este issuer ya está registrado como Trusted Issuer
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Topics actuales: {existingIssuer.topics.length > 0 
                  ? existingIssuer.topics.join(', ') 
                  : 'Ninguno'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Al enviar, se actualizarán sus topics en lugar de crear uno nuevo.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Claim Topics que puede emitir <span className="text-red-500">*</span>
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {CLAIM_TOPICS.map((topic) => (
                <label
                  key={topic.id}
                  className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(topic.id)}
                    onChange={() => handleTopicToggle(topic.id)}
                    className="mt-1"
                    disabled={isSubmitting || loading}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {topic.name} (ID: {topic.id})
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {topic.description} - {topic.commonUse}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {selectedTopics.length === 0 && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Selecciona al menos un claim topic
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {submitError && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {submitError}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
            <p className="font-semibold">✅ {success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            isSubmitting ||
            loading ||
            !issuerAddress.trim() ||
            selectedTopics.length === 0 ||
            !ethers.isAddress(issuerAddress.trim()) ||
            checkingExisting
          }
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {checkingExisting 
            ? 'Verificando...' 
            : isSubmitting || loading 
              ? (existingIssuer ? 'Actualizando...' : 'Agregando...') 
              : existingIssuer 
                ? 'Actualizar Topics del Trusted Issuer' 
                : 'Agregar Trusted Issuer'}
        </button>
      </form>
    </div>
  );
}

