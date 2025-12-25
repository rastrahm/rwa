'use client';

import React from 'react';
import { WalletSelector } from '@/app/components/wallet/WalletSelector';
import { ThemeToggle } from '@/app/components/theme/ThemeToggle';

export function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
          Token Factory & Marketplace
        </h1>
        <div className="flex items-center gap-4">
          <WalletSelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

