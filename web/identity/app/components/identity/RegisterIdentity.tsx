'use client';

import React, { useState } from 'react';
import { useIdentityRegistry } from '@/app/hooks/useIdentityRegistry';
import { useWallet } from '@/app/hooks/useWallet';

export function RegisterIdentity() {
  const { wallet } = useWallet();
  const { 
    registerIdentity, 
    deployAndRegister,
    loading, 
    error, 
    isRegistered, 
    identityAddress: registeredIdentityAddress 
  } = useIdentityRegistry();
  const [identityAddress, setIdentityAddress] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identityAddress.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setTxHash(null);

      const hash = await registerIdentity(identityAddress.trim());

      // Registrar transacción en MongoDB
      if (wallet?.address && hash) {
        try {
          const response = await fetch('/api/identity/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash: hash,
              fromAddress: wallet.address,
              identityAddress: identityAddress.trim(),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.warn('No se pudo registrar en MongoDB:', errorData);
            // La transacción en blockchain fue exitosa, solo falló el registro en DB
          }
        } catch (apiError) {
          console.warn('Error al registrar en MongoDB (la transacción en blockchain fue exitosa):', apiError);
          // La transacción en blockchain fue exitosa, solo falló el registro en DB
        }
      }

      setTxHash(hash);
      setIdentityAddress('');
    } catch (err: any) {
      console.error('Error registering identity:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para registrar una identidad.
        </p>
      </div>
    );
  }

  // Si el wallet ya está registrado, mostrar información en lugar del formulario
  if (isRegistered) {
    // Si está registrado pero con una dirección inválida (null o sin código de contrato)
    // También verificar si hay un error que indique que el contrato no es válido
    if (!registeredIdentityAddress || error?.includes('no es válida') || error?.includes('no tiene código')) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Estado de Registro
          </h3>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              ⚠️ Tu wallet está registrado, pero el contrato Identity no es válido
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-2">
              {registeredIdentityAddress 
                ? `El registro actual apunta a la dirección ${registeredIdentityAddress}, pero esta dirección no contiene un contrato Identity válido.`
                : 'El registro actual no tiene una dirección de contrato Identity válida.'
              }
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              Necesitas desplegar un contrato Identity y actualizar el registro.
            </p>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          <button
            onClick={async () => {
              try {
                setIsDeploying(true);
                setTxHash(null);
                const { txHash: deployTxHash } = await deployAndRegister();
                setTxHash(deployTxHash);
              } catch (err: any) {
                console.error('Error en deployAndRegister:', err);
              } finally {
                setIsDeploying(false);
              }
            }}
            disabled={isDeploying || loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isDeploying || loading ? 'Desplegando y registrando...' : 'Desplegar y Registrar Contrato Identity'}
          </button>
          {txHash && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
              <p className="font-semibold">Transacción enviada:</p>
              <p className="font-mono text-xs break-all">{txHash}</p>
            </div>
          )}
        </div>
      );
    }

    // Si está registrado correctamente con un contrato Identity válido
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Estado de Registro
        </h3>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200 font-medium mb-2">
            ✓ Tu wallet ya está registrado
          </p>
          {registeredIdentityAddress && (
            <p className="text-green-700 dark:text-green-300 text-sm font-mono break-all">
              Contrato: {registeredIdentityAddress}
            </p>
          )}
          <p className="text-green-700 dark:text-green-300 text-xs mt-2">
            No es necesario registrarlo nuevamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Registrar Identidad
      </h3>

      <div className="space-y-4">
        {/* Opción automática: Desplegar y registrar */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Opción Recomendada: Desplegar y Registrar Automáticamente
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            Esta opción despliega automáticamente un contrato Identity y lo registra en el IdentityRegistry.
          </p>
          <button
            onClick={async () => {
              try {
                setIsDeploying(true);
                setTxHash(null);
                const { txHash: deployTxHash } = await deployAndRegister();
                setTxHash(deployTxHash);
              } catch (err: any) {
                console.error('Error en deployAndRegister:', err);
              } finally {
                setIsDeploying(false);
              }
            }}
            disabled={isDeploying || loading || isSubmitting}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isDeploying || loading ? 'Desplegando y registrando...' : 'Desplegar y Registrar Automáticamente'}
          </button>
        </div>

        {/* Separador */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">O</span>
          </div>
        </div>

        {/* Opción manual: Ingresar dirección */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="identityAddress"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Opción Manual: Dirección del Contrato de Identidad
            </label>
            <input
              type="text"
              id="identityAddress"
              value={identityAddress}
              onChange={(e) => setIdentityAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              disabled={isSubmitting || loading || isDeploying}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Si ya tienes un contrato Identity desplegado, ingresa su dirección aquí.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading || isDeploying || !identityAddress.trim()}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isSubmitting || loading ? 'Registrando...' : 'Registrar con Dirección Manual'}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {txHash && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
            <p className="font-semibold">Transacción enviada:</p>
            <p className="font-mono text-xs break-all">{txHash}</p>
          </div>
        )}
      </div>
    </div>
  );
}

