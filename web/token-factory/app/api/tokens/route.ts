import { NextResponse } from 'next/server';
import { connectDB, Transaction, Attachment } from '@/shared';

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    // Obtener transacciones de creación de tokens
    const query: any = {
      type: 'token-creation',
      status: 'confirmed',
    };

    if (address) {
      query.contractAddress = address.toLowerCase();
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Obtener archivos adjuntos y metadata para cada token
    const tokensWithMetadata = await Promise.all(
      transactions.map(async (tx) => {
        const attachments = await Attachment.find({
          relatedId: tx.metadata?.tokenAddress || tx.contractAddress,
          relatedType: 'token',
        }).lean();

        return {
          address: tx.metadata?.tokenAddress || tx.contractAddress,
          name: tx.metadata?.tokenName || '',
          symbol: tx.metadata?.tokenSymbol || '',
          description: tx.metadata?.description,
          website: tx.metadata?.website,
          requiredClaimTopics: tx.metadata?.requiredClaimTopics || [],
          createdAt: tx.createdAt,
          attachments,
        };
      })
    );

    return NextResponse.json({ tokens: tokensWithMetadata });
  } catch (error: any) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Error al obtener tokens', details: error.message },
      { status: 500 }
    );
  }
}

