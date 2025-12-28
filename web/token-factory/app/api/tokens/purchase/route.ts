import { NextResponse } from 'next/server';
import { insertDocument } from '@/app/lib/utils/mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { txHash, fromAddress, tokenAddress, tokenAmount, paymentAmount, paymentCurrency } = body;

    if (!txHash || !fromAddress || !tokenAddress || !tokenAmount) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Registrar transacción de compra usando utilidad centralizada
    const transactionData = {
      txHash,
      fromAddress: fromAddress.toLowerCase(),
      contractAddress: tokenAddress.toLowerCase(),
      type: 'token-purchase',
      status: 'pending',
      metadata: {
        tokenAddress: tokenAddress.toLowerCase(),
        tokenAmount: tokenAmount.toString(),
        paymentAmount: paymentAmount?.toString() || '0',
        paymentCurrency: paymentCurrency || 'ETH',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const transaction = await insertDocument('transactions', transactionData);

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

