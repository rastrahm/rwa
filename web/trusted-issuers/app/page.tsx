'use client';

import React from 'react';
import { ClaimTopicsList } from '@/app/components/trusted-issuers/ClaimTopicsList';
import { TrustedIssuersList } from '@/app/components/trusted-issuers/TrustedIssuersList';
import { RequestTrustedIssuer } from '@/app/components/trusted-issuers/RequestTrustedIssuer';
import { AddTrustedIssuer } from '@/app/components/trusted-issuers/AddTrustedIssuer';
import { ApproveTrustedIssuerRequests } from '@/app/components/trusted-issuers/ApproveTrustedIssuerRequests';
import { ApproveClaimRequests } from '@/app/components/trusted-issuers/ApproveClaimRequests';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white transition-colors duration-200">
        Gestión de Trusted Issuers
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-8 transition-colors duration-200">
        Gestiona los emisores confiables y sus claim topics asociados.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Columna izquierda: Claim Topics y Solicitudes */}
        <div className="space-y-6">
          <ClaimTopicsList />
          <RequestTrustedIssuer />
        </div>

        {/* Columna derecha: Trusted Issuers y Gestión */}
        <div className="space-y-6">
          <TrustedIssuersList />
          <AddTrustedIssuer />
          <ApproveTrustedIssuerRequests />
          <ApproveClaimRequests />
        </div>
      </div>
    </div>
  );
}
