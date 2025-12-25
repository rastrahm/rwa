'use client';

import React from 'react';
import { useIdentityRegistry } from '@/app/hooks/useIdentityRegistry';
import { useIdentity } from '@/app/hooks/useIdentity';

export function IdentityCard() {
  const { isRegistered, identityAddress, loading, error } = useIdentityRegistry();
  const { owner, loading: identityLoading, error: identityError } = useIdentity(identityAddress);

  if (loading || identityLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Solo mostrar error del registry si es crítico
  if (error && !isRegistered) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Estado de Identidad
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Tu wallet no tiene una identidad registrada. Registra una identidad para comenzar.
          </p>
        </div>
      </div>
    );
  }

  // Si está registrado pero no hay identityAddress válido
  if (!identityAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Estado de Identidad
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            ⚠️ Wallet registrado, pero contrato Identity no válido
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            Tu wallet está registrado en el IdentityRegistry, pero el contrato Identity asociado no es válido o no está desplegado.
          </p>
          {error && (
            <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-2">
              Detalles: {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Información de Identidad
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estado
          </label>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Registrado
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contrato de Identidad
          </label>
          <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
            {identityAddress}
          </p>
        </div>

        {identityError && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              ⚠️ {identityError}
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
              El wallet está registrado, pero el contrato de identidad no se pudo cargar. Esto puede ser normal si el contrato aún no está desplegado.
            </p>
          </div>
        )}

        {owner && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Propietario
            </label>
            <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
              {owner}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

