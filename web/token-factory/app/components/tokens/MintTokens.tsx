'use client';

import React, { useState, useEffect } from 'react';
import { useTokenFactory } from '@/app/hooks/useTokenFactory';
import { useWallet } from '@/app/hooks/useWallet';
import { ERC20_ABI } from '@/app/lib/contracts/abis';
import { ethers } from 'ethers';

// ABI para funciones de AccessControl
const ACCESS_CONTROL_ABI = [
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function getRoleAdmin(bytes32 role) external view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
  'function AGENT_ROLE() external view returns (bytes32)',
  'function getRoleMember(bytes32 role, uint256 index) external view returns (address)',
  'function getRoleMemberCount(bytes32 role) external view returns (uint256)',
];

// Roles del token - valores por defecto
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Función helper para obtener AGENT_ROLE (se calcula cuando sea necesario)
const getAgentRole = () => {
  return ethers.keccak256(ethers.toUtf8Bytes('AGENT_ROLE'));
};

interface TokenWithRole {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  admin: string;
  isPaused: boolean;
  isAdmin: boolean;
  isAgent: boolean;
}

export function MintTokens() {
  const { wallet, provider } = useWallet();
  const { tokens, loading: tokensLoading } = useTokenFactory();
  const [tokensWithRoles, setTokensWithRoles] = useState<TokenWithRole[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [checkingRoles, setCheckingRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verificar roles del usuario para cada token
  useEffect(() => {
    const checkRoles = async () => {
      if (!wallet?.address || !provider || tokens.length === 0) {
        setTokensWithRoles([]);
        return;
      }

      try {
        setCheckingRoles(true);

        const tokensWithRoleInfo: TokenWithRole[] = [];

        for (const token of tokens) {
          try {
            // Verificar que el contrato tenga código
            const code = await provider.getCode(token.address);
            if (!code || code === '0x' || code === '0x0') {
              continue;
            }

            const tokenContract = new ethers.Contract(
              token.address,
              [...ERC20_ABI, ...ACCESS_CONTROL_ABI],
              provider
            );

            // Verificar roles
            let isAdmin = false;
            let isAgent = false;

            try {
              // Intentar obtener los roles del contrato
              let adminRole = DEFAULT_ADMIN_ROLE;
              let agentRole = getAgentRole();
              
              try {
                [adminRole, agentRole] = await Promise.all([
                  tokenContract.DEFAULT_ADMIN_ROLE().catch(() => DEFAULT_ADMIN_ROLE),
                  tokenContract.AGENT_ROLE().catch(() => getAgentRole()),
                ]);
                console.log(`Roles obtenidos para token ${token.address}:`, {
                  adminRole,
                  agentRole,
                  adminRoleHex: adminRole,
                  agentRoleHex: agentRole
                });
              } catch (roleGetError) {
                console.warn(`Error obteniendo roles para ${token.address}, usando valores por defecto:`, roleGetError);
              }

              // Verificar si el usuario tiene los roles
              [isAdmin, isAgent] = await Promise.all([
                tokenContract.hasRole(adminRole, wallet.address).catch(() => false),
                tokenContract.hasRole(agentRole, wallet.address).catch(() => false),
              ]);
              
              console.log(`Verificación de roles para token ${token.address}:`, {
                walletAddress: wallet.address,
                isAdmin,
                isAgent,
                adminRole,
                agentRole,
                canMint: isAdmin || isAgent
              });
              
              // Debug adicional: verificar quién tiene los roles
              try {
                const adminCount = await tokenContract.getRoleMemberCount(adminRole).catch(() => 0);
                const agentCount = await tokenContract.getRoleMemberCount(agentRole).catch(() => 0);
                console.log(`Miembros de roles para token ${token.address}:`, {
                  adminCount,
                  agentCount,
                  adminMembers: adminCount > 0 ? await Promise.all(
                    Array.from({ length: Math.min(adminCount, 3) }, (_, i) =>
                      tokenContract.getRoleMember(adminRole, i).catch(() => 'error')
                    )
                  ) : [],
                  agentMembers: agentCount > 0 ? await Promise.all(
                    Array.from({ length: Math.min(agentCount, 3) }, (_, i) =>
                      tokenContract.getRoleMember(agentRole, i).catch(() => 'error')
                    )
                  ) : []
                });
              } catch (memberError) {
                console.warn(`Error obteniendo miembros de roles:`, memberError);
              }
            } catch (roleError) {
              console.warn(`Error checking roles for ${token.address}:`, roleError);
              // Continuar sin roles si falla
            }

            if (isAdmin || isAgent) {
              tokensWithRoleInfo.push({
                address: token.address,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                totalSupply: token.totalSupply,
                admin: token.admin || '',
                isPaused: token.isPaused || false,
                isAdmin,
                isAgent,
              });
            }
          } catch (err) {
            console.error(`Error processing token ${token.address}:`, err);
            // Continuar con el siguiente token
          }
        }

        setTokensWithRoles(tokensWithRoleInfo);
      } catch (err: any) {
        console.error('Error checking roles:', err);
        setTokensWithRoles([]);
      } finally {
        setCheckingRoles(false);
      }
    };

    if (tokensLoading) {
      return;
    }

    checkRoles();
  }, [wallet?.address, provider, tokens, tokensLoading]);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet?.address || !wallet.signer) {
      setError('Conecta tu wallet para mintear tokens');
      return;
    }

    if (!selectedToken || !recipient || !amount) {
      setError('Completa todos los campos');
      return;
    }

    const selectedTokenInfo = tokensWithRoles.find((t) => t.address === selectedToken);
    if (!selectedTokenInfo) {
      setError('Token no válido');
      return;
    }

    if (!selectedTokenInfo.isAdmin && !selectedTokenInfo.isAgent) {
      setError('No tienes permisos para mintear este token');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validar dirección del destinatario
      if (!ethers.isAddress(recipient)) {
        throw new Error('Dirección del destinatario no válida');
      }

      // Validar cantidad
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Cantidad debe ser mayor a 0');
      }

      // Convertir a wei usando los decimales del token
      const amountWei = ethers.parseUnits(amount, selectedTokenInfo.decimals);

      // Crear instancia del contrato con el signer
      const tokenContract = new ethers.Contract(
        selectedToken,
        [...ERC20_ABI, ...ACCESS_CONTROL_ABI],
        wallet.signer
      );

      // Llamar a la función mint
      const tx = await tokenContract.mint(recipient, amountWei);
      setSuccess(`Transacción enviada: ${tx.hash}. Esperando confirmación...`);

      // Esperar confirmación
      const receipt = await tx.wait();
      setSuccess(
        `✅ Tokens minteados exitosamente! ${amount} ${selectedTokenInfo.symbol} para ${recipient.slice(0, 10)}...${recipient.slice(-8)}`
      );

      // Limpiar formulario
      setAmount('');
      setRecipient('');
    } catch (err: any) {
      console.error('Error minting tokens:', err);
      let errorMessage = 'Error al mintear tokens';
      
      if (err.message?.includes('Recipient not verified')) {
        errorMessage = 'El destinatario no está verificado. Debe tener una identidad registrada y verificada.';
      } else if (err.message?.includes('Mint not compliant')) {
        errorMessage = 'El mint no cumple con los requisitos de compliance del token.';
      } else if (err.message?.includes('AccessControl')) {
        errorMessage = 'No tienes permisos para mintear este token. Necesitas ser ADMIN o AGENT.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Mintear Tokens
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para mintear tokens.
        </p>
      </div>
    );
  }

  if (checkingRoles || tokensLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Mintear Tokens
        </h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (tokensWithRoles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Mintear Tokens
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-2">
            No eres administrador o agente de ningún token. Solo los administradores y agentes pueden mintear tokens.
          </p>
          {tokens.length > 0 && (
            <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-300">
              <p><strong>Debug:</strong> Se encontraron {tokens.length} tokens, pero no se detectaron roles para tu dirección ({wallet?.address}).</p>
              <p className="mt-1">Si creaste estos tokens, deberías ser el administrador. Verifica que el contrato esté correctamente inicializado.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Mintear Tokens
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Como administrador o agente, puedes mintear tokens para otros usuarios verificados.
      </p>

      <form onSubmit={handleMint} className="space-y-4">
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Seleccionar Token *
          </label>
          <select
            id="token"
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          >
            <option value="">Selecciona un token...</option>
            {tokensWithRoles.map((token) => (
              <option key={token.address} value={token.address}>
                {token.name} ({token.symbol}) - {token.isAdmin ? 'Admin' : 'Agent'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="recipient"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Dirección del Destinatario *
          </label>
          <input
            type="text"
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            El destinatario debe tener una identidad registrada y verificada.
          </p>
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Cantidad de Tokens *
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            min="0"
            step="0.000001"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedToken || !recipient || !amount}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Minteando...' : 'Mintear Tokens'}
        </button>
      </form>
    </div>
  );
}

