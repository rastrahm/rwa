/**
 * Utilidades para trabajar con MongoDB de forma segura
 * Proporciona funciones helper para operaciones comunes con validación de conexión
 */

import mongoose from 'mongoose';
import { getMongoDBConnection } from '../config/connections';

/**
 * Ejecuta una operación con validación automática de conexión MongoDB
 * @param operation Función que recibe la instancia de mongoose y retorna el resultado
 * @param errorMessage Mensaje de error personalizado
 */
export async function withMongoDBConnection<T>(
  operation: (mongooseInstance: typeof mongoose) => Promise<T>,
  errorMessage = 'Error en operación MongoDB'
): Promise<T> {
  try {
    const mongooseInstance = await getMongoDBConnection();
    return await operation(mongooseInstance);
  } catch (error: any) {
    console.error(`❌ ${errorMessage}:`, error);
    
    // Detectar errores específicos de MongoDB
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      throw new Error('Error de conexión a MongoDB. Verifica que el servicio esté corriendo.');
    }
    
    if (error.message?.includes('buffering timed out')) {
      throw new Error('Timeout esperando conexión a MongoDB. El servicio puede estar sobrecargado.');
    }
    
    throw error;
  }
}

/**
 * Obtiene una colección de MongoDB con validación de conexión
 */
export async function getMongoCollection(collectionName: string) {
  const mongooseInstance = await getMongoDBConnection();
  return mongooseInstance.connection.db.collection(collectionName);
}

/**
 * Ejecuta una consulta find con manejo de errores mejorado
 */
export async function findDocuments(
  collectionName: string,
  query: any,
  options: { sort?: any; limit?: number; skip?: number } = {}
) {
  return withMongoDBConnection(async (mongooseInstance) => {
    const collection = mongooseInstance.connection.db.collection(collectionName);
    let cursor = collection.find(query);
    
    if (options.sort) {
      cursor = cursor.sort(options.sort);
    }
    
    if (options.skip) {
      cursor = cursor.skip(options.skip);
    }
    
    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }
    
    return await cursor.toArray();
  }, `Error al consultar colección ${collectionName}`);
}

/**
 * Inserta un documento con manejo de errores mejorado
 */
export async function insertDocument(collectionName: string, document: any) {
  return withMongoDBConnection(async (mongooseInstance) => {
    const collection = mongooseInstance.connection.db.collection(collectionName);
    const result = await collection.insertOne(document);
    
    if (!result.insertedId) {
      throw new Error(`Failed to insert document into ${collectionName}`);
    }
    
    // Retornar el documento insertado
    return await collection.findOne({ _id: result.insertedId });
  }, `Error al insertar en colección ${collectionName}`);
}

/**
 * Actualiza un documento con manejo de errores mejorado
 */
export async function updateDocument(
  collectionName: string,
  filter: any,
  update: any,
  options: { upsert?: boolean } = {}
) {
  return withMongoDBConnection(async (mongooseInstance) => {
    const collection = mongooseInstance.connection.db.collection(collectionName);
    const result = await collection.updateOne(filter, update, options);
    return result;
  }, `Error al actualizar en colección ${collectionName}`);
}

