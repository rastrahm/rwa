import { NextResponse } from 'next/server';
import { findDocuments } from '@/app/lib/utils/mongodb';

export async function GET(request: Request) {
  try {
    console.log('🔍 Iniciando carga de tokens desde MongoDB...');

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    // Obtener transacciones de creación de tokens
    // Incluir tanto 'confirmed' como 'pending' para obtener todos los tokens
    const query: any = {
      type: 'token-creation',
      status: { $in: ['confirmed', 'pending'] },
    };

    if (address) {
      query.contractAddress = address.toLowerCase();
    }

    console.log('📋 Consultando transacciones con query:', JSON.stringify(query, null, 2));
    
    // Usar utilidad centralizada para consultar MongoDB
    const transactions = await findDocuments('transactions', query, {
      sort: { createdAt: -1 },
      limit: 100,
    });
    
    console.log(`✅ Encontradas ${transactions.length} transacciones`);

    // Obtener archivos adjuntos y metadata para cada token
    const tokensWithMetadata = await Promise.all(
      transactions.map(async (tx) => {
        try {
          const tokenAddress = tx.metadata?.tokenAddress || tx.contractAddress;
          
          // Obtener attachments usando utilidad centralizada
          let attachments: any[] = [];
          try {
            if (tokenAddress) {
              attachments = await findDocuments('attachments', {
                relatedId: tokenAddress.toLowerCase(),
                relatedType: 'token',
              });
            }
          } catch (attachmentsError) {
            console.warn(`Error obteniendo attachments para token ${tokenAddress}:`, attachmentsError);
            attachments = [];
          }

          return {
            address: tokenAddress,
            name: tx.metadata?.tokenName || '',
            symbol: tx.metadata?.tokenSymbol || '',
            description: tx.metadata?.description,
            website: tx.metadata?.website,
            price: tx.metadata?.price,
            maxSupply: tx.metadata?.maxSupply,
            requiredClaimTopics: tx.metadata?.requiredClaimTopics || [],
            admin: tx.metadata?.admin, // Incluir admin (creador del token)
            createdAt: tx.createdAt,
            attachments,
          };
        } catch (err: any) {
          console.error(`Error procesando transacción ${tx._id}:`, err);
          // Retornar un objeto básico si hay error
          return {
            address: tx.metadata?.tokenAddress || tx.contractAddress || '',
            name: tx.metadata?.tokenName || '',
            symbol: tx.metadata?.tokenSymbol || '',
            description: tx.metadata?.description,
            website: tx.metadata?.website,
            price: tx.metadata?.price,
            maxSupply: tx.metadata?.maxSupply,
            requiredClaimTopics: tx.metadata?.requiredClaimTopics || [],
            admin: tx.metadata?.admin, // Incluir admin (creador del token)
            createdAt: tx.createdAt,
            attachments: [],
          };
        }
      })
    );

    console.log(`✅ Retornando ${tokensWithMetadata.length} tokens`);
    
    return NextResponse.json({ tokens: tokensWithMetadata });
  } catch (error: any) {
    console.error('❌ Error fetching tokens:', error);
    console.error('Stack trace:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
    });
    
    // Verificar si es un error de MongoDB (ya manejado por withMongoDBConnection)
    if (error.message?.includes('MongoDB') || error.message?.includes('conexión')) {
      return NextResponse.json(
        { error: error.message || 'Error de conexión a la base de datos. Verifica que MongoDB esté corriendo.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al obtener tokens', 
        details: error.message,
        errorType: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

