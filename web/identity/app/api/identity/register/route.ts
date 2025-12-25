import { NextResponse } from 'next/server';
import { connectDB, Transaction } from '@/shared';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { txHash, fromAddress, identityAddress } = body;

    if (!txHash || !fromAddress || !identityAddress) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Registrar transacción en MongoDB
    const transaction = await Transaction.create({
      txHash,
      fromAddress: fromAddress.toLowerCase(),
      contractAddress: identityAddress.toLowerCase(),
      type: 'identity-registration',
      status: 'pending',
      metadata: {
        identityAddress: identityAddress.toLowerCase(),
      },
    });

    return NextResponse.json(
      { success: true, transaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering transaction:', error);
    
    // Detectar si el error es por MongoDB no disponible
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('MongooseServerSelectionError')) {
      return NextResponse.json(
        { 
          error: 'MongoDB no está disponible', 
          details: 'Por favor, inicia MongoDB con: sudo systemctl start mongod o mongod',
          message: 'La transacción en blockchain se completó, pero no se pudo guardar en la base de datos.'
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { error: 'Error al registrar transacción', details: error.message },
      { status: 500 }
    );
  }
}

