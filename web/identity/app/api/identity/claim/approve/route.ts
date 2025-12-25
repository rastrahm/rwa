import { NextResponse } from 'next/server';
import { connectDB, ClaimRequest } from '@/shared';
import { ethers } from 'ethers';
import { env } from '@/shared/lib/env';
import { IDENTITY_ABI } from '@/app/lib/contracts/abis';

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
    await connectDB();

    const body = await request.json();
    const {
      requestId,
      issuerAddress, // Dirección del Trusted Issuer que aprueba
      signature, // Firma del claim (opcional, puede generarse)
      issuerNotes, // Notas del issuer
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
        { error: 'Solo el Trusted Issuer asignado puede aprobar esta solicitud' },
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

    // Verificar que el issuer tenga PRIVATE_KEY configurada (para firmar transacciones)
    if (!env.PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'PRIVATE_KEY no configurada. El Trusted Issuer necesita una clave privada para agregar claims.' },
        { status: 500 }
      );
    }

    // Preparar datos del claim
    const finalSignature = signature || claimRequest.signature || '0x';
    const finalDataHex = claimRequest.dataHex || (claimRequest.dataText ? textToHex(claimRequest.dataText) : '0x');
    const finalUri = claimRequest.uri || '';

    // Crear provider y wallet del issuer
    const provider = new ethers.JsonRpcProvider(env.RPC_URL);
    const issuerWallet = new ethers.Wallet(env.PRIVATE_KEY, provider);

    // Verificar que el wallet del issuer coincida con la dirección del issuer
    // Nota: En producción, esto debería validarse de otra manera
    // Por ahora, asumimos que PRIVATE_KEY corresponde al issuer
    console.log('🔐 Trusted Issuer aprobando claim:', {
      requestId,
      issuerAddress,
      identityAddress: claimRequest.identityAddress,
      topic: claimRequest.topic,
    });

    // Obtener el contrato Identity
    const identity = new ethers.Contract(
      claimRequest.identityAddress,
      IDENTITY_ABI,
      issuerWallet
    );

    // Agregar el claim al Identity Contract usando addClaimByIssuer
    // Esta función permite que el Trusted Issuer agregue claims sin ser owner
    console.log('📝 Agregando claim al Identity Contract como Trusted Issuer...');
    const tx = await identity.addClaimByIssuer(
      BigInt(claimRequest.topic),
      BigInt(claimRequest.scheme),
      claimRequest.issuerAddress,
      finalSignature,
      finalDataHex,
      finalUri
    );
    
    console.log('⏳ Esperando confirmación...');
    await tx.wait();
    console.log('✅ Claim agregado exitosamente');

    // Actualizar la solicitud
    claimRequest.status = 'completed';
    claimRequest.claimTxHash = tx.hash;
    claimRequest.reviewedAt = new Date();
    claimRequest.reviewedBy = issuerAddress.toLowerCase();
    claimRequest.signature = finalSignature;
    claimRequest.issuerNotes = issuerNotes;
    await claimRequest.save();

    return NextResponse.json(
      {
        success: true,
        claimRequest: {
          id: claimRequest._id.toString(),
          status: claimRequest.status,
          claimTxHash: claimRequest.claimTxHash,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error approving claim request:', error);
    
    // Si el error es que el issuer no es owner, proporcionar mensaje claro
    if (error.message?.includes('onlyOwner') || error.message?.includes('OwnableUnauthorizedAccount')) {
      return NextResponse.json(
        { 
          error: 'El Trusted Issuer no tiene permisos para agregar claims a este Identity Contract. El owner del contrato debe agregar el claim manualmente o delegar permisos.',
          details: 'En producción, se debe implementar un sistema de delegación de permisos o el owner debe ejecutar la transacción.'
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al aprobar solicitud de claim', details: error.message },
      { status: 500 }
    );
  }
}

