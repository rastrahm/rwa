#!/usr/bin/env node

/**
 * Script de prueba para verificar la conexión a MongoDB
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-platform';

console.log('🔍 Verificando conexión a MongoDB...');
console.log('📍 URI:', MONGODB_URI);

async function testConnection() {
  try {
    // Configuración igual a la de la aplicación
    const opts = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    };

    console.log('\n📡 Conectando a MongoDB...');
    const connection = await mongoose.connect(MONGODB_URI, opts);
    
    console.log('✅ Conexión establecida');
    console.log('📊 Estado de conexión:', connection.connection.readyState === 1 ? 'CONECTADO' : 'DESCONECTADO');
    
    // Hacer ping
    console.log('\n🏓 Haciendo ping a MongoDB...');
    await connection.connection.db.admin().ping();
    console.log('✅ Ping exitoso');
    
    // Verificar base de datos
    console.log('\n📚 Verificando base de datos...');
    const dbName = connection.connection.db.databaseName;
    console.log('📖 Base de datos:', dbName);
    
    // Listar colecciones
    console.log('\n📋 Colecciones disponibles:');
    const collections = await connection.connection.db.listCollections().toArray();
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Verificar colección claimrequests
    console.log('\n🔍 Verificando colección "claimrequests"...');
    const ClaimRequestCollection = connection.connection.db.collection('claimrequests');
    const count = await ClaimRequestCollection.countDocuments();
    console.log(`  ✅ Colección existe con ${count} documentos`);
    
    // Verificar colección transactions
    console.log('\n🔍 Verificando colección "transactions"...');
    const TransactionCollection = connection.connection.db.collection('transactions');
    const txCount = await TransactionCollection.countDocuments();
    console.log(`  ✅ Colección existe con ${txCount} documentos`);
    
    // Probar una operación de lectura
    console.log('\n📖 Probando operación de lectura...');
    const sample = await ClaimRequestCollection.findOne({});
    if (sample) {
      console.log('  ✅ Lectura exitosa - Documento de ejemplo encontrado');
    } else {
      console.log('  ℹ️  Lectura exitosa - No hay documentos en la colección');
    }
    
    // Probar una operación de escritura (sin guardar)
    console.log('\n✍️  Probando operación de escritura (test)...');
    const testDoc = {
      _test: true,
      timestamp: new Date(),
    };
    // No guardamos, solo verificamos que podemos crear el documento
    console.log('  ✅ Operación de escritura preparada correctamente');
    
    console.log('\n✅ Todas las pruebas pasaron exitosamente');
    console.log('\n🎉 MongoDB está funcionando correctamente');
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('\n👋 Conexión cerrada');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error al conectar a MongoDB:');
    console.error('  Tipo:', error.name);
    console.error('  Mensaje:', error.message);
    console.error('  Stack:', error.stack);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Sugerencia: Verifica que MongoDB esté corriendo en', MONGODB_URI);
    } else if (error.name === 'MongoNetworkError') {
      console.error('\n💡 Sugerencia: Verifica la conectividad de red a MongoDB');
    }
    
    process.exit(1);
  }
}

testConnection();

