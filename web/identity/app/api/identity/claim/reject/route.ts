import { NextResponse } from 'next/server';
import { connectDB, ClaimRequest } from '@/shared';
import { ethers } from 'ethers';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      requestId,
      issuerAddress,
      rejectionReason,
    } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'ID de solicitud requerido' },
        { status: 400 }
      );
    }

    if (!issuerAddress || !ethers.isAddress(issuerAddress)) {
      return NextResponse.json(
        { error: 'Dirección del Trusted Issuer inválida' },
        { status: 400 }
      );
    }

    // Obtener la solicitud
    const claimRequest = await ClaimRequest.findById(requestId);
    
    if (!claimRequest) {
      return NextResponse.json(
        { error: 'Solicitud de claim no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el issuer sea el correcto
    if (claimRequest.issuerAddress.toLowerCase() !== issuerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Solo el Trusted Issuer asignado puede rechazar esta solicitud' },
        { status: 403 }
      );
    }

    // Verificar que esté pendiente
    if (claimRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Esta solicitud ya fue ${claimRequest.status === 'approved' ? 'aprobada' : claimRequest.status === 'rejected' ? 'rechazada' : 'completada'}` },
        { status: 400 }
      );
    }

    // Rechazar la solicitud
    claimRequest.status = 'rejected';
    claimRequest.rejectionReason = rejectionReason || 'Rechazado por el Trusted Issuer';
    claimRequest.reviewedAt = new Date();
    claimRequest.reviewedBy = issuerAddress.toLowerCase();
    await claimRequest.save();

    return NextResponse.json(
      {
        success: true,
        claimRequest: {
          id: claimRequest._id.toString(),
          status: claimRequest.status,
          rejectionReason: claimRequest.rejectionReason,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error rejecting claim request:', error);
    return NextResponse.json(
      { error: 'Error al rechazar solicitud de claim', details: error.message },
      { status: 500 }
    );
  }
}

