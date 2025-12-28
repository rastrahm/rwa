/**
 * Hook para verificar el estado de las conexiones (MongoDB y Anvil)
 * Útil para mostrar el estado de los servicios en la UI
 */

import { useState, useEffect, useCallback } from 'react';

export interface ConnectionStatus {
  mongodb: {
    connected: boolean;
    ready: boolean;
    error?: string;
  };
  anvil: {
    connected: boolean;
    ready: boolean;
    error?: string;
    chainId?: number;
  };
  status: 'healthy' | 'degraded' | 'unhealthy' | 'checking';
  lastChecked?: Date;
}

export function useConnections() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    mongodb: { connected: false, ready: false },
    anvil: { connected: false, ready: false },
    status: 'checking',
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkConnections = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      setConnectionStatus({
        mongodb: {
          connected: data.details?.mongodb?.connected || false,
          ready: data.details?.mongodb?.ready || false,
          error: data.details?.mongodb?.error,
        },
        anvil: {
          connected: data.details?.anvil?.connected || false,
          ready: data.details?.anvil?.ready || false,
          error: data.details?.anvil?.error,
          chainId: data.details?.anvil?.chainId,
        },
        status: data.status || 'unhealthy',
        lastChecked: new Date(),
      });
    } catch (error: any) {
      console.error('Error checking connections:', error);
      setConnectionStatus({
        mongodb: { connected: false, ready: false, error: 'Error al verificar conexión' },
        anvil: { connected: false, ready: false, error: 'Error al verificar conexión' },
        status: 'unhealthy',
        lastChecked: new Date(),
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Verificar conexiones al montar el componente
    checkConnections();
    
    // Verificar periódicamente (cada 30 segundos)
    const interval = setInterval(checkConnections, 30000);
    
    return () => clearInterval(interval);
  }, [checkConnections]);

  return {
    connectionStatus,
    isChecking,
    checkConnections,
  };
}

