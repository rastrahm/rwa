import { NextResponse } from 'next/server';
import { connectDB, Transaction } from '@/shared';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { txHash, fromAddress, identityAddress, topic, issuer } = body;

    if (!txHash || !fromAddress || !identityAddress || !topic || !issuer) {
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
      type: 'identity-claim-remove',
      status: 'pending',
      metadata: {
        identityAddress: identityAddress.toLowerCase(),
        claimTopic: Number(topic),
        claimIssuer: issuer.toLowerCase(),
      },
    });

    return NextResponse.json(
      { success: true, transaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering transaction:', error);
    return NextResponse.json(
      { error: 'Error al registrar transacción', details: error.message },
      { status: 500 }
    );
  }
}

