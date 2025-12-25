import { NextResponse } from 'next/server';
import { connectDB, TrustedIssuerRequest, Attachment, Transaction } from '@/shared';
import mongoose from 'mongoose';

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
      
      // Hacer ping
      await mongooseInstance.connection.db.admin().ping();
    } catch (dbError: any) {
      console.error('Error connecting to MongoDB:', dbError);
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos', details: dbError.message },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const data = JSON.parse(formData.get('data') as string);
    const file = formData.get('file') as File | null;

    const {
      requesterAddress,
      organizationName,
      description,
      contactEmail,
      website,
      claimTopics,
    } = data;

    if (!requesterAddress || !organizationName || !claimTopics || claimTopics.length === 0) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Verificar conexión antes de crear
    if (mongooseInstance.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready. Please try again.');
    }
    
    await mongooseInstance.connection.db.admin().ping();

    // Usar conexión directa para crear la solicitud
    const now = new Date();
    const requestData: any = {
      requesterAddress: requesterAddress.toLowerCase(),
      organizationName,
      description,
      contactEmail,
      website,
      claimTopics: claimTopics.map((t: number) => Number(t)),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const collection = mongooseInstance.connection.db.collection('trustedissuerrequests');
    const insertResult = await collection.insertOne(requestData);
    
    if (!insertResult.insertedId) {
      throw new Error('Failed to create trusted issuer request');
    }
    
    // Obtener el documento insertado
    const requestDoc = await collection.findOne({ _id: insertResult.insertedId });
    
    if (!requestDoc) {
      throw new Error('Failed to retrieve created trusted issuer request');
    }

    // Guardar archivo adjunto si existe
    if (file && file.size > 0) {
      const filePath = `/uploads/trusted-issuer-requests/${requestDoc._id}/${file.name}`;
      
      const attachmentData: any = {
        relatedId: requestDoc._id.toString(),
        relatedType: 'trusted-issuer-request',
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        filePath,
        uploadedBy: requesterAddress.toLowerCase(),
        description: `Archivo adjunto para solicitud de trusted issuer: ${organizationName}`,
        createdAt: now,
        updatedAt: now,
      };

      const attachmentsCollection = mongooseInstance.connection.db.collection('attachments');
      await attachmentsCollection.insertOne(attachmentData);
    }

    return NextResponse.json(
      { 
        success: true, 
        request: {
          id: requestDoc._id.toString(),
          requesterAddress: requestDoc.requesterAddress,
          organizationName: requestDoc.organizationName,
          description: requestDoc.description,
          contactEmail: requestDoc.contactEmail,
          website: requestDoc.website,
          claimTopics: requestDoc.claimTopics,
          status: requestDoc.status,
          createdAt: requestDoc.createdAt || now,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating request:', error);
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
        error: 'Error al crear solicitud', 
        details: error.message,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}

// Obtener solicitudes
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query: any = {};

    if (address) {
      query.requesterAddress = address.toLowerCase();
    }

    if (status) {
      query.status = status;
    }

    // Verificar una vez más que la conexión esté lista antes de hacer la consulta
    if (mongooseInstance.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready. Please try again.');
    }
    
    // Hacer ping antes de la consulta
    await mongooseInstance.connection.db.admin().ping();

    // Usar la conexión directa en lugar del modelo para evitar problemas de buffering
    let requests: any[];
    try {
      const collection = mongooseInstance.connection.db.collection('trustedissuerrequests');
      requests = await collection.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
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
      requests = [];
    }

    // Obtener archivos adjuntos para cada solicitud usando conexión directa
    const requestsWithAttachments = await Promise.all(
      requests.map(async (req: any) => {
        try {
          const attachmentsCollection = mongooseInstance.connection.db.collection('attachments');
          const attachments = await attachmentsCollection.find({
            relatedId: req._id.toString(),
            relatedType: 'trusted-issuer-request',
          }).toArray();

          return {
            ...req,
            attachments: attachments.map((att: any) => ({
              id: att._id.toString(),
              relatedId: att.relatedId,
              relatedType: att.relatedType,
              fileName: att.fileName,
              mimeType: att.mimeType,
              size: att.size,
              filePath: att.filePath,
              uploadedBy: att.uploadedBy,
              description: att.description,
              createdAt: att.createdAt,
            })),
          };
        } catch (attError: any) {
          console.error('Error fetching attachments for request:', req._id, attError);
          return {
            ...req,
            attachments: [],
          };
        }
      })
    );

    return NextResponse.json({ requests: requestsWithAttachments });
  } catch (error: any) {
    console.error('Error fetching requests:', error);
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
        error: 'Error al obtener solicitudes', 
        details: error.message,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}

