'use client';

import React, { useState, useEffect } from 'react';
import { useTokenFactory } from '@/app/hooks/useTokenFactory';
import { useIdentityVerification } from '@/app/hooks/useIdentityVerification';
import { useClaimTopicsVerification } from '@/app/hooks/useClaimTopicsVerification';
import { useWallet } from '@/app/hooks/useWallet';
import { ERC20_ABI } from '@/app/lib/contracts/abis';
import { ethers } from 'ethers';
import { CLAIM_TOPICS } from '@/app/lib/types/trusted-issuers';

// ABI para funciones de AccessControl
const ACCESS_CONTROL_ABI = [
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
  'function getRoleMember(bytes32 role, uint256 index) external view returns (address)',
  'function getRoleMemberCount(bytes32 role) external view returns (uint256)',
];

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  price?: string;
  maxSupply?: string;
  admin?: string;
  isOwner?: boolean; // Si el usuario actual es el creador/admin del token
  requiredClaimTopics?: number[]; // Claim topics requeridos para adquirir el token
}

export function TokenMarketplace() {
  const { wallet } = useWallet();
  const { tokens: factoryTokens, getTokenInfo } = useTokenFactory();
  const { isVerified, checking, checkVerification } = useIdentityVerification();
  const { verifyClaimTopics, verificationStatus, checking: checkingClaimTopics } = useClaimTopicsVerification();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | false>(false);
  const [purchaseMode, setPurchaseMode] = useState<'tokens' | 'eth'>('tokens');
  const [tokens, setTokens] = useState<any[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  useEffect(() => {
    if (wallet?.address) {
      checkVerification();
    }
  }, [wallet?.address, checkVerification]);

  // Cargar tokens desde MongoDB y combinarlos con los del factory
  useEffect(() => {
    const loadTokensFromDB = async () => {
      try {
        setLoadingTokens(true);
        console.log('🔄 Iniciando carga de tokens...');
        
        // Siempre cargar tokens desde MongoDB primero
        const response = await fetch('/api/tokens');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const dbTokens = data.tokens || [];
        console.log(`📦 Tokens desde MongoDB: ${dbTokens.length}`);
        
        // Si no hay provider, usar solo tokens de MongoDB
        if (!wallet?.provider) {
          const tokensFromDB = dbTokens.map((t: any) => ({
            address: t.address,
            name: t.name || 'Unknown Token',
            symbol: t.symbol || 'UNK',
            decimals: 18,
            totalSupply: BigInt(0),
            price: t.price,
            maxSupply: t.maxSupply,
            description: t.description,
            website: t.website,
          }));
          setTokens(tokensFromDB);
          console.log('✅ Tokens cargados desde MongoDB (sin provider):', tokensFromDB.length);
          return;
        }
        
        // Combinar tokens del factory con tokens de MongoDB
        // Crear un mapa de tokens del factory por dirección
        const factoryTokensMap = new Map(
          (factoryTokens || []).map(t => [t.address.toLowerCase(), t])
        );
        
        // Crear un mapa de tokens de MongoDB por dirección
        const dbTokensMap = new Map(
          dbTokens.map((t: any) => [t.address.toLowerCase(), t])
        );
        
        // Combinar: usar tokens del factory si existen, sino usar info de MongoDB
        const combinedTokens: any[] = [];
        
        // Primero agregar todos los tokens del factory
        for (const factoryToken of (factoryTokens || [])) {
          const dbToken = dbTokensMap.get(factoryToken.address.toLowerCase()) as any;
          combinedTokens.push({
            address: factoryToken.address,
            name: factoryToken.name,
            symbol: factoryToken.symbol,
            decimals: factoryToken.decimals,
            totalSupply: factoryToken.totalSupply,
            price: dbToken?.price,
            maxSupply: dbToken?.maxSupply,
            description: dbToken?.description,
            website: dbToken?.website,
          });
        }
        
        // Luego agregar tokens de MongoDB que no están en el factory
        // IMPORTANTE: Siempre agregar tokens de MongoDB, incluso si tienen bytecode corto
        for (const dbToken of dbTokens) {
          const tokenAddr = dbToken.address.toLowerCase();
          if (!factoryTokensMap.has(tokenAddr)) {
            // Siempre agregar el token de MongoDB, intentar obtener info del contrato si es posible
            let tokenInfo: any = {
              address: dbToken.address,
              name: dbToken.name || 'Unknown Token',
              symbol: dbToken.symbol || 'UNK',
              decimals: 18,
              totalSupply: BigInt(0),
              price: dbToken.price,
              maxSupply: dbToken.maxSupply,
              description: dbToken.description,
              website: dbToken.website,
            };
            
            // Intentar obtener info del contrato si es posible (sin bloquear)
            // Si el contrato no está inicializado o tiene bytecode corto, usar info de MongoDB
            try {
              const code = await wallet.provider.getCode(dbToken.address).catch(() => null);
              if (code && code !== '0x' && code !== '0x0' && code.length > 200) {
                try {
                  const info = await getTokenInfo(dbToken.address).catch(() => null);
                  if (info) {
                    tokenInfo = {
                      ...tokenInfo,
                      name: info.name || tokenInfo.name,
                      symbol: info.symbol || tokenInfo.symbol,
                      decimals: info.decimals || tokenInfo.decimals,
                      totalSupply: info.totalSupply || tokenInfo.totalSupply,
                    };
                  }
                } catch (infoError) {
                  // Ignorar errores al obtener info del contrato, usar info de MongoDB
                  console.debug(`No se pudo obtener info del contrato ${dbToken.address}, usando info de MongoDB`);
                }
              } else {
                // Bytecode corto o no inicializado, usar info de MongoDB
                console.debug(`Token ${dbToken.address} tiene bytecode corto o no está inicializado, usando info de MongoDB`);
              }
            } catch (err) {
              // Ignorar errores, usar info de MongoDB
              console.debug(`Error verificando código del token ${dbToken.address}, usando info de MongoDB`);
            }
            
            combinedTokens.push(tokenInfo);
          }
        }
        
        setTokens(combinedTokens);
        console.log('✅ Tokens combinados:', {
          factory: (factoryTokens || []).length,
          db: dbTokens.length,
          combined: combinedTokens.length,
          tokens: combinedTokens.map(t => ({ address: t.address, symbol: t.symbol, name: t.name, price: t.price }))
        });
      } catch (err: any) {
        console.error('❌ Error loading tokens from DB:', err);
        setError(err.message || 'Error al cargar tokens');
        
        // Si falla cargar desde MongoDB, intentar usar solo los tokens del factory
        if (factoryTokens && factoryTokens.length > 0) {
          console.log('⚠️ Usando solo tokens del factory como fallback');
          setTokens(factoryTokens.map(t => ({
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            decimals: t.decimals,
            totalSupply: t.totalSupply,
            price: undefined,
            maxSupply: undefined,
          })));
        } else {
          setTokens([]);
        }
      } finally {
        setLoadingTokens(false);
      }
    };
    
    loadTokensFromDB();
  }, [factoryTokens, wallet?.provider, getTokenInfo]);

  // Debug: Log cuando cambia el estado de tokens
  useEffect(() => {
    console.log('🔍 Estado de tokens actualizado:', {
      count: tokens.length,
      tokens: tokens.map(t => ({ address: t.address, symbol: t.symbol, name: t.name })),
      loadingTokens,
      hasProvider: !!wallet?.provider,
      factoryTokensCount: (factoryTokens || []).length
    });
  }, [tokens, loadingTokens, wallet?.provider, factoryTokens]);

  useEffect(() => {
    const loadTokenInfo = async () => {
      if (selectedToken && wallet?.provider) {
        try {
          // Verificar que el contrato tenga código antes de intentar obtener info
          const code = await wallet.provider.getCode(selectedToken);
          if (!code || code === '0x' || code === '0x0') {
            setError('El token seleccionado no es un contrato válido');
            setTokenInfo(null);
            setTokenMetadata(null);
            return;
          }

          const info = await getTokenInfo(selectedToken);
          setTokenInfo(info);

          // Cargar metadatos desde MongoDB
          try {
            const response = await fetch('/api/tokens');
            if (response.ok) {
              const data = await response.json();
              // Buscar metadata del token (comparar con diferentes formatos de dirección)
              const metadata = data.tokens.find(
                (t: any) => {
                  const tokenAddr = (t.address || '').toLowerCase();
                  const selectedAddr = selectedToken.toLowerCase();
                  return tokenAddr === selectedAddr;
                }
              );
              
              console.log('Token metadata search:', { 
                selectedToken: selectedToken.toLowerCase(),
                availableTokens: data.tokens.map((t: any) => ({
                  address: (t.address || '').toLowerCase(),
                  symbol: t.symbol,
                  price: t.price
                })),
                found: !!metadata,
                metadata
              });
              
              if (metadata) {
                // Obtener admin del token
                // Prioridad: 1) metadata.admin (creador guardado), 2) DEFAULT_ADMIN_ROLE del contrato
                let admin: string | undefined = metadata.admin; // Usar admin de metadata primero (es el creador)
                
                // Si no hay admin en metadata, intentar obtenerlo del contrato
                if (!admin) {
                  console.log('⚠️ No hay admin en metadata, intentando obtenerlo del contrato...');
                  try {
                    const tokenContract = new ethers.Contract(
                      selectedToken,
                      [...ERC20_ABI, ...ACCESS_CONTROL_ABI],
                      wallet.provider
                    );
                    
                    // Intentar obtener el admin usando DEFAULT_ADMIN_ROLE con timeout
                    try {
                      const adminRole = await Promise.race([
                        tokenContract.DEFAULT_ADMIN_ROLE(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout on DEFAULT_ADMIN_ROLE')), 5000))
                      ]).catch(() => DEFAULT_ADMIN_ROLE);
                      
                      const adminCount = await Promise.race([
                        tokenContract.getRoleMemberCount(adminRole),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout on getRoleMemberCount')), 5000))
                      ]).catch(() => 0);
                      
                      console.log(`📊 Admin count for token ${selectedToken}:`, adminCount);
                      
                      if (adminCount > 0) {
                        // Intentar obtener el primer admin con timeout
                        admin = await Promise.race([
                          tokenContract.getRoleMember(adminRole, 0),
                          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout on getRoleMember')), 5000))
                        ]).catch(() => undefined);
                        
                        if (admin) {
                          console.log(`✅ Admin obtenido de DEFAULT_ADMIN_ROLE:`, admin);
                        } else {
                          console.warn('⚠️ No se pudo obtener admin del contrato (timeout o error)');
                        }
                      } else {
                        console.warn('⚠️ No hay miembros con DEFAULT_ADMIN_ROLE en el contrato');
                      }
                    } catch (roleError: any) {
                      console.warn('❌ Error obteniendo admin por roles:', roleError?.message || roleError);
                    }
                  } catch (err: any) {
                    console.warn('❌ Error getting admin from contract:', err?.message || err);
                  }
                } else {
                  console.log(`✅ Admin obtenido de metadata (creador):`, admin);
                }

                // Verificar si el usuario es el admin/creador del token
                const isOwner = !!(admin && wallet.address && 
                  admin.toLowerCase() === wallet.address.toLowerCase());
                
                const tokenMetadataData: TokenMetadata = {
                  address: metadata.address,
                  name: metadata.name || info?.name || 'Unknown',
                  symbol: metadata.symbol || info?.symbol || 'UNK',
                  price: metadata.price || undefined,
                  maxSupply: metadata.maxSupply || undefined,
                  admin,
                  isOwner, // Agregar flag para saber si el usuario es el creador
                  requiredClaimTopics: metadata.requiredClaimTopics || [],
                };
                
                // Si hay claim topics requeridos, verificar que el usuario los tiene
                if (tokenMetadataData.requiredClaimTopics && tokenMetadataData.requiredClaimTopics.length > 0 && wallet?.address) {
                  console.log('🔍 Verificando claim topics requeridos:', tokenMetadataData.requiredClaimTopics);
                  await verifyClaimTopics(tokenMetadataData.requiredClaimTopics);
                }
                
                console.log('Setting token metadata:', tokenMetadataData);
                setTokenMetadata(tokenMetadataData);
              } else {
                console.warn('No metadata found for token:', selectedToken);
                setTokenMetadata(null);
              }
            } else {
              console.warn('Failed to fetch tokens from API:', response.status);
              setTokenMetadata(null);
            }
          } catch (err) {
            console.warn('Error loading metadata:', err);
            setTokenMetadata(null);
          }
        } catch (err: any) {
          console.error('Error loading token info:', err);
          setError('Error al cargar información del token');
          setTokenInfo(null);
          setTokenMetadata(null);
        }
      } else {
        setTokenInfo(null);
        setTokenMetadata(null);
      }
    };
    loadTokenInfo();
  }, [selectedToken, getTokenInfo, wallet?.provider]);

  // Calcular ETH necesario cuando cambia la cantidad de tokens
  useEffect(() => {
    if (purchaseMode === 'tokens' && amount && tokenMetadata?.price && tokenInfo) {
      const tokenPrice = parseFloat(tokenMetadata.price);
      const tokenAmount = parseFloat(amount);
      if (!isNaN(tokenPrice) && !isNaN(tokenAmount) && tokenPrice > 0) {
        const ethNeeded = tokenAmount * tokenPrice;
        setEthAmount(ethNeeded.toFixed(6));
      } else {
        setEthAmount('');
      }
    }
  }, [amount, tokenMetadata?.price, tokenInfo, purchaseMode]);

  // Calcular tokens cuando cambia la cantidad de ETH
  useEffect(() => {
    if (purchaseMode === 'eth' && ethAmount && tokenMetadata?.price && tokenInfo) {
      const tokenPrice = parseFloat(tokenMetadata.price);
      const ethAmountNum = parseFloat(ethAmount);
      if (!isNaN(tokenPrice) && !isNaN(ethAmountNum) && tokenPrice > 0) {
        const tokensToReceive = ethAmountNum / tokenPrice;
        setAmount(tokensToReceive.toFixed(6));
      } else {
        setAmount('');
      }
    }
  }, [ethAmount, tokenMetadata?.price, tokenInfo, purchaseMode]);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet?.address || !wallet.signer || !wallet.provider) {
      setError('Conecta tu wallet para comprar tokens');
      return;
    }

    if (!isVerified) {
      setError('Debes tener una identidad verificada para comprar tokens');
      return;
    }

    // Verificar claim topics requeridos si el token los tiene configurados
    if (tokenMetadata?.requiredClaimTopics && tokenMetadata.requiredClaimTopics.length > 0) {
      const verification = await verifyClaimTopics(tokenMetadata.requiredClaimTopics);
      if (!verification.hasAllTopics) {
        const missingTopicNames = verification.missingTopics
          .map((id) => {
            const topic = CLAIM_TOPICS.find((t) => t.id === id);
            return topic ? topic.name : `Topic ${id}`;
          })
          .join(', ');
        setError(
          `No tienes los claim topics requeridos para adquirir este token. ` +
          `Topics faltantes: ${missingTopicNames}. ` +
          `Contacta a un trusted issuer para obtener estos claims.`
        );
        return;
      }
    }

    if (!selectedToken || !amount || !tokenInfo || !tokenMetadata) {
      setError('Completa todos los campos');
      return;
    }

    if (!tokenMetadata.price) {
      setError('Este token no tiene precio configurado. Contacta al administrador.');
      return;
    }

    // Si el usuario es el creador del token, mostrar advertencia pero permitir comprar
    // El creador puede querer comprar tokens para distribuirlos o para otros propósitos
    if (tokenMetadata.isOwner) {
      const confirmPurchase = window.confirm(
        'Eres el creador de este token. Normalmente puedes mintear tokens directamente usando la sección "Mintear Tokens".\n\n' +
        '¿Deseas continuar con la compra de todas formas?'
      );
      if (!confirmPurchase) {
        return;
      }
      // Continuar con la compra si el usuario confirma
    }

    // Si no hay admin en metadata, intentar obtenerlo del contrato antes de bloquear
    let adminAddress = tokenMetadata.admin;
    if (!adminAddress && selectedToken && wallet?.provider) {
      try {
        console.log('⚠️ No hay admin en metadata, intentando obtenerlo del contrato en handlePurchase...');
        const tokenContract = new ethers.Contract(
          selectedToken,
          [...ERC20_ABI, ...ACCESS_CONTROL_ABI],
          wallet.provider
        );
        
        const adminRole = await Promise.race([
          tokenContract.DEFAULT_ADMIN_ROLE(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout on DEFAULT_ADMIN_ROLE')), 5000))
        ]).catch(() => DEFAULT_ADMIN_ROLE);
        
        const adminCount = await Promise.race([
          tokenContract.getRoleMemberCount(adminRole),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout on getRoleMemberCount')), 5000))
        ]).catch(() => 0);
        
        console.log(`📊 Admin count for token ${selectedToken}:`, adminCount);
        
        if (adminCount > 0) {
          adminAddress = await Promise.race([
            tokenContract.getRoleMember(adminRole, 0),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout on getRoleMember')), 5000))
          ]).catch(() => undefined);
          
          if (adminAddress) {
            console.log('✅ Admin obtenido del contrato en handlePurchase:', adminAddress);
            // Actualizar metadata con el admin obtenido
            setTokenMetadata({ ...tokenMetadata, admin: adminAddress });
          } else {
            console.warn('⚠️ No se pudo obtener admin del contrato (timeout o error)');
          }
        } else {
          console.warn('⚠️ No hay miembros con DEFAULT_ADMIN_ROLE en el contrato');
        }
      } catch (err: any) {
        console.warn('❌ Error obteniendo admin del contrato en handlePurchase:', err?.message || err);
      }
    }

    if (!adminAddress) {
      setError('No se pudo obtener la dirección del administrador del token. El token puede no estar completamente inicializado o puede requerir configuración adicional.');
      console.error('Token metadata sin admin:', { selectedToken, tokenMetadata });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Verificar que el contrato tenga código
      const code = await wallet.provider.getCode(selectedToken);
      if (!code || code === '0x' || code === '0x0') {
        throw new Error('El token seleccionado no es un contrato válido');
      }

      // Calcular ETH necesario
      const tokenPrice = parseFloat(tokenMetadata.price);
      const tokenAmount = parseFloat(amount);
      
      if (isNaN(tokenPrice) || tokenPrice <= 0) {
        throw new Error('Precio del token no válido');
      }
      
      if (isNaN(tokenAmount) || tokenAmount <= 0) {
        throw new Error('Cantidad de tokens no válida');
      }

      const ethNeeded = tokenAmount * tokenPrice;
      const ethWei = ethers.parseEther(ethNeeded.toString());

      // Verificar balance de ETH
      const balance = await wallet.provider.getBalance(wallet.address);
      if (balance < ethWei) {
        throw new Error(`Balance insuficiente. Necesitas ${ethNeeded.toFixed(6)} ETH pero tienes ${ethers.formatEther(balance)} ETH`);
      }

      // Enviar ETH al administrador del token (usar adminAddress obtenido)
      const tx = await wallet.signer.sendTransaction({
        to: adminAddress,
        value: ethWei,
      });

      setSuccess(`Transacción enviada: ${tx.hash}. Esperando confirmación...`);

      // Esperar confirmación
      const receipt = await tx.wait();
      
      // Registrar la compra en MongoDB
      await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: tx.hash,
          fromAddress: wallet.address,
          tokenAddress: selectedToken,
          tokenAmount: ethers.parseUnits(amount, tokenInfo.decimals).toString(),
          paymentAmount: ethWei.toString(),
          paymentCurrency: 'ETH',
        }),
      });

      setSuccess(
        `✅ Pago enviado exitosamente! ${ethNeeded.toFixed(6)} ETH enviados al administrador. ` +
        `El administrador debe mintear ${amount} ${tokenInfo.symbol} para tu dirección. ` +
        `TX: ${tx.hash}`
      );

      // Limpiar formulario
      setAmount('');
      setEthAmount('');
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

  // Mostrar advertencia si no está verificado, pero permitir ver los tokens
  const showVerificationWarning = !isVerified;

  // Debug: Log antes de renderizar
  console.log('🎨 Renderizando TokenMarketplace:', {
    tokensCount: tokens.length,
    tokens: tokens.map(t => ({ address: t.address, name: t.name, symbol: t.symbol })),
    loading,
    loadingTokens,
    isVerified,
    selectDisabled: loading || loadingTokens || tokens.length === 0
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Marketplace de Tokens
      </h3>

      {showVerificationWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 dark:text-yellow-200 mb-2">
            <strong>Identidad no verificada</strong>
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Debes tener una identidad registrada y verificada para comprar tokens.
            Ve a la interfaz de Identity Management para registrar tu identidad.
          </p>
        </div>
      )}

      {/* Debug: Mostrar información de tokens */}
      <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs">
        <strong>Debug Info:</strong> {tokens.length} tokens cargados
        {tokens.length > 0 && (
          <ul className="mt-2 space-y-1">
            {tokens.slice(0, 3).map((t) => (
              <li key={t.address}>
                {t.name} ({t.symbol}) - {t.address.slice(0, 10)}...
              </li>
            ))}
            {tokens.length > 3 && <li>... y {tokens.length - 3} más</li>}
          </ul>
        )}
      </div>

      <form onSubmit={handlePurchase} className="space-y-4">
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Seleccionar Token * ({tokens.length} tokens disponibles)
          </label>
          <select
            id="token"
            value={selectedToken || ''}
            onChange={(e) => {
              console.log('🔄 Token seleccionado:', e.target.value);
              setSelectedToken(e.target.value);
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading || loadingTokens || tokens.length === 0}
            style={{ minHeight: '40px' }}
          >
            <option value="">Selecciona un token...</option>
            {tokens.length > 0 ? (
              tokens.map((token) => {
                const optionText = `${token.name || 'Unknown'} (${token.symbol || 'UNK'})`;
                console.log('🔹 Renderizando opción de token:', { 
                  address: token.address, 
                  name: token.name, 
                  symbol: token.symbol,
                  optionText 
                });
                return (
                  <option key={token.address} value={token.address}>
                    {optionText}
                  </option>
                );
              })
            ) : (
              <option value="" disabled>No hay tokens disponibles</option>
            )}
          </select>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Debug: {tokens.length} tokens disponibles, select disabled: {String(loading || loadingTokens || tokens.length === 0)}
          </div>
          {loadingTokens && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Cargando tokens...
            </p>
          )}
          {!loadingTokens && tokens.length === 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              No hay tokens disponibles para comprar.
            </p>
          )}
        </div>

        {tokenInfo && tokenMetadata && (
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
              {tokenMetadata.price && (
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Precio:</span>{' '}
                  <span className="text-gray-900 dark:text-white">
                    {parseFloat(tokenMetadata.price).toFixed(6)} ETH por {tokenInfo.symbol}
                  </span>
                </p>
              )}
              {tokenMetadata.admin && (
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Administrador:</span>{' '}
                  <span className="font-mono text-xs text-gray-900 dark:text-white">
                    {tokenMetadata.admin.slice(0, 10)}...{tokenMetadata.admin.slice(-8)}
                  </span>
                </p>
              )}
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">Supply Total:</span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {tokenInfo.totalSupply.toString()}
                </span>
              </p>
            </div>
          </div>
        )}

        {tokenMetadata?.price ? (
          <>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setPurchaseMode('tokens');
                  setAmount('');
                  setEthAmount('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  purchaseMode === 'tokens'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Comprar por Tokens
              </button>
              <button
                type="button"
                onClick={() => {
                  setPurchaseMode('eth');
                  setAmount('');
                  setEthAmount('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  purchaseMode === 'eth'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Comprar por ETH
              </button>
            </div>

            {purchaseMode === 'tokens' ? (
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Cantidad de Tokens a Comprar *
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  min="0"
                  step="0.000001"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading || !selectedToken}
                />
                {ethAmount && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Costo: {ethAmount} ETH
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="ethAmount"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Cantidad de ETH a Pagar *
                </label>
                <input
                  type="number"
                  id="ethAmount"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  placeholder="0.1"
                  min="0"
                  step="0.000001"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading || !selectedToken}
                />
                {amount && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Recibirás: {amount} {tokenInfo?.symbol}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Cantidad a Solicitar *
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
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Este token no tiene precio configurado. Contacta al administrador.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
            Solicitud registrada exitosamente. Contacta al administrador del token para obtener los tokens.
          </div>
        )}

        {/* Información sobre Claim Topics Requeridos */}
        {tokenMetadata?.requiredClaimTopics && tokenMetadata.requiredClaimTopics.length > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
              <strong>📋 Claim Topics Requeridos:</strong>
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {tokenMetadata.requiredClaimTopics.map((topicId) => {
                const topic = CLAIM_TOPICS.find((t) => t.id === topicId);
                return (
                  <span
                    key={topicId}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                  >
                    {topic ? topic.name : `Topic ${topicId}`}
                  </span>
                );
              })}
            </div>
            {checkingClaimTopics ? (
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Verificando tus claim topics...
              </p>
            ) : verificationStatus ? (
              verificationStatus.hasAllTopics ? (
                <p className="text-xs text-green-700 dark:text-green-300">
                  ✅ Tienes todos los claim topics requeridos. Puedes adquirir este token.
                </p>
              ) : (
                <div>
                  <p className="text-xs text-red-700 dark:text-red-300 mb-1">
                    ❌ Te faltan los siguientes claim topics:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {verificationStatus.missingTopics.map((topicId) => {
                      const topic = CLAIM_TOPICS.find((t) => t.id === topicId);
                      return (
                        <span
                          key={topicId}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        >
                          {topic ? topic.name : `Topic ${topicId}`}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Contacta a un trusted issuer para obtener estos claims antes de poder adquirir el token.
                  </p>
                </div>
              )
            ) : (
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Debes tener estos claim topics para poder adquirir este token.
              </p>
            )}
          </div>
        )}

        {tokenMetadata?.price ? (
          tokenMetadata.isOwner ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>ℹ️ Información:</strong> Eres el creador de este token. 
                Puedes mintear tokens directamente usando la sección "Mintear Tokens" sin necesidad de comprarlos.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>ℹ️ Información:</strong> Al comprar, enviarás ETH al administrador del token. 
                El administrador debe mintear los tokens para tu dirección después de recibir el pago.
              </p>
            </div>
          )
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Advertencia:</strong> Este token no tiene precio configurado. 
              Contacta al administrador del token para obtener tokens.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading || 
            !selectedToken || 
            (!amount && !ethAmount) || 
            !isVerified || 
            !tokenMetadata?.price || 
            !!tokenMetadata?.isOwner ||
            (tokenMetadata?.requiredClaimTopics && 
             tokenMetadata.requiredClaimTopics.length > 0 && 
             verificationStatus && 
             verificationStatus.hasAllTopics === false) ||
            (tokenMetadata?.requiredClaimTopics && 
             tokenMetadata.requiredClaimTopics.length > 0 && 
             checkingClaimTopics)
          }
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {loading 
            ? 'Procesando...' 
            : tokenMetadata?.isOwner 
              ? 'Eres el creador - Puedes comprar o mintear' 
              : tokenMetadata?.requiredClaimTopics && 
                tokenMetadata.requiredClaimTopics.length > 0 && 
                verificationStatus && 
                !verificationStatus.hasAllTopics
                ? 'Faltan Claim Topics Requeridos'
                : tokenMetadata?.price 
                  ? 'Comprar con ETH' 
                  : 'Solicitar Tokens'}
        </button>
      </form>
    </div>
  );
}

