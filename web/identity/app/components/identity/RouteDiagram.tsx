'use client';

import React, { useState } from 'react';

interface Route {
  path: string;
  method: string;
  description: string;
  params?: string[];
  body?: string[];
  response?: string;
  color: string;
}

const routes: Route[] = [
  {
    path: '/api/identity/register',
    method: 'POST',
    description: 'Registrar transacción de registro de identidad',
    body: ['txHash', 'fromAddress', 'identityAddress'],
    response: 'Transaction registrada',
    color: 'blue',
  },
  {
    path: '/api/identity/deploy',
    method: 'POST',
    description: 'Desplegar contrato Identity en blockchain',
    body: ['owner'],
    response: 'identityAddress, txHash',
    color: 'purple',
  },
  {
    path: '/api/identity/claims',
    method: 'GET',
    description: 'Obtener claims completados de un Identity',
    params: ['identityAddress'],
    response: 'Lista de claims completados',
    color: 'green',
  },
  {
    path: '/api/identity/statistics',
    method: 'GET',
    description: 'Obtener estadísticas y análisis',
    params: ['identityAddress?', 'requesterAddress?'],
    response: 'Estadísticas agregadas',
    color: 'yellow',
  },
  {
    path: '/api/identity/claim/request',
    method: 'POST',
    description: 'Crear solicitud de claim',
    body: ['requesterAddress', 'identityAddress', 'topic', 'scheme', 'issuerAddress', 'dataText?', 'uri?'],
    response: 'ClaimRequest creada',
    color: 'indigo',
  },
  {
    path: '/api/identity/claim/request',
    method: 'GET',
    description: 'Obtener solicitudes de claims',
    params: ['requesterAddress?', 'issuerAddress?', 'status?'],
    response: 'Lista de solicitudes',
    color: 'indigo',
  },
  {
    path: '/api/identity/claim/approve',
    method: 'POST',
    description: 'Aprobar solicitud y agregar claim a blockchain',
    body: ['requestId', 'issuerAddress', 'signature?', 'issuerNotes?'],
    response: 'Claim agregado, status: completed',
    color: 'green',
  },
  {
    path: '/api/identity/claim/reject',
    method: 'POST',
    description: 'Rechazar solicitud de claim',
    body: ['requestId', 'issuerAddress', 'rejectionReason?'],
    response: 'Status: rejected',
    color: 'red',
  },
  {
    path: '/api/identity/claim/add',
    method: 'POST',
    description: 'Agregar claim directamente a blockchain',
    body: ['identityAddress', 'topic', 'scheme', 'issuer', 'signature', 'data', 'uri'],
    response: 'Claim agregado',
    color: 'teal',
  },
  {
    path: '/api/identity/claim/remove',
    method: 'POST',
    description: 'Remover claim de blockchain',
    body: ['identityAddress', 'topic', 'issuer'],
    response: 'Claim removido',
    color: 'orange',
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  POST: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const routeColors: Record<string, string> = {
  blue: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20',
  purple: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20',
  green: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20',
  yellow: 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
  indigo: 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20',
  red: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
  teal: 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20',
  orange: 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20',
};

export function RouteDiagram() {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [filterMethod, setFilterMethod] = useState<string>('ALL');

  const filteredRoutes = filterMethod === 'ALL' 
    ? routes 
    : routes.filter(r => r.method === filterMethod);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          🗺️ Mapa de Rutas API - Identity Module
        </h3>
        
        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterMethod('ALL')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              filterMethod === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterMethod('GET')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              filterMethod === 'GET'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            GET
          </button>
          <button
            onClick={() => setFilterMethod('POST')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              filterMethod === 'POST'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            POST
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {filteredRoutes.map((route, index) => (
          <div
            key={`${route.method}-${route.path}-${index}`}
            onClick={() => setSelectedRoute(route)}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedRoute?.path === route.path && selectedRoute?.method === route.method
                ? 'ring-2 ring-blue-500'
                : 'hover:shadow-md'
            } ${routeColors[route.color]}`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className={`px-2 py-1 rounded text-xs font-bold ${methodColors[route.method]}`}>
                {route.method}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {route.path.split('/').pop()}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {route.path}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {route.description}
            </p>
          </div>
        ))}
      </div>

      {/* Detalles de la ruta seleccionada */}
      {selectedRoute && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
          <h4 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
            Detalles de la Ruta
          </h4>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Método:
              </span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${methodColors[selectedRoute.method]}`}>
                {selectedRoute.method}
              </span>
            </div>
            
            <div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Ruta:
              </span>
              <code className="ml-2 text-sm font-mono text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                {selectedRoute.path}
              </code>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Descripción:
              </span>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {selectedRoute.description}
              </p>
            </div>

            {selectedRoute.params && selectedRoute.params.length > 0 && (
              <div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Query Parameters:
                </span>
                <ul className="mt-1 space-y-1">
                  {selectedRoute.params.map((param, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                      <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">
                        {param}
                      </code>
                      {param.endsWith('?') && (
                        <span className="ml-1 text-xs text-gray-500">(opcional)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedRoute.body && selectedRoute.body.length > 0 && (
              <div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Body Parameters:
                </span>
                <ul className="mt-1 space-y-1">
                  {selectedRoute.body.map((param, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                      <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">
                        {param}
                      </code>
                      {param.endsWith('?') && (
                        <span className="ml-1 text-xs text-gray-500">(opcional)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedRoute.response && (
              <div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Respuesta:
                </span>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedRoute.response}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diagrama Visual Explicativo */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
        <h4 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
          📊 Diagrama de Flujo del Sistema
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Visualización del flujo completo desde la creación de una solicitud hasta la obtención de claims
        </p>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-lg p-6 overflow-x-auto border border-gray-200 dark:border-gray-600">
          <div className="min-w-[800px]">
            {/* Usuario */}
            <div className="flex justify-center mb-8">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 border-2 border-blue-400 dark:border-blue-600">
                <div className="text-center">
                  <div className="text-2xl mb-2">👤</div>
                  <p className="font-bold text-blue-900 dark:text-blue-100">Usuario</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Wallet Address</p>
                </div>
              </div>
            </div>

            {/* Flecha hacia abajo */}
            <div className="flex justify-center mb-4">
              <div className="w-1 h-12 bg-blue-400 dark:bg-blue-600"></div>
            </div>

            {/* Paso 1: Crear Solicitud */}
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-lg p-4 border-2 border-indigo-400 dark:border-indigo-600 max-w-md">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-bold">POST</span>
                </div>
                <p className="font-semibold text-indigo-900 dark:text-indigo-100 text-sm">
                  /api/identity/claim/request
                </p>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                  Crear solicitud de claim
                </p>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <p>Body: requesterAddress, identityAddress, topic, issuerAddress</p>
                </div>
              </div>
            </div>

            {/* Flecha hacia MongoDB */}
            <div className="flex justify-center mb-4">
              <svg className="w-64 h-16" viewBox="0 0 256 64">
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
                  </marker>
                </defs>
                <line x1="0" y1="32" x2="200" y2="32" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="100" y="24" textAnchor="middle" className="text-xs fill-gray-600 dark:fill-gray-400">
                  Guarda en MongoDB
                </text>
              </svg>
            </div>

            {/* MongoDB */}
            <div className="flex justify-center mb-8">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 border-2 border-green-400 dark:border-green-600">
                <div className="text-center">
                  <div className="text-2xl mb-2">🗄️</div>
                  <p className="font-bold text-green-900 dark:text-green-100">MongoDB</p>
                  <p className="text-xs text-green-700 dark:text-green-300">Colección: claimrequests</p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">Status: pending</p>
                </div>
              </div>
            </div>

            {/* Flecha hacia Trusted Issuer */}
            <div className="flex justify-center mb-4">
              <svg className="w-64 h-16" viewBox="0 0 256 64">
                <defs>
                  <marker id="arrowhead2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
                  </marker>
                </defs>
                <line x1="0" y1="32" x2="200" y2="32" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowhead2)" />
                <text x="100" y="24" textAnchor="middle" className="text-xs fill-gray-600 dark:fill-gray-400">
                  Notificación
                </text>
              </svg>
            </div>

            {/* Trusted Issuer */}
            <div className="flex justify-center mb-8">
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 border-2 border-purple-400 dark:border-purple-600">
                <div className="text-center">
                  <div className="text-2xl mb-2">🏛️</div>
                  <p className="font-bold text-purple-900 dark:text-purple-100">Trusted Issuer</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">Revisa solicitudes</p>
                </div>
              </div>
            </div>

            {/* Dos opciones: Aprobar o Rechazar */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Aprobar */}
              <div className="flex flex-col items-center">
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 border-2 border-green-400 dark:border-green-600 w-full">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2a</span>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-bold">POST</span>
                  </div>
                  <p className="font-semibold text-green-900 dark:text-green-100 text-sm">
                    /api/identity/claim/approve
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Aprobar y agregar a blockchain
                  </p>
                </div>
                
                {/* Flecha hacia blockchain */}
                <div className="mt-4 flex justify-center">
                  <svg className="w-32 h-16" viewBox="0 0 128 64">
                    <defs>
                      <marker id="arrowhead3" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
                      </marker>
                    </defs>
                    <line x1="0" y1="32" x2="100" y2="32" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowhead3)" />
                  </svg>
                </div>

                {/* Blockchain */}
                <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3 border-2 border-yellow-400 dark:border-yellow-600 mt-4 w-full">
                  <div className="text-center">
                    <div className="text-xl mb-1">⛓️</div>
                    <p className="font-bold text-yellow-900 dark:text-yellow-100 text-xs">Blockchain</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">Contrato Identity</p>
                  </div>
                </div>
              </div>

              {/* Rechazar */}
              <div className="flex flex-col items-center">
                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4 border-2 border-red-400 dark:border-red-600 w-full">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2b</span>
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs font-bold">POST</span>
                  </div>
                  <p className="font-semibold text-red-900 dark:text-red-100 text-sm">
                    /api/identity/claim/reject
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Rechazar solicitud
                  </p>
                </div>
                
                {/* Flecha hacia MongoDB */}
                <div className="mt-4 flex justify-center">
                  <svg className="w-32 h-16" viewBox="0 0 128 64">
                    <defs>
                      <marker id="arrowhead4" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
                      </marker>
                    </defs>
                    <line x1="0" y1="32" x2="100" y2="32" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead4)" />
                  </svg>
                </div>

                {/* MongoDB actualizado */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 border-2 border-gray-400 dark:border-gray-600 mt-4 w-full">
                  <div className="text-center">
                    <div className="text-xl mb-1">🗄️</div>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-xs">MongoDB</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">Status: rejected</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Flecha de vuelta al usuario */}
            <div className="flex justify-center mb-4">
              <svg className="w-64 h-16" viewBox="0 0 256 64">
                <defs>
                  <marker id="arrowhead5" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                  </marker>
                </defs>
                <line x1="0" y1="32" x2="200" y2="32" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowhead5)" />
                <text x="100" y="24" textAnchor="middle" className="text-xs fill-gray-600 dark:fill-gray-400">
                  Consultar claims
                </text>
              </svg>
            </div>

            {/* Paso 3: Consultar Claims */}
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 border-2 border-blue-400 dark:border-blue-600 max-w-md">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-bold">GET</span>
                </div>
                <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                  /api/identity/claims
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Obtener claims completados
                </p>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <p>Query: identityAddress</p>
                </div>
              </div>
            </div>

            {/* Flecha final */}
            <div className="flex justify-center">
              <div className="w-1 h-12 bg-blue-400 dark:bg-blue-600"></div>
            </div>

            {/* Resultado final */}
            <div className="flex justify-center mt-4">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 border-2 border-green-400 dark:border-green-600">
                <div className="text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <p className="font-bold text-green-900 dark:text-green-100">Claims Obtenidos</p>
                  <p className="text-xs text-green-700 dark:text-green-300">Lista de claims completados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flujo de trabajo */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
        <h4 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
          🔄 Flujo de Trabajo Principal
        </h4>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  POST /api/identity/claim/request
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Usuario crea solicitud de claim (status: pending)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  POST /api/identity/claim/approve
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Trusted Issuer aprueba y agrega claim a blockchain (status: completed)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  GET /api/identity/claims
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Usuario consulta claims completados
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

