#!/usr/bin/env node

/**
 * Script para limpiar todas las colecciones de MongoDB
 * Uso: node scripts/clean-mongodb.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-platform';

async function cleanDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    console.log(`📍 URI: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    
    // Obtener todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log(`\n📋 Encontradas ${collections.length} colecciones:`);
    
    if (collections.length === 0) {
      console.log('ℹ️  No hay colecciones para limpiar.');
      await mongoose.disconnect();
      return;
    }

    // Listar colecciones
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Confirmar antes de eliminar
    console.log('\n⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de estas colecciones.');
    console.log('Presiona Ctrl+C para cancelar, o espera 3 segundos para continuar...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Eliminar todas las colecciones
    let deletedCount = 0;
    for (const collection of collections) {
      try {
        const result = await db.collection(collection.name).deleteMany({});
        console.log(`✅ Limpiada colección "${collection.name}": ${result.deletedCount} documentos eliminados`);
        deletedCount += result.deletedCount;
      } catch (error) {
        console.error(`❌ Error al limpiar "${collection.name}":`, error.message);
      }
    }

    console.log(`\n✨ Proceso completado. Total de documentos eliminados: ${deletedCount}`);
    
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Asegúrate de que MongoDB esté corriendo: sudo systemctl start mongod');
    }
    process.exit(1);
  }
}

// Ejecutar
cleanDatabase();

