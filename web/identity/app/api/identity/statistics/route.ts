import { NextResponse } from 'next/server';
import { connectDB, ClaimRequest } from '@/shared';
import mongoose from 'mongoose';

// GET: Obtener estadísticas de identity
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identityAddress = searchParams.get('identityAddress');
    const requesterAddress = searchParams.get('requesterAddress');

    // Conectar a MongoDB
    let mongooseInstance: typeof mongoose;
    try {
      mongooseInstance = await connectDB();
      
      if (mongooseInstance.connection.readyState !== 1) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout esperando conexión a MongoDB'));
          }, 10000);
          
          if (mongooseInstance.connection.readyState === 1) {
            clearTimeout(timeout);
            resolve();
          } else {
            mongooseInstance.connection.once('connected', () => {
              clearTimeout(timeout);
              setTimeout(() => resolve(), 200);
            });
            mongooseInstance.connection.once('error', (err) => {
              clearTimeout(timeout);
              reject(err);
            });
          }
        });
      }
      
      await mongooseInstance.connection.db.admin().ping();
    } catch (dbError: any) {
      console.error('Error connecting to MongoDB:', dbError);
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos', details: dbError.message },
        { status: 503 }
      );
    }
    
    const collection = mongooseInstance.connection.db.collection('claimrequests');
    
    // Construir filtro base
    const filter: any = {};
    if (identityAddress) {
      filter.identityAddress = identityAddress.toLowerCase();
    }
    if (requesterAddress) {
      filter.requesterAddress = requesterAddress.toLowerCase();
    }

    // Obtener todos los claim requests que coincidan con el filtro
    const allRequests = await collection.find(filter).toArray();

    // Estadísticas por estado
    const statusStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    // Estadísticas por topic
    const topicStats: Record<number, number> = {};

    // Estadísticas por issuer
    const issuerStats: Record<string, number> = {};

    // Estadísticas temporales (últimos 30 días)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailyStats: Record<string, { requests: number; completed: number }> = {};

    // Mapeo de topics
    const TOPIC_NAMES: Record<number, string> = {
      1: 'KYC - Know Your Customer',
      2: 'AML - Anti-Money Laundering',
      3: 'PEP - Politically Exposed Person',
      4: 'Sanctions',
      5: 'Geographic',
      6: 'Tax Compliance',
      7: 'Accredited',
      8: 'Risk Assessment',
      9: 'Source of Funds',
      10: 'Storage Verification',
    };

    allRequests.forEach((request: any) => {
      // Estadísticas por estado
      const status = request.status || 'pending';
      statusStats[status as keyof typeof statusStats]++;

      // Estadísticas por topic
      const topic = request.topic;
      if (topic !== undefined) {
        topicStats[topic] = (topicStats[topic] || 0) + 1;
      }

      // Estadísticas por issuer
      const issuer = request.issuerAddress;
      if (issuer) {
        issuerStats[issuer] = (issuerStats[issuer] || 0) + 1;
      }

      // Estadísticas diarias
      const createdAt = new Date(request.createdAt);
      if (createdAt >= thirtyDaysAgo) {
        const dateKey = createdAt.toISOString().split('T')[0];
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = { requests: 0, completed: 0 };
        }
        dailyStats[dateKey].requests++;
        if (status === 'completed') {
          dailyStats[dateKey].completed++;
        }
      }
    });

    // Convertir topicStats a array con nombres
    const topicStatsArray = Object.entries(topicStats).map(([topic, count]) => ({
      topic: Number(topic),
      topicName: TOPIC_NAMES[Number(topic)] || `Topic ${topic}`,
      count,
    })).sort((a, b) => b.count - a.count);

    // Convertir issuerStats a array (top 10)
    const issuerStatsArray = Object.entries(issuerStats)
      .map(([issuer, count]) => ({ issuer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Convertir dailyStats a array ordenado
    const dailyStatsArray = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calcular estadísticas generales
    const totalRequests = allRequests.length;
    const completionRate = totalRequests > 0 
      ? (statusStats.completed / totalRequests) * 100 
      : 0;
    const approvalRate = totalRequests > 0 
      ? ((statusStats.approved + statusStats.completed) / totalRequests) * 100 
      : 0;
    const rejectionRate = totalRequests > 0 
      ? (statusStats.rejected / totalRequests) * 100 
      : 0;

    return NextResponse.json(
      {
        success: true,
        statistics: {
          overview: {
            totalRequests,
            completionRate: Math.round(completionRate * 100) / 100,
            approvalRate: Math.round(approvalRate * 100) / 100,
            rejectionRate: Math.round(rejectionRate * 100) / 100,
          },
          statusDistribution: statusStats,
          topicDistribution: topicStatsArray,
          issuerDistribution: issuerStatsArray,
          dailyActivity: dailyStatsArray,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos. Verifica que MongoDB esté corriendo.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al obtener estadísticas', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

