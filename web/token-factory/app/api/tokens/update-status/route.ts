import { NextResponse } from 'next/server';
import { updateDocument } from '@/app/lib/utils/mongodb';

export async function POST(request: Request) {
  try {
    const { txHash, status, blockNumber } = await request.json();

    if (!txHash || !status) {
      return NextResponse.json(
        { error: 'txHash y status son requeridos' },
        { status: 400 }
      );
    }

    if (!['pending', 'confirmed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido. Debe ser: pending, confirmed o failed' },
        { status: 400 }
      );
    }

    console.log('🔄 Actualizando estado de transacción:', { txHash, status, blockNumber });

    const updateData: any = {
      $set: {
        status,
        updatedAt: new Date(),
      },
    };

    if (blockNumber) {
      updateData.$set.blockNumber = blockNumber;
    }

    const result = await updateDocument(
      'transactions',
      { txHash: txHash.toLowerCase() },
      updateData
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Transacción no encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Estado de transacción actualizado:', { txHash, status });

    return NextResponse.json({
      success: true,
      message: 'Estado de transacción actualizado',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('Error updating transaction status:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado de transacción', details: error.message },
      { status: 500 }
    );
  }
}

