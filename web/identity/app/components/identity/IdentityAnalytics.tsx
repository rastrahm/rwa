'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/app/hooks/useWallet';
import { useIdentityRegistry } from '@/app/hooks/useIdentityRegistry';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Statistics {
  overview: {
    totalRequests: number;
    completionRate: number;
    approvalRate: number;
    rejectionRate: number;
  };
  statusDistribution: {
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  topicDistribution: Array<{
    topic: number;
    topicName: string;
    count: number;
  }>;
  issuerDistribution: Array<{
    issuer: string;
    count: number;
  }>;
  dailyActivity: Array<{
    date: string;
    requests: number;
    completed: number;
  }>;
}

const COLORS = {
  pending: '#fbbf24',
  approved: '#3b82f6',
  rejected: '#ef4444',
  completed: '#10b981',
};

const TOPIC_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#6366f1',
  '#f97316',
  '#84cc16',
  '#14b8a6',
];

export function IdentityAnalytics() {
  const { wallet } = useWallet();
  const { identityAddress } = useIdentityRegistry();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (identityAddress) {
        params.append('identityAddress', identityAddress);
      }
      if (wallet?.address) {
        params.append('requesterAddress', wallet.address);
      }

      const response = await fetch(`/api/identity/statistics?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 503) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || 'Error de conexión a la base de datos');
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.statistics) {
        setStatistics(data.statistics);
      } else {
        throw new Error('Formato de datos inválido');
      }
    } catch (err: any) {
      console.error('Error loading statistics:', err);
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
    // Recargar cada 30 segundos
    const interval = setInterval(loadStatistics, 30000);
    return () => clearInterval(interval);
  }, [identityAddress, wallet?.address]);

  if (loading && !statistics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Análisis y Estadísticas
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !statistics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Análisis y Estadísticas
        </h3>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={loadStatistics}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  // Preparar datos para gráfico de estados
  const statusData = [
    { name: 'Pendientes', value: statistics.statusDistribution.pending, color: COLORS.pending },
    { name: 'Aprobados', value: statistics.statusDistribution.approved, color: COLORS.approved },
    { name: 'Rechazados', value: statistics.statusDistribution.rejected, color: COLORS.rejected },
    { name: 'Completados', value: statistics.statusDistribution.completed, color: COLORS.completed },
  ].filter(item => item.value > 0);

  // Preparar datos para gráfico de topics (top 5)
  const topTopics = statistics.topicDistribution.slice(0, 5);

  // Preparar datos para gráfico de actividad diaria
  const dailyData = statistics.dailyActivity.map(item => ({
    ...item,
    dateLabel: new Date(item.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Análisis y Estadísticas
        </h3>
        <button
          onClick={loadStatistics}
          disabled={loading}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Estadísticas generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Solicitudes</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {statistics.overview.totalRequests}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">Tasa de Completación</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {statistics.overview.completionRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Tasa de Aprobación</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {statistics.overview.approvalRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">Tasa de Rechazo</p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
            {statistics.overview.rejectionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de distribución por estado */}
        {statusData.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Distribución por Estado
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de distribución por topic */}
        {topTopics.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Top 5 Topics
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topTopics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="topicName" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Gráfico de actividad diaria */}
      {dailyData.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Actividad Diaria (Últimos 30 días)
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dateLabel" 
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 10 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="requests" 
                stroke="#3b82f6" 
                name="Solicitudes"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#10b981" 
                name="Completadas"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Issuers */}
      {statistics.issuerDistribution.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Top 10 Trusted Issuers
          </h4>
          <div className="space-y-2">
            {statistics.issuerDistribution.map((item, index) => (
              <div
                key={item.issuer}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    #{index + 1}
                  </span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                    {item.issuer.slice(0, 10)}...{item.issuer.slice(-8)}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {item.count} {item.count === 1 ? 'claim' : 'claims'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {statistics.overview.totalRequests === 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No hay datos disponibles para mostrar. Crea algunas solicitudes de claims para ver estadísticas.
          </p>
        </div>
      )}
    </div>
  );
}

