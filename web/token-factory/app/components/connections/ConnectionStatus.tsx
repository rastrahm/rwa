/**
 * Componente para mostrar el estado de las conexiones (MongoDB y Anvil)
 */

'use client';

import React from 'react';
import { useConnections } from '@/app/hooks/useConnections';

export function ConnectionStatus() {
  const { connectionStatus, isChecking, checkConnections } = useConnections();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600 text-green-700 dark:text-green-400';
      case 'degraded':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400';
      case 'unhealthy':
        return 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (connected: boolean) => {
    return connected ? '✅' : '❌';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`rounded-lg border p-4 shadow-lg ${getStatusColor(connectionStatus.status)}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">Estado de Conexiones</h4>
          <button
            onClick={checkConnections}
            disabled={isChecking}
            className="text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {isChecking ? 'Verificando...' : 'Actualizar'}
          </button>
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(connectionStatus.mongodb.connected)}</span>
            <span>MongoDB:</span>
            <span className="font-medium">
              {connectionStatus.mongodb.connected ? 'Conectado' : 'Desconectado'}
            </span>
            {connectionStatus.mongodb.error && (
              <span className="text-xs opacity-75">({connectionStatus.mongodb.error})</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(connectionStatus.anvil.connected)}</span>
            <span>Anvil:</span>
            <span className="font-medium">
              {connectionStatus.anvil.connected ? 'Conectado' : 'Desconectado'}
            </span>
            {connectionStatus.anvil.chainId && (
              <span className="text-xs opacity-75">(Chain ID: {connectionStatus.anvil.chainId})</span>
            )}
            {connectionStatus.anvil.error && (
              <span className="text-xs opacity-75">({connectionStatus.anvil.error})</span>
            )}
          </div>
        </div>
        
        {connectionStatus.lastChecked && (
          <div className="mt-2 text-xs opacity-75">
            Última verificación: {connectionStatus.lastChecked.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

