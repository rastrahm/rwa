'use client';

import React from 'react';
import { CLAIM_TOPICS } from '@/app/lib/types/trusted-issuers';
import { useClaimTopicsRegistry } from '@/app/hooks/useClaimTopicsRegistry';

export function ClaimTopicsList() {
  const { claimTopics, loading, error } = useClaimTopicsRegistry();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  // Crear un Set de topics registrados para búsqueda rápida
  const registeredTopicsSet = new Set(
    claimTopics.map((t) => Number(t))
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Claim Topics Disponibles
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Lista de todos los claim topics posibles según el estándar ERC-3643.
      </p>

      <div className="space-y-3">
        {CLAIM_TOPICS.map((topic) => {
          const isRegistered = registeredTopicsSet.has(topic.id);
          return (
            <div
              key={topic.id}
              className={`border rounded-lg p-4 ${
                isRegistered
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {topic.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {topic.id}
                    </span>
                    {isRegistered && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Registrado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {topic.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Uso común: {topic.commonUse}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

