'use client';

import React from 'react';
import { useTrustedIssuersRegistry } from '@/app/hooks/useTrustedIssuersRegistry';
import { CLAIM_TOPICS } from '@/app/lib/types/trusted-issuers';

export function TrustedIssuersList() {
  const { trustedIssuers, loading, error } = useTrustedIssuersRegistry();

  const getTopicName = (topicId: bigint) => {
    const topic = CLAIM_TOPICS.find((t) => t.id === Number(topicId));
    return topic ? topic.name : `Topic ${topicId}`;
  };

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Trusted Issuers Registrados
      </h3>

      {trustedIssuers.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No hay trusted issuers registrados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trustedIssuers.map((issuer) => (
            <div
              key={issuer.address}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección
                </label>
                <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                  {issuer.address}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Claim Topics Permitidos
                </label>
                <div className="flex flex-wrap gap-2">
                  {issuer.claimTopics.length === 0 ? (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Ninguno
                    </span>
                  ) : (
                    issuer.claimTopics.map((topic) => (
                      <span
                        key={topic.toString()}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {getTopicName(topic)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

