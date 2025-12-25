import { NextResponse } from 'next/server';
import { connectDB, ClaimRequest, Transaction } from '@/shared';
import mongoose from 'mongoose';

/**
 * Ruta de prueba para verificar la conexión a MongoDB
 * GET /api/test-mongodb
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
    success: true,
  };

  try {
    // Test 1: Conectar a MongoDB
    results.tests.push({ name: 'Conectar a MongoDB', status: 'running' });
    let mongooseInstance: typeof mongoose;
    
    try {
      mongooseInstance = await connectDB();
      results.tests[results.tests.length - 1].status = 'success';
      results.tests[results.tests.length - 1].details = {
        readyState: mongooseInstance.connection.readyState,
        dbName: mongooseInstance.connection.db.databaseName,
      };
    } catch (error: any) {
      results.tests[results.tests.length - 1].status = 'error';
      results.tests[results.tests.length - 1].error = error.message;
      results.success = false;
      return NextResponse.json(results, { status: 503 });
    }

    // Test 2: Ping a MongoDB
    results.tests.push({ name: 'Ping a MongoDB', status: 'running' });
    try {
      await mongooseInstance.connection.db.admin().ping();
      results.tests[results.tests.length - 1].status = 'success';
    } catch (error: any) {
      results.tests[results.tests.length - 1].status = 'error';
      results.tests[results.tests.length - 1].error = error.message;
      results.success = false;
    }

    // Test 3: Listar colecciones
    results.tests.push({ name: 'Listar colecciones', status: 'running' });
    try {
      const collections = await mongooseInstance.connection.db.listCollections().toArray();
      results.tests[results.tests.length - 1].status = 'success';
      results.tests[results.tests.length - 1].details = {
        collections: collections.map(c => c.name),
        count: collections.length,
      };
    } catch (error: any) {
      results.tests[results.tests.length - 1].status = 'error';
      results.tests[results.tests.length - 1].error = error.message;
      results.success = false;
    }

    // Test 4: Contar documentos en claimrequests (usando conexión directa)
    results.tests.push({ name: 'Contar documentos en claimrequests', status: 'running' });
    try {
      // Usar la conexión directamente en lugar del modelo
      const collection = mongooseInstance.connection.db.collection('claimrequests');
      const count = await collection.countDocuments();
      results.tests[results.tests.length - 1].status = 'success';
      results.tests[results.tests.length - 1].details = { count };
    } catch (error: any) {
      results.tests[results.tests.length - 1].status = 'error';
      results.tests[results.tests.length - 1].error = error.message;
      results.success = false;
    }

    // Test 5: Contar documentos en transactions (usando conexión directa)
    results.tests.push({ name: 'Contar documentos en transactions', status: 'running' });
    try {
      const collection = mongooseInstance.connection.db.collection('transactions');
      const count = await collection.countDocuments();
      results.tests[results.tests.length - 1].status = 'success';
      results.tests[results.tests.length - 1].details = { count };
    } catch (error: any) {
      results.tests[results.tests.length - 1].status = 'error';
      results.tests[results.tests.length - 1].error = error.message;
      results.success = false;
    }

    // Test 6: Operación de lectura (usando conexión directa)
    results.tests.push({ name: 'Operación de lectura (findOne)', status: 'running' });
    try {
      const collection = mongooseInstance.connection.db.collection('claimrequests');
      const sample = await collection.findOne({});
      results.tests[results.tests.length - 1].status = 'success';
      results.tests[results.tests.length - 1].details = {
        found: !!sample,
        sampleId: sample?._id?.toString() || null,
      };
    } catch (error: any) {
      results.tests[results.tests.length - 1].status = 'error';
      results.tests[results.tests.length - 1].error = error.message;
      results.success = false;
    }

    // Test 6b: Operación de lectura usando modelo Mongoose
    results.tests.push({ name: 'Operación de lectura usando modelo Mongoose', status: 'running' });
    try {
      // Verificar que el modelo esté asociado con la conexión correcta
      if (mongooseInstance.connection.models.ClaimRequest) {
        const ClaimRequestModel = mongooseInstance.connection.models.ClaimRequest;
        const sample = await ClaimRequestModel.findOne({}).lean();
        results.tests[results.tests.length - 1].status = 'success';
        results.tests[results.tests.length - 1].details = {
          found: !!sample,
          sampleId: sample?._id?.toString() || null,
          usingModel: true,
        };
      } else {
        // Si el modelo no está registrado en la conexión, intentar usar el modelo default
        const sample = await ClaimRequest.findOne({}).lean();
        results.tests[results.tests.length - 1].status = 'success';
        results.tests[results.tests.length - 1].details = {
          found: !!sample,
          sampleId: sample?._id?.toString() || null,
          usingModel: true,
        };
      }
    } catch (error: any) {
      results.tests[results.tests.length - 1].status = 'error';
      results.tests[results.tests.length - 1].error = error.message;
      results.success = false;
    }

    // Test 7: Operación de escritura (test - no guarda)
    results.tests.push({ name: 'Preparar operación de escritura', status: 'running' });
    try {
      // Solo verificamos que podemos crear un documento sin guardarlo
      const testDoc = new ClaimRequest({
        requesterAddress: '0x0000000000000000000000000000000000000000',
        identityAddress: '0x0000000000000000000000000000000000000000',
        topic: 999,
        scheme: 1,
        issuerAddress: '0x0000000000000000000000000000000000000000',
        status: 'pending',
      });
      // Validar sin guardar
      await testDoc.validate();
      results.tests[results.tests.length - 1].status = 'success';
      results.tests[results.tests.length - 1].details = {
        validation: 'passed',
      };
    } catch (error: any) {
      results.tests[results.tests.length - 1].status = 'error';
      results.tests[results.tests.length - 1].error = error.message;
      results.success = false;
    }

    // Resumen
    results.summary = {
      total: results.tests.length,
      passed: results.tests.filter((t: any) => t.status === 'success').length,
      failed: results.tests.filter((t: any) => t.status === 'error').length,
    };

    return NextResponse.json(results, { 
      status: results.success ? 200 : 500 
    });
  } catch (error: any) {
    results.success = false;
    results.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    return NextResponse.json(results, { status: 500 });
  }
}

