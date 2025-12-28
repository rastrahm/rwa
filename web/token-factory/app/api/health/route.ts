/**
 * Endpoint de health check para verificar el estado de las conexiones
 * GET /api/health
 */

import { NextResponse } from 'next/server';
import { healthCheck } from '@/app/lib/config/connections';

export async function GET() {
  try {
    const health = await healthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error: any) {
    console.error('❌ Error en health check:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        mongodb: false,
        anvil: false,
        error: error.message || 'Error desconocido',
      },
      { status: 503 }
    );
  }
}

