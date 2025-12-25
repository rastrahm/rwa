import { NextResponse } from 'next/server';
import { connectDB, ClaimRequest } from '@/shared';
import { ethers } from 'ethers';
import mongoose from 'mongoose';

/**
 * Convierte texto a hexadecimal
 */
function textToHex(text: string): string {
  if (!text.trim()) {
    return '0x';
  }
  try {
    const bytes = ethers.toUtf8Bytes(text.trim());
    return bytes.length > 0 ? ethers.hexlify(bytes) : '0x';
  } catch (err) {
    console.error('Error converting text to hex:', err);
    return '0x';
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const {
      requesterAddress,
      identityAddress,
      topic,
      scheme,
      issuerAddress,
      signature,
      dataText,
      uri,
    } = body;

    // Validaciones
    if (!requesterAddress || !ethers.isAddress(requesterAddress)) {
      return NextResponse.json(
        { error: 'Dirección del solicitante inválida' },
        { status: 400 }
      );
    }

    if (!identityAddress || !ethers.isAddress(identityAddress)) {
      return NextResponse.json(
        { error: 'Dirección del contrato Identity inválida' },
        { status: 400 }
      );
    }

    if (!issuerAddress || !ethers.isAddress(issuerAddress)) {
      return NextResponse.json(
        { error: 'Dirección del Trusted Issuer inválida' },
        { status: 400 }
      );
    }

    if (!topic || isNaN(Number(topic))) {
      return NextResponse.json(
        { error: 'Topic inválido' },
        { status: 400 }
      );
    }

    if (!scheme || isNaN(Number(scheme))) {
      return NextResponse.json(
        { error: 'Scheme inválido' },
        { status: 400 }
      );
    }

    // Convertir data de texto a hex si se proporciona
    const dataHex = dataText ? textToHex(dataText) : '0x';

    // Verificar una vez más que la conexión esté lista antes de crear el documento
    if (mongooseInstance.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready. Please try again.');
    }

    // Crear solicitud de claim
    let claimRequest;
    try {
      // Construir objeto sin campos undefined
      const now = new Date();
      const claimData: any = {
        requesterAddress: requesterAddress.toLowerCase(),
        identityAddress: identityAddress.toLowerCase(),
        topic: Number(topic),
        scheme: Number(scheme),
        issuerAddress: issuerAddress.toLowerCase(),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      // Solo agregar campos opcionales si tienen valor
      if (signature && signature.trim()) {
        claimData.signature = signature.trim();
      }
      if (dataText && dataText.trim()) {
        claimData.dataText = dataText.trim();
      }
      if (dataHex && dataHex !== '0x') {
        claimData.dataHex = dataHex;
      }
      if (uri && uri.trim()) {
        claimData.uri = uri.trim();
      }

      // Asegurarse de que la conexión esté lista antes de crear
      // Verificar estado de conexión
      if (mongooseInstance.connection.readyState !== 1) {
        throw new Error('MongoDB connection lost. Please try again.');
      }
      
      // Hacer ping para verificar que la conexión esté realmente activa
      await mongooseInstance.connection.db.admin().ping();
      
      // Usar la conexión directa para insertar el documento
      // Esto evita problemas con el buffering de Mongoose
      const collection = mongooseInstance.connection.db.collection('claimrequests');
      const insertResult = await collection.insertOne(claimData);
      
      if (!insertResult.insertedId) {
        throw new Error('Failed to create claim request');
      }
      
      // Obtener el documento insertado
      claimRequest = await collection.findOne({ _id: insertResult.insertedId });
      
      if (!claimRequest) {
        throw new Error('Failed to retrieve created claim request');
      }
    } catch (createError: any) {
      console.error('Error creating ClaimRequest:', createError);
      console.error('MongoDB connection state during error:', mongooseInstance?.connection?.readyState);
      console.error('Error details:', {
        name: createError.name,
        message: createError.message,
        code: createError.code,
        stack: createError.stack,
      });
      
      if (createError.code === 11000) {
        return NextResponse.json(
          { error: 'Ya existe una solicitud pendiente con estos parámetros' },
          { status: 409 }
        );
      }
      
      // Si es un error de conexión, retornar 503
      if (createError.name === 'MongoServerSelectionError' || 
          createError.name === 'MongoNetworkError' ||
          createError.message?.includes('buffering timed out') ||
          createError.message?.includes('connection')) {
        return NextResponse.json(
          { 
            error: 'Error de conexión a la base de datos', 
            details: 'Por favor, verifica que MongoDB esté corriendo y vuelve a intentar.',
            errorType: createError.name,
          },
          { status: 503 }
        );
      }
      
      throw createError; // Re-lanzar para que sea manejado por el catch general
    }

    return NextResponse.json(
      {
        success: true,
        claimRequest: {
          id: claimRequest._id.toString(),
          requesterAddress: claimRequest.requesterAddress,
          identityAddress: claimRequest.identityAddress,
          topic: claimRequest.topic,
          scheme: claimRequest.scheme,
          issuerAddress: claimRequest.issuerAddress,
          status: claimRequest.status,
          createdAt: claimRequest.createdAt || new Date(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating claim request:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
    });
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud pendiente con estos parámetros' },
        { status: 409 }
      );
    }
    
    // Verificar si es un error de MongoDB
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos. Verifica que MongoDB esté corriendo.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al crear solicitud de claim', 
        details: error.message,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}

// GET: Obtener solicitudes de claims
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
    const requesterAddress = searchParams.get('requesterAddress');
    const issuerAddress = searchParams.get('issuerAddress');
    const status = searchParams.get('status');

    const query: any = {};
    
    if (requesterAddress && ethers.isAddress(requesterAddress)) {
      query.requesterAddress = requesterAddress.toLowerCase();
    }
    
    if (issuerAddress && ethers.isAddress(issuerAddress)) {
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

    // Usar conexión directa a MongoDB (igual que en Trusted Issuers)
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
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
    });
    
    // Verificar si es un error de MongoDB
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

