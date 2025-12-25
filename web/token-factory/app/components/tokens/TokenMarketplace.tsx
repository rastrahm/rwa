'use client';

import React, { useState, useEffect } from 'react';
import { useTokenFactory } from '@/app/hooks/useTokenFactory';
import { useIdentityVerification } from '@/app/hooks/useIdentityVerification';
import { useWallet } from '@/app/hooks/useWallet';
import { ERC20_ABI } from '@/app/lib/contracts/abis';
import { ethers } from 'ethers';

export function TokenMarketplace() {
  const { wallet } = useWallet();
  const { tokens, getTokenInfo } = useTokenFactory();
  const { isVerified, checking, checkVerification } = useIdentityVerification();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (wallet?.address) {
      checkVerification();
    }
  }, [wallet?.address, checkVerification]);

  useEffect(() => {
    const loadTokenInfo = async () => {
      if (selectedToken) {
        const info = await getTokenInfo(selectedToken);
        setTokenInfo(info);
      }
    };
    loadTokenInfo();
  }, [selectedToken, getTokenInfo]);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet?.address || !wallet.signer) {
      setError('Conecta tu wallet para comprar tokens');
      return;
    }

    if (!isVerified) {
      setError('Debes tener una identidad verificada para comprar tokens');
      return;
    }

    if (!selectedToken || !amount || !tokenInfo) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Nota: En una implementación real, aquí harías la compra real del token
      // Esto podría ser una transferencia directa, un swap, o una función específica del token
      // Por ahora, solo simulamos la compra y registramos la transacción

      const token = new ethers.Contract(selectedToken, ERC20_ABI, wallet.signer);
      const amountWei = ethers.parseUnits(amount, tokenInfo.decimals);

      // Ejemplo: Si el token tiene una función de compra, la llamarías aquí
      // const tx = await token.purchase({ value: amountWei });
      // await tx.wait();

      // Por ahora, solo registramos en MongoDB
      await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: '0x...', // En producción, usar el hash real
          fromAddress: wallet.address,
          tokenAddress: selectedToken,
          tokenAmount: amountWei.toString(),
          paymentAmount: amountWei.toString(),
        }),
      });

      setSuccess(true);
      setAmount('');
      setSelectedToken(null);
    } catch (err: any) {
      console.error('Error purchasing token:', err);
      setError(err.message || 'Error al comprar token');
    } finally {
      setLoading(false);
    }
  };

  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para acceder al marketplace.
        </p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Marketplace de Tokens
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 mb-2">
            <strong>Identidad no verificada</strong>
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Debes tener una identidad registrada y verificada para comprar tokens.
            Ve a la interfaz de Identity Management para registrar tu identidad.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Marketplace de Tokens
      </h3>

      <form onSubmit={handlePurchase} className="space-y-4">
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Seleccionar Token *
          </label>
          <select
            id="token"
            value={selectedToken || ''}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading || tokens.length === 0}
          >
            <option value="">Selecciona un token...</option>
            {tokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.name} ({token.symbol})
              </option>
            ))}
          </select>
          {tokens.length === 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              No hay tokens disponibles para comprar.
            </p>
          )}
        </div>

        {tokenInfo && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">Nombre:</span>{' '}
                <span className="text-gray-900 dark:text-white">{tokenInfo.name}</span>
              </p>
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">Símbolo:</span>{' '}
                <span className="text-gray-900 dark:text-white">{tokenInfo.symbol}</span>
              </p>
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">Supply Total:</span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {tokenInfo.totalSupply.toString()}
                </span>
              </p>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Cantidad a Comprar *
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            min="0"
            step="0.000001"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading || !selectedToken}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
            Compra registrada exitosamente. (Nota: Esta es una simulación. En producción, se ejecutaría la compra real del token).
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedToken || !amount || !isVerified}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Procesando...' : 'Comprar Token'}
        </button>
      </form>
    </div>
  );
}

