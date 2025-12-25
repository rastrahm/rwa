import { NextResponse } from 'next/server';
import { connectDB, ClaimRequest } from '@/shared';
import { ethers } from 'ethers';
import mongoose from 'mongoose';

/**
 * POST: Aprobar una solicitud de claim
 * Body:
 * - claimRequestId: ID de la solicitud de claim
 * - issuerAddress: Dirección del Trusted Issuer que aprueba
 * - txHash: Hash de la transacción que agregó el claim al contrato
 * - status: Estado final ('approved' o 'completed')
 */
export async function POST(request: Request) {
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
      
      // Hacer ping para asegurar que la conexión esté realmente activa
      try {
        await mongooseInstance.connection.db.admin().ping();
      } catch (pingError) {
        console.error('MongoDB ping failed:', pingError);
        throw new Error('MongoDB connection is not responding');
      }
    } catch (dbError: any) {
      console.error('Error connecting to MongoDB:', dbError);
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos', details: dbError.message },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { claimRequestId, issuerAddress, txHash, status } = body;

    // Validaciones
    if (!claimRequestId) {
      return NextResponse.json(
        { error: 'ID de solicitud de claim requerido' },
        { status: 400 }
      );
    }

    if (!issuerAddress || !ethers.isAddress(issuerAddress)) {
      return NextResponse.json(
        { error: 'Dirección del issuer inválida' },
        { status: 400 }
      );
    }

    if (!txHash) {
      return NextResponse.json(
        { error: 'Hash de transacción requerido' },
        { status: 400 }
      );
    }

    if (!status || !['approved', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido. Debe ser "approved" o "completed"' },
        { status: 400 }
      );
    }

    // Verificar que la conexión esté lista antes de actualizar
    if (mongooseInstance.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready. Please try again.');
    }
    
    await mongooseInstance.connection.db.admin().ping();

    // Buscar y actualizar la solicitud de claim
    const collection = mongooseInstance.connection.db.collection('claimrequests');
    const updateResult = await collection.updateOne(
      { 
        _id: new mongoose.Types.ObjectId(claimRequestId),
        issuerAddress: issuerAddress.toLowerCase(),
      },
      {
        $set: {
          status: status,
          claimTxHash: txHash,
          reviewedBy: issuerAddress.toLowerCase(),
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Solicitud de claim no encontrada o no corresponde al issuer especificado' },
        { status: 404 }
      );
    }

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la solicitud de claim' },
        { status: 500 }
      );
    }

    // Obtener la solicitud actualizada
    const updatedClaimRequest = await collection.findOne({
      _id: new mongoose.Types.ObjectId(claimRequestId),
    });

    return NextResponse.json(
      {
        success: true,
        claimRequest: {
          id: updatedClaimRequest?._id.toString(),
          requesterAddress: updatedClaimRequest?.requesterAddress,
          identityAddress: updatedClaimRequest?.identityAddress,
          topic: updatedClaimRequest?.topic,
          scheme: updatedClaimRequest?.scheme,
          issuerAddress: updatedClaimRequest?.issuerAddress,
          status: updatedClaimRequest?.status,
          claimTxHash: updatedClaimRequest?.claimTxHash,
          reviewedBy: updatedClaimRequest?.reviewedBy,
          reviewedAt: updatedClaimRequest?.reviewedAt,
          createdAt: updatedClaimRequest?.createdAt,
          updatedAt: updatedClaimRequest?.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error approving claim request:', error);
    console.error('Error stack:', error.stack);
    
    // Verificar si es un error de MongoDB
    if (error.name === 'MongoServerSelectionError' || 
        error.name === 'MongoNetworkError' ||
        error.message?.includes('buffering timed out') ||
        error.message?.includes('connection')) {
      return NextResponse.json(
        { 
          error: 'Error de conexión a la base de datos', 
          details: 'Por favor, verifica que MongoDB esté corriendo y vuelve a intentar.',
          errorType: error.name,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al aprobar solicitud de claim', 
        details: error.message,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}

