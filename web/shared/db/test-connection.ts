/**
 * Script de prueba para verificar la conexión a MongoDB
 * Ejecutar con: npx tsx shared/db/test-connection.ts
 */

import connectDB from './connection';

async function testConnection() {
  try {
    console.log('🔄 Intentando conectar a MongoDB...');
    await connectDB();
    console.log('✅ Conexión exitosa a MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
}

testConnection();

