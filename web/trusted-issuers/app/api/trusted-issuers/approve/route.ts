import { NextResponse } from 'next/server';
import { connectDB, TrustedIssuerRequest, Transaction } from '@/shared';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { requestId, txHash, issuerContractAddress, reviewerAddress } = body;

    if (!requestId || !txHash || !issuerContractAddress || !reviewerAddress) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Actualizar solicitud
    const requestDoc = await TrustedIssuerRequest.findById(requestId);
    if (!requestDoc) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    if (requestDoc.status !== 'pending') {
      return NextResponse.json(
        { error: 'La solicitud ya fue procesada' },
        { status: 400 }
      );
    }

    requestDoc.status = 'approved';
    requestDoc.issuerContractAddress = issuerContractAddress.toLowerCase();
    requestDoc.approvalTxHash = txHash;
    requestDoc.reviewedAt = new Date();
    requestDoc.reviewedBy = reviewerAddress.toLowerCase();
    await requestDoc.save();

    // Registrar transacción
    await Transaction.create({
      txHash,
      fromAddress: reviewerAddress.toLowerCase(),
      contractAddress: issuerContractAddress.toLowerCase(),
      type: 'trusted-issuer-approval',
      status: 'pending',
      metadata: {
        issuerAddress: issuerContractAddress.toLowerCase(),
        requestId: requestId.toString(),
      },
    });

    return NextResponse.json({ success: true, request: requestDoc });
  } catch (error: any) {
    console.error('Error approving request:', error);
    return NextResponse.json(
      { error: 'Error al aprobar solicitud', details: error.message },
      { status: 500 }
    );
  }
}

