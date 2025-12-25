'use client';

import React, { useState } from 'react';
import { useWallet } from '@/app/hooks/useWallet';

export function WalletSelector() {
  const { wallet, isConnecting, error, availableWallets, connectWallet, disconnectWallet } = useWallet();
  const [showSelector, setShowSelector] = useState(false);

  const handleConnect = async (walletOption?: any) => {
    try {
      console.log('🎯 Wallet seleccionado:', walletOption?.name, walletOption);
      setShowSelector(false);
      await connectWallet(walletOption);
    } catch (error) {
      // El error ya está manejado en useWallet
      console.error('Error en handleConnect:', error);
    }
  };

  if (wallet) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {wallet.networkName}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Desconectar
        </button>
      </div>
    );
  }

  // Si no hay wallets disponibles
  if (availableWallets.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <button
          disabled
          className="px-4 py-2 bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-200 rounded-lg cursor-not-allowed"
        >
          No se encontraron wallets
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-300">
          Instala MetaMask o Trust Wallet para continuar
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {availableWallets.length > 1 ? (
        <>
          <button
            onClick={() => setShowSelector(!showSelector)}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
          </button>
          
          {showSelector && (
            <>
              {/* Overlay para cerrar al hacer click fuera */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowSelector(false)}
              />
              <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[220px]">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 px-2 py-1 mb-1">
                    Selecciona un wallet:
                  </div>
                  {availableWallets.map((walletOption, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnect(walletOption);
                      }}
                      disabled={isConnecting}
                      className="w-full text-left px-3 py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{walletOption.name}</span>
                      {walletOption.name === 'MetaMask' && (
                        <span className="ml-auto text-xs text-blue-500">Recomendado</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <button
          onClick={() => handleConnect(availableWallets[0])}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isConnecting ? 'Conectando...' : `Conectar ${availableWallets[0]?.name || 'Wallet'}`}
        </button>
      )}
      
      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
