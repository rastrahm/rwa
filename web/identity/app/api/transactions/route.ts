import { NextResponse } from 'next/server';
import { connectDB, Transaction } from '@/shared';

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query: any = {};

    if (address) {
      query.fromAddress = address.toLowerCase();
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Error al obtener transacciones', details: error.message },
      { status: 500 }
    );
  }
}

