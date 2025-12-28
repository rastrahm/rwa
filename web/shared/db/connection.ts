import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-platform';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Usar una variable global para cachear la conexión en desarrollo
declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  // Si ya tenemos una conexión activa, devolverla
  if (cached.conn) {
    const readyState = cached.conn.connection.readyState;
    if (readyState === 1) {
      // Verificar que la conexión siga activa haciendo un ping rápido
      try {
        await cached.conn.connection.db.admin().ping();
        return cached.conn;
      } catch (err) {
        console.warn('⚠️ Conexión cacheada no responde, reconectando...');
        cached.conn = null;
        cached.promise = null;
      }
    } else {
      // Limpiar si no está conectado
      cached.conn = null;
      cached.promise = null;
    }
  }

  // Si no hay promesa de conexión, crear una
  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 30000, // Aumentado a 30 segundos
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // Aumentado a 30 segundos
      // Usar maxPoolSize y minPoolSize para controlar la conexión
      maxPoolSize: 10,
      minPoolSize: 1,
      // Nota: bufferMaxEntries y bufferCommands fueron removidos en versiones recientes de Mongoose
      // No los incluimos aquí para evitar errores de compatibilidad
    };

    console.log('🔌 Conectando a MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//***@')); // Ocultar credenciales
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    
    // Asegurarse de que la conexión esté completamente lista
    if (cached.conn.connection.readyState !== 1) {
      // Esperar a que la conexión esté lista
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout esperando conexión a MongoDB'));
        }, 10000);
        
        if (cached.conn!.connection.readyState === 1) {
          clearTimeout(timeout);
          resolve();
        } else {
          cached.conn!.connection.once('connected', () => {
            clearTimeout(timeout);
            setTimeout(() => resolve(), 200);
          });
          cached.conn!.connection.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }
      });
    }
    
    // Hacer ping para verificar que la conexión esté realmente activa
    await cached.conn.connection.db.admin().ping();
    
    // Asegurarse de que los modelos estén registrados en la conexión activa
    // Esto es necesario porque los modelos pueden haberse importado antes de conectar
    if (cached.conn.connection.models) {
      // Los modelos ya están registrados en la conexión
      // Si hay modelos en mongoose.models que no están en la conexión, re-registrarlos
      for (const [modelName, model] of Object.entries(mongoose.models)) {
        if (!cached.conn.connection.models[modelName]) {
          // Re-registrar el modelo en la conexión activa
          cached.conn.connection.models[modelName] = model;
        }
      }
    }
    
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }
}

export default connectDB;
