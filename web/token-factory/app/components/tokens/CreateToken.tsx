'use client';

import React, { useState } from 'react';
import { useTokenFactory } from '@/app/hooks/useTokenFactory';
import { useWallet } from '@/app/hooks/useWallet';
import { contracts } from '@/shared/lib/client';
import { CLAIM_TOPICS } from '@/app/lib/types/trusted-issuers';

export function CreateToken() {
  const { wallet } = useWallet();
  const { createToken, loading, error } = useTokenFactory();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [maxSupply, setMaxSupply] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [requiredClaimTopics, setRequiredClaimTopics] = useState<number[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet?.address) {
      return;
    }

    if (!name.trim() || !symbol.trim()) {
      return;
    }

    // Validar que los contratos estén configurados
    if (
      !contracts.identityRegistry ||
      !contracts.trustedIssuersRegistry
    ) {
      alert('Los contratos no están configurados. Verifica las variables de entorno.');
      return;
    }

    // Si claimTopicsRegistry no está configurado, usar trustedIssuersRegistry como fallback
    const claimTopicsRegistry = contracts.claimTopicsRegistry || contracts.trustedIssuersRegistry;

    try {
      setIsSubmitting(true);
      setTxHash(null);
      setTokenAddress(null);

      const result = await createToken(
        name.trim(),
        symbol.trim(),
        wallet.address, // Admin es el creador
        contracts.identityRegistry,
        contracts.trustedIssuersRegistry,
        claimTopicsRegistry
      );

      // Registrar en MongoDB
      if (result.txHash && result.tokenAddress) {
        try {
          const formData = new FormData();
          formData.append(
            'data',
            JSON.stringify({
              txHash: result.txHash,
              fromAddress: wallet.address,
              tokenAddress: result.tokenAddress,
              name: name.trim(),
              symbol: symbol.trim(),
              maxSupply: maxSupply.trim() ? maxSupply.trim() : undefined,
              price: price.trim() ? price.trim() : undefined,
              description: description.trim() || undefined,
              website: website.trim() || undefined,
              requiredClaimTopics: requiredClaimTopics.length > 0 ? requiredClaimTopics : undefined,
            })
          );

          files.forEach((file) => {
            formData.append('files', file);
          });

          const response = await fetch('/api/tokens/create', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
            console.error('Error al registrar token en MongoDB:', errorData);
            // No lanzar error aquí, solo loguear, porque el token ya fue creado
          } else {
            console.log('✅ Token registrado en MongoDB exitosamente');
          }
        } catch (mongoError: any) {
          console.error('Error al registrar token en MongoDB:', mongoError);
          // No lanzar error aquí, solo loguear, porque el token ya fue creado
        }
      }

      setTxHash(result.txHash);
      setTokenAddress(result.tokenAddress || null);

      // Limpiar formulario
      setName('');
      setSymbol('');
      setMaxSupply('');
      setPrice('');
      setDescription('');
      setWebsite('');
      setRequiredClaimTopics([]);
      setFiles([]);
    } catch (err: any) {
      console.error('Error creating token:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para crear un token.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Crear Nuevo Token
      </h3>

      {/* Información sobre Claim Topics Requeridos */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
        <p className="text-blue-800 dark:text-blue-200 text-xs">
          <strong>ℹ️ Sobre Claim Topics Requeridos:</strong> Puedes especificar qué claim topics son necesarios{' '}
          para que los usuarios puedan adquirir este token. Los usuarios deben tener claims válidos de{' '}
          <strong>trusted issuers</strong> para los topics seleccionados. Si no seleccionas ningún topic,{' '}
          cualquier usuario verificado podrá adquirir el token.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Nombre del Token *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi Token RWA"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isSubmitting || loading}
            />
          </div>

          <div>
            <label
              htmlFor="symbol"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Símbolo *
            </label>
            <input
              type="text"
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="RWA"
              maxLength={10}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isSubmitting || loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="maxSupply"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Cantidad Máxima de Tokens
            </label>
            <input
              type="number"
              id="maxSupply"
              value={maxSupply}
              onChange={(e) => setMaxSupply(e.target.value)}
              placeholder="1000000"
              min="0"
              step="1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting || loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Cantidad total de tokens que se pueden emitir
            </p>
          </div>

          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Precio del Token (ETH)
            </label>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.01"
              min="0"
              step="0.0001"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting || loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Precio por token en ETH
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Descripción
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Descripción del token y su propósito..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isSubmitting || loading}
          />
        </div>

        <div>
          <label
            htmlFor="website"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Website
          </label>
          <input
            type="url"
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting || loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Claim Topics Requeridos (opcional)
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Selecciona los claim topics que los usuarios deben tener para poder adquirir este token.
            Si no seleccionas ninguno, cualquier usuario verificado podrá adquirir el token.
          </p>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {CLAIM_TOPICS.map((topic) => (
                <label
                  key={topic.id}
                  className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={requiredClaimTopics.includes(topic.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRequiredClaimTopics([...requiredClaimTopics, topic.id]);
                      } else {
                        setRequiredClaimTopics(requiredClaimTopics.filter((id) => id !== topic.id));
                      }
                    }}
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
          {requiredClaimTopics.length > 0 && (
            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              {requiredClaimTopics.length} claim topic(s) seleccionado(s): {requiredClaimTopics.join(', ')}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="files"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Archivos Adjuntos (opcional)
          </label>
          <input
            type="file"
            id="files"
            multiple
            onChange={handleFileChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting || loading}
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Puedes adjuntar documentación, whitepaper, o información adicional sobre el token.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {txHash && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
            <p className="font-semibold">Token creado exitosamente:</p>
            {tokenAddress && (
              <p className="font-mono text-xs break-all mt-1">
                Dirección: {tokenAddress}
              </p>
            )}
            <p className="font-mono text-xs break-all mt-1">
              TX: {txHash}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || loading || !name.trim() || !symbol.trim()}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting || loading ? 'Creando Token...' : 'Crear Token'}
        </button>
      </form>
    </div>
  );
}

