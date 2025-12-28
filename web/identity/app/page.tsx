'use client';

import React from 'react';
import { IdentityCard } from '@/app/components/identity/IdentityCard';
import { RegisterIdentity } from '@/app/components/identity/RegisterIdentity';
import { ClaimsList } from '@/app/components/identity/ClaimsList';
import { RequestClaim } from '@/app/components/identity/RequestClaim';
import { ClaimRequestsList } from '@/app/components/identity/ClaimRequestsList';
import { ConfigureIdentityTrustedIssuersRegistry } from '@/app/components/identity/ConfigureIdentityTrustedIssuersRegistry';
import { IdentityAnalytics } from '@/app/components/identity/IdentityAnalytics';
import { RouteDiagram } from '@/app/components/identity/RouteDiagram';
import { useIdentityRegistry } from '@/app/hooks/useIdentityRegistry';

export default function Home() {
  const { identityAddress } = useIdentityRegistry();

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white transition-colors duration-200">
        Gestión de Identidades
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-8 transition-colors duration-200">
        Conecta tu wallet para gestionar tu identidad y claims asociados.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Columna izquierda: Información de identidad y registro */}
        <div className="space-y-6">
          <IdentityCard />
          <RegisterIdentity />
          <ConfigureIdentityTrustedIssuersRegistry />
        </div>

        {/* Columna derecha: Claims */}
        <div className="space-y-6">
          <ClaimsList identityAddress={identityAddress} />
          <ClaimRequestsList identityAddress={identityAddress} />
          <RequestClaim identityAddress={identityAddress} />
        </div>
      </div>

      {/* Sección de análisis y gráficos */}
      <div className="mb-6">
        <IdentityAnalytics />
      </div>

      {/* Sección de rutas de funcionamiento */}
      <div className="mb-6">
        <RouteDiagram />
      </div>
    </div>
  );
}
