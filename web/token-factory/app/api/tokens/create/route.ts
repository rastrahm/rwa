import { NextResponse } from 'next/server';
import { connectDB, Transaction, Attachment } from '@/shared';

export async function POST(request: Request) {
  try {
    await connectDB();

    const formData = await request.formData();
    const data = JSON.parse(formData.get('data') as string);
    const files = formData.getAll('files') as File[];

    const {
      txHash,
      fromAddress,
      tokenAddress,
      name,
      symbol,
      description,
      website,
      requiredClaimTopics,
    } = data;

    if (!txHash || !fromAddress || !tokenAddress || !name || !symbol) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Registrar transacción en MongoDB
    const transaction = await Transaction.create({
      txHash,
      fromAddress: fromAddress.toLowerCase(),
      contractAddress: tokenAddress.toLowerCase(),
      type: 'token-creation',
      status: 'pending',
      metadata: {
        tokenAddress: tokenAddress.toLowerCase(),
        tokenName: name,
        tokenSymbol: symbol,
        description,
        website,
        requiredClaimTopics: requiredClaimTopics || [],
      },
    });

    // Guardar archivos adjuntos si existen
    for (const file of files) {
      if (file.size > 0) {
        const filePath = `/uploads/tokens/${tokenAddress}/${file.name}`;
        
        await Attachment.create({
          relatedId: tokenAddress.toLowerCase(),
          relatedType: 'token',
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          filePath,
          uploadedBy: fromAddress.toLowerCase(),
          description: `Archivo adjunto para token ${name} (${symbol})`,
        });
      }
    }

    return NextResponse.json(
      { success: true, transaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating token record:', error);
    return NextResponse.json(
      { error: 'Error al registrar token', details: error.message },
      { status: 500 }
    );
  }
}

