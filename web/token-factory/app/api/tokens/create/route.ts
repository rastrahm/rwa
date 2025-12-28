import { NextResponse } from 'next/server';
import { insertDocument } from '@/app/lib/utils/mongodb';

export async function POST(request: Request) {
  try {
    console.log('📝 Iniciando registro de token en MongoDB...');

    const formData = await request.formData();
    const data = JSON.parse(formData.get('data') as string);
    const files = formData.getAll('files') as File[];

    const {
      txHash,
      fromAddress,
      tokenAddress,
      name,
      symbol,
      maxSupply,
      price,
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

    // Log para debugging
    console.log('Creating token with metadata:', {
      tokenAddress,
      name,
      symbol,
      price,
      maxSupply,
      priceType: typeof price,
      priceValue: price,
    });

    // Preparar metadata
    const metadata: any = {
      tokenAddress: tokenAddress.toLowerCase(),
      tokenName: name,
      tokenSymbol: symbol,
      admin: fromAddress.toLowerCase(), // El creador es el admin
    };

    // Agregar campos opcionales solo si tienen valor
    if (maxSupply && maxSupply.trim()) {
      metadata.maxSupply = maxSupply.trim();
    }
    if (price && price.trim()) {
      metadata.price = price.trim();
    }
    if (description && description.trim()) {
      metadata.description = description.trim();
    }
    if (website && website.trim()) {
      metadata.website = website.trim();
    }
    if (requiredClaimTopics && Array.isArray(requiredClaimTopics)) {
      metadata.requiredClaimTopics = requiredClaimTopics;
    }

    // Registrar transacción en MongoDB usando utilidad centralizada
    console.log('💾 Creando registro en MongoDB:', {
      txHash,
      tokenAddress: tokenAddress.toLowerCase(),
      name,
      symbol,
    });
    
    const transactionData = {
      txHash,
      fromAddress: fromAddress.toLowerCase(),
      contractAddress: tokenAddress.toLowerCase(),
      type: 'token-creation',
      status: 'pending',
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const transaction = await insertDocument('transactions', transactionData);
    console.log('✅ Token registrado en MongoDB con ID:', transaction._id);

    // Guardar archivos adjuntos si existen
    for (const file of files) {
      if (file.size > 0) {
        try {
          const filePath = `/uploads/tokens/${tokenAddress}/${file.name}`;
          
          await insertDocument('attachments', {
            relatedId: tokenAddress.toLowerCase(),
            relatedType: 'token',
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            filePath,
            uploadedBy: fromAddress.toLowerCase(),
            description: `Archivo adjunto para token ${name} (${symbol})`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (fileError: any) {
          console.error('Error guardando archivo adjunto:', fileError);
          // Continuar con el siguiente archivo en lugar de fallar completamente
        }
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

