import { NextResponse } from 'next/server';
import { connectDB } from '@/shared';
import mongoose from 'mongoose';

/**
 * GET: Obtener solicitudes de claims para un Trusted Issuer
 * Query params:
 * - issuerAddress: Dirección del Trusted Issuer
 * - status: Estado de la solicitud (pending, approved, rejected, completed)
 */
export async function GET(request: Request) {
  try {
    // Conectar a MongoDB y verificar que esté listo
    let mongooseInstance: typeof mongoose;
    try {
      mongooseInstance = await connectDB();
      
      // Verificar que la conexión esté activa
      if (mongooseInstance.connection.readyState !== 1) {
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
      
      // Hacer ping
      await mongooseInstance.connection.db.admin().ping();
    } catch (dbError: any) {
      console.error('Error connecting to MongoDB:', dbError);
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos', details: dbError.message },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const issuerAddress = searchParams.get('issuerAddress');
    const status = searchParams.get('status');

    const query: any = {};
    
    if (issuerAddress) {
      query.issuerAddress = issuerAddress.toLowerCase();
    }
    
    if (status && ['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      query.status = status;
    }

    // Verificar conexión antes de consultar
    if (mongooseInstance.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready. Please try again.');
    }
    
    await mongooseInstance.connection.db.admin().ping();

    // Usar conexión directa
    let claimRequests: any[];
    try {
      const collection = mongooseInstance.connection.db.collection('claimrequests');
      claimRequests = await collection.find(query)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
    } catch (queryError: any) {
      console.error('Error executing query:', queryError);
      
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
      
      claimRequests = [];
    }

    return NextResponse.json(
      {
        success: true,
        claimRequests: claimRequests.map((cr: any) => ({
          id: cr._id.toString(),
          requesterAddress: cr.requesterAddress,
          identityAddress: cr.identityAddress,
          topic: cr.topic,
          scheme: cr.scheme,
          issuerAddress: cr.issuerAddress,
          signature: cr.signature,
          dataText: cr.dataText,
          dataHex: cr.dataHex,
          uri: cr.uri,
          status: cr.status,
          claimTxHash: cr.claimTxHash,
          rejectionReason: cr.rejectionReason,
          issuerNotes: cr.issuerNotes,
          createdAt: cr.createdAt,
          updatedAt: cr.updatedAt,
          reviewedAt: cr.reviewedAt,
          reviewedBy: cr.reviewedBy,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching claim requests:', error);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos. Verifica que MongoDB esté corriendo.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al obtener solicitudes de claims', 
        details: error.message,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}

