import { NextResponse } from 'next/server';
import { connectDB, ClaimRequest } from '@/shared';
import { ethers } from 'ethers';
import mongoose from 'mongoose';

// GET: Obtener claims completados de un Identity
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identityAddress = searchParams.get('identityAddress');

    if (!identityAddress || !ethers.isAddress(identityAddress)) {
      return NextResponse.json(
        { error: 'Dirección del contrato Identity inválida' },
        { status: 400 }
      );
    }

    // Conectar a MongoDB y verificar que esté listo
    let mongooseInstance: typeof mongoose;
    try {
      mongooseInstance = await connectDB();
      
      // Verificar que la conexión esté activa
      if (mongooseInstance.connection.readyState !== 1) {
        // Si no está conectado, esperar a que se conecte
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout esperando conexión a MongoDB'));
          }, 10000);
          
          if (mongooseInstance.connection.readyState === 1) {
            clearTimeout(timeout);
            resolve();
          } else {
            mongooseInstance.connection.once('connected', () => {
              clearTimeout(timeout);
              setTimeout(() => resolve(), 200);
            });
            mongooseInstance.connection.once('error', (err) => {
              clearTimeout(timeout);
              reject(err);
            });
          }
        });
      }
      
      // Hacer un ping para asegurar que la conexión esté realmente activa
      try {
        await mongooseInstance.connection.db.admin().ping();
      } catch (pingError) {
        console.error('MongoDB ping failed:', pingError);
        throw new Error('MongoDB connection is not responding');
      }
    } catch (dbError: any) {
      console.error('Error connecting to MongoDB:', dbError);
      console.error('MongoDB connection state:', mongooseInstance?.connection?.readyState);
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos', details: dbError.message },
        { status: 503 }
      );
    }
    
    // Verificar una vez más que la conexión esté lista antes de hacer la consulta
    if (mongooseInstance.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready. Please try again.');
    }
    
    // Hacer ping antes de la consulta
    await mongooseInstance.connection.db.admin().ping();
    
    // La conexión está lista, podemos hacer la consulta
    // Usar la conexión directa en lugar del modelo para evitar problemas de buffering
    let completedClaims;
    try {
      const collection = mongooseInstance.connection.db.collection('claimrequests');
      completedClaims = await collection.find({
        identityAddress: identityAddress.toLowerCase(),
        status: 'completed',
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
    } catch (queryError: any) {
      console.error('Error executing query:', queryError);
      console.error('MongoDB connection state during error:', mongooseInstance?.connection?.readyState);
      
      // Si la colección no existe o hay un error de consulta, retornar array vacío
      if (queryError.name === 'MongoServerSelectionError' || 
          queryError.name === 'MongoNetworkError' ||
          queryError.message?.includes('buffering timed out') ||
          queryError.message?.includes('connection')) {
        return NextResponse.json(
          { 
            error: 'Error de conexión a la base de datos', 
            details: 'Por favor, verifica que MongoDB esté corriendo y vuelve a intentar.',
            errorType: queryError.name,
          },
          { status: 503 }
        );
      }
      
      // Para otros errores, retornar array vacío en lugar de fallar
      completedClaims = [];
    }

    // Formatear los claims (los documentos de MongoDB ya vienen como objetos planos)
    const claims = completedClaims.map((cr: any) => ({
      id: cr._id.toString(),
      topic: cr.topic,
      scheme: cr.scheme,
      issuer: cr.issuerAddress,
      signature: cr.signature || '0x',
      data: cr.dataHex || cr.dataText || '0x',
      uri: cr.uri || '',
      claimTxHash: cr.claimTxHash,
      createdAt: cr.createdAt,
      reviewedAt: cr.reviewedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        claims,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching claims:', error);
    console.error('Error stack:', error.stack);
    
    // Verificar si es un error de MongoDB
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos. Verifica que MongoDB esté corriendo.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al obtener claims', 
        details: error.message,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}

