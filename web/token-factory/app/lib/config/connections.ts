/**
 * Configuración y validación de conexiones (MongoDB y Anvil)
 * Este módulo centraliza la validación y gestión de conexiones
 */

import { env } from '@/shared/lib/env';
import connectDB from '@/shared/db/connection';
import mongoose from 'mongoose';
import { ethers } from 'ethers';

// ============ Tipos ============

export interface ConnectionStatus {
  mongodb: {
    connected: boolean;
    ready: boolean;
    error?: string;
    uri?: string;
  };
  anvil: {
    connected: boolean;
    ready: boolean;
    error?: string;
    url?: string;
    chainId?: number;
  };
}

// ============ Configuración ============

export const CONNECTION_CONFIG = {
  mongodb: {
    uri: env.MONGODB_URI,
    timeout: 30000,
    retries: 3,
  },
  anvil: {
    url: env.RPC_URL,
    chainId: env.CHAIN_ID,
    timeout: 10000,
    retries: 3,
  },
} as const;

// ============ Validación MongoDB ============

/**
 * Valida la conexión a MongoDB
 * @returns Estado de la conexión
 */
export async function validateMongoDBConnection(): Promise<{
  connected: boolean;
  ready: boolean;
  error?: string;
}> {
  try {
    console.log('🔍 Validando conexión a MongoDB...');
    
    // Conectar a MongoDB
    const mongooseInstance = await connectDB();
    
    // Verificar estado de la conexión
    if (mongooseInstance.connection.readyState !== 1) {
      return {
        connected: false,
        ready: false,
        error: 'Conexión a MongoDB no está lista',
      };
    }
    
    // Hacer ping para verificar que la conexión funcione
    await mongooseInstance.connection.db.admin().ping();
    
    console.log('✅ MongoDB conectado y listo');
    return {
      connected: true,
      ready: true,
    };
  } catch (error: any) {
    console.error('❌ Error validando MongoDB:', error);
    return {
      connected: false,
      ready: false,
      error: error.message || 'Error desconocido al conectar a MongoDB',
    };
  }
}

/**
 * Obtiene una conexión validada a MongoDB
 * @throws Error si no se puede conectar
 */
export async function getMongoDBConnection(): Promise<typeof mongoose> {
  const mongooseInstance = await connectDB();
  
  // Verificar que la conexión esté activa
  if (mongooseInstance.connection.readyState !== 1) {
    throw new Error('MongoDB connection is not ready');
  }
  
  // Hacer ping para verificar
  await mongooseInstance.connection.db.admin().ping();
  
  return mongooseInstance;
}

// ============ Validación Anvil ============

/**
 * Valida la conexión a Anvil (RPC)
 * @returns Estado de la conexión
 */
export async function validateAnvilConnection(): Promise<{
  connected: boolean;
  ready: boolean;
  error?: string;
  chainId?: number;
}> {
  try {
    console.log('🔍 Validando conexión a Anvil...');
    
    const provider = new ethers.JsonRpcProvider(CONNECTION_CONFIG.anvil.url, {
      name: 'Anvil',
      chainId: CONNECTION_CONFIG.anvil.chainId,
    });
    
    // Intentar obtener el número de bloque para verificar la conexión
    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), CONNECTION_CONFIG.anvil.timeout)
      ),
    ]);
    
    // Obtener información de la red
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    console.log(`✅ Anvil conectado - Block: ${blockNumber}, Chain ID: ${chainId}`);
    
    return {
      connected: true,
      ready: true,
      chainId,
    };
  } catch (error: any) {
    console.error('❌ Error validando Anvil:', error);
    return {
      connected: false,
      ready: false,
      error: error.message || 'Error desconocido al conectar a Anvil',
    };
  }
}

/**
 * Obtiene un provider validado de Anvil
 * @throws Error si no se puede conectar
 */
export async function getAnvilProvider(): Promise<ethers.JsonRpcProvider> {
  const provider = new ethers.JsonRpcProvider(CONNECTION_CONFIG.anvil.url, {
    name: 'Anvil',
    chainId: CONNECTION_CONFIG.anvil.chainId,
  });
  
  // Verificar conexión
  await Promise.race([
    provider.getBlockNumber(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout connecting to Anvil')), CONNECTION_CONFIG.anvil.timeout)
    ),
  ]);
  
  return provider;
}

// ============ Validación Completa ============

/**
 * Valida ambas conexiones (MongoDB y Anvil)
 * @returns Estado completo de las conexiones
 */
export async function validateAllConnections(): Promise<ConnectionStatus> {
  console.log('🔍 Validando todas las conexiones...');
  
  const [mongodbStatus, anvilStatus] = await Promise.allSettled([
    validateMongoDBConnection(),
    validateAnvilConnection(),
  ]);
  
  const mongodb = mongodbStatus.status === 'fulfilled' 
    ? mongodbStatus.value 
    : { connected: false, ready: false, error: mongodbStatus.reason?.message || 'Error desconocido' };
  
  const anvil = anvilStatus.status === 'fulfilled'
    ? anvilStatus.value
    : { connected: false, ready: false, error: anvilStatus.reason?.message || 'Error desconocido' };
  
  return {
    mongodb: {
      ...mongodb,
      uri: CONNECTION_CONFIG.mongodb.uri.replace(/\/\/.*@/, '//***@'), // Ocultar credenciales
    },
    anvil: {
      ...anvil,
      url: CONNECTION_CONFIG.anvil.url,
    },
  };
}

// ============ Utilidades de Health Check ============

/**
 * Health check rápido para verificar que los servicios estén disponibles
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  mongodb: boolean;
  anvil: boolean;
  details: ConnectionStatus;
}> {
  const details = await validateAllConnections();
  
  const mongodbOk = details.mongodb.connected && details.mongodb.ready;
  const anvilOk = details.anvil.connected && details.anvil.ready;
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (mongodbOk && anvilOk) {
    status = 'healthy';
  } else if (mongodbOk || anvilOk) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }
  
  return {
    status,
    mongodb: mongodbOk,
    anvil: anvilOk,
    details,
  };
}

