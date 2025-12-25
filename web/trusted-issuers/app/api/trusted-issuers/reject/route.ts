import { NextResponse } from 'next/server';
import { connectDB, TrustedIssuerRequest } from '@/shared';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { requestId, rejectionReason, reviewerAddress } = body;

    if (!requestId || !reviewerAddress) {
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

    requestDoc.status = 'rejected';
    requestDoc.rejectionReason = rejectionReason || 'Solicitud rechazada';
    requestDoc.reviewedAt = new Date();
    requestDoc.reviewedBy = reviewerAddress.toLowerCase();
    await requestDoc.save();

    return NextResponse.json({ success: true, request: requestDoc });
  } catch (error: any) {
    console.error('Error rejecting request:', error);
    return NextResponse.json(
      { error: 'Error al rechazar solicitud', details: error.message },
      { status: 500 }
    );
  }
}

