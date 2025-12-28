'use client';

import React from 'react';
import { CreateToken } from '@/app/components/tokens/CreateToken';
import { TokenList } from '@/app/components/tokens/TokenList';
import { TokenMarketplace } from '@/app/components/tokens/TokenMarketplace';
import { MyTokens } from '@/app/components/tokens/MyTokens';
import { MintTokens } from '@/app/components/tokens/MintTokens';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white transition-colors duration-200">
        Token Factory & Marketplace
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-8 transition-colors duration-200">
        Crea tokens usando el factory y compra tokens disponibles en el marketplace.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Columna izquierda: Crear Token y Mintear */}
        <div className="space-y-6">
          <CreateToken />
          <MintTokens />
        </div>

        {/* Columna derecha: Marketplace */}
        <div className="space-y-6">
          <TokenMarketplace />
        </div>
      </div>

      {/* Mis Tokens - Tokens que el usuario posee */}
      <div className="mb-6">
        <MyTokens />
      </div>

      {/* Lista de tokens debajo */}
      <div className="mt-6">
        <TokenList />
      </div>
    </div>
  );
}
