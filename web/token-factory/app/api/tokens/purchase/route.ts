import { NextResponse } from 'next/server';
import { connectDB, Transaction } from '@/shared';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { txHash, fromAddress, tokenAddress, tokenAmount, paymentAmount } = body;

    if (!txHash || !fromAddress || !tokenAddress || !tokenAmount) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Registrar transacción de compra
    const transaction = await Transaction.create({
      txHash,
      fromAddress: fromAddress.toLowerCase(),
      contractAddress: tokenAddress.toLowerCase(),
      type: 'token-purchase',
      status: 'pending',
      metadata: {
        tokenAddress: tokenAddress.toLowerCase(),
        tokenAmount: tokenAmount.toString(),
        paymentAmount: paymentAmount?.toString() || '0',
      },
    });

    return NextResponse.json(
      { success: true, transaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering purchase:', error);
    return NextResponse.json(
      { error: 'Error al registrar compra', details: error.message },
      { status: 500 }
    );
  }
}

