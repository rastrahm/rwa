'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { TOKEN_CLONE_FACTORY_ABI, ERC20_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';
import type { TokenInfo } from '@/app/lib/types/token';

export function useTokenFactory() {
  const { provider, wallet } = useWallet();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar todos los tokens creados
  const loadTokens = useCallback(async () => {
    if (!provider || !contracts.tokenCloneFactory) {
      setTokens([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const factory = new ethers.Contract(
        contracts.tokenCloneFactory,
        TOKEN_CLONE_FACTORY_ABI,
        provider
      );

      const tokenAddresses = await factory.getAllTokens();
      console.log(`📋 Encontrados ${tokenAddresses.length} tokens en el factory`);
      
      const tokenInfos: TokenInfo[] = [];

      for (const address of tokenAddresses) {
        try {
          // Verificar que el contrato tenga código antes de intentar obtener info
          const code = await provider.getCode(address);
          if (!code || code === '0x' || code === '0x0') {
            console.warn(`⚠️ Token ${address} no tiene código, saltando...`);
            continue;
          }
          
          // Los minimal proxies (EIP-1167) tienen bytecode corto pero son válidos
          // Verificar primero si el proxy está inicializado intentando una llamada simple
          const token = new ethers.Contract(address, ERC20_ABI, provider);
          
          // Verificar que el token esté inicializado intentando llamar a una función que requiere inicialización
          // Si el token no está inicializado, estas llamadas revertirán
          let isInitialized = false;
          try {
            // Intentar llamar a totalSupply() con un timeout corto
            await Promise.race([
              token.totalSupply(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            isInitialized = true;
          } catch (initCheckError: any) {
            // Si falla, el token puede no estar inicializado
            if (initCheckError.message?.includes('execution reverted') || 
                initCheckError.message?.includes('revert') ||
                initCheckError.message?.includes('Timeout')) {
              console.warn(`⚠️ Token ${address} no está inicializado o no responde, saltando...`);
              continue;
            }
            // Si es otro tipo de error, intentar continuar
            isInitialized = true;
          }
          
          if (!isInitialized) {
            continue;
          }
          
          // Si el token está inicializado, obtener la información
          // Usar catch para cada función individualmente para evitar que un error en una función
          // impida obtener las demás
          let totalSupply = 0n;
          try {
            totalSupply = await Promise.race([
              token.totalSupply(),
              new Promise<bigint>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]) as bigint;
          } catch (supplyError) {
            console.debug(`⚠️ Token ${address}: no se pudo obtener totalSupply`);
          }
          
          // Obtener name, symbol y decimals con manejo individual de errores
          let name = 'Unknown';
          let symbol = 'UNK';
          let decimals = 18;
          
          try {
            name = await Promise.race([
              token.name(),
              new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]) as string;
          } catch (nameError) {
            console.debug(`⚠️ Token ${address}: no se pudo obtener name`);
          }
          
          try {
            symbol = await Promise.race([
              token.symbol(),
              new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]) as string;
          } catch (symbolError) {
            console.debug(`⚠️ Token ${address}: no se pudo obtener symbol`);
          }
          
          try {
            decimals = await Promise.race([
              token.decimals(),
              new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]) as number;
          } catch (decimalsError) {
            console.debug(`⚠️ Token ${address}: no se pudo obtener decimals`);
          }

          // Incluir el token solo si está inicializado
          tokenInfos.push({
            address,
            name,
            symbol,
            decimals: Number(decimals),
            totalSupply: BigInt(totalSupply.toString()),
            admin: '', // Se puede obtener de eventos si es necesario
            isPaused: false, // Se puede verificar si el token tiene función paused()
          });
        } catch (err: any) {
          console.error(`Error loading token ${address}:`, err);
          // Continuar con el siguiente token
        }
      }

      setTokens(tokenInfos);
    } catch (err: any) {
      console.error('Error loading tokens:', err);
      setError(err.message || 'Error al cargar tokens');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  // Crear un nuevo token
  const createToken = useCallback(
    async (
      name: string,
      symbol: string,
      admin: string,
      identityRegistry: string,
      trustedIssuersRegistry: string,
      claimTopicsRegistry: string
    ) => {
      if (!wallet?.signer || !contracts.tokenCloneFactory) {
        throw new Error('Wallet no conectado o contrato no configurado');
      }

      try {
        setLoading(true);
        setError(null);

        // Verificar que el factory esté desplegado
        const factoryCode = await wallet.provider.getCode(contracts.tokenCloneFactory);
        if (!factoryCode || factoryCode === '0x' || factoryCode === '0x0') {
          throw new Error(`TokenCloneFactory no está desplegado en ${contracts.tokenCloneFactory}. Verifica que el contrato esté desplegado en Anvil.`);
        }
        console.log('✅ TokenCloneFactory está desplegado');

        const factory = new ethers.Contract(
          contracts.tokenCloneFactory,
          TOKEN_CLONE_FACTORY_ABI,
          wallet.signer
        );

        // Verificar que el factory tenga la implementación configurada
        try {
          const implementation = await factory.implementation();
          const implCode = await wallet.provider.getCode(implementation);
          if (!implCode || implCode === '0x' || implCode === '0x0') {
            throw new Error(`La implementación del factory no está desplegada en ${implementation}`);
          }
          console.log('✅ Implementación del factory está desplegada:', implementation);
        } catch (implError: any) {
          console.warn('⚠️ No se pudo verificar la implementación del factory:', implError.message);
        }

        console.log('📝 Creando token con parámetros:', {
          name,
          symbol,
          admin,
          identityRegistry,
          trustedIssuersRegistry,
          claimTopicsRegistry,
        });

        // Verificar que las direcciones de los registries sean válidas
        if (!ethers.isAddress(identityRegistry) || 
            !ethers.isAddress(trustedIssuersRegistry) || 
            !ethers.isAddress(claimTopicsRegistry)) {
          throw new Error('Una o más direcciones de registries no son válidas');
        }

        // Verificar que los registries estén desplegados antes de crear el token
        console.log('🔍 Verificando que los registries estén desplegados...');
        const [identityCode, trustedIssuersCode, claimTopicsCode] = await Promise.all([
          wallet.provider.getCode(identityRegistry),
          wallet.provider.getCode(trustedIssuersRegistry),
          wallet.provider.getCode(claimTopicsRegistry),
        ]);

        if (!identityCode || identityCode === '0x' || identityCode === '0x0') {
          throw new Error(`IdentityRegistry no está desplegado en ${identityRegistry}. Verifica que el contrato esté desplegado en Anvil.`);
        }
        if (!trustedIssuersCode || trustedIssuersCode === '0x' || trustedIssuersCode === '0x0') {
          throw new Error(`TrustedIssuersRegistry no está desplegado en ${trustedIssuersRegistry}. Verifica que el contrato esté desplegado en Anvil.`);
        }
        if (!claimTopicsCode || claimTopicsCode === '0x' || claimTopicsCode === '0x0') {
          throw new Error(`ClaimTopicsRegistry no está desplegado en ${claimTopicsRegistry}. Verifica que el contrato esté desplegado en Anvil.`);
        }

        console.log('✅ Todos los registries están desplegados');
        console.log('📊 Código de registries:', {
          identityRegistry: identityCode.length,
          trustedIssuersRegistry: trustedIssuersCode.length,
          claimTopicsRegistry: claimTopicsCode.length,
        });

        const tx = await factory.createToken(
          name,
          symbol,
          admin,
          identityRegistry,
          trustedIssuersRegistry,
          claimTopicsRegistry
        );

        console.log('⏳ Esperando confirmación de transacción:', tx.hash);
        const receipt = await tx.wait();
        
        if (!receipt) {
          throw new Error('La transacción no fue confirmada');
        }
        
        console.log('✅ Transacción confirmada en bloque:', receipt.blockNumber);
        console.log('📋 Logs de la transacción:', receipt.logs.length, 'logs encontrados');
        
        // Verificar si la transacción fue exitosa
        if (receipt.status === 0) {
          throw new Error('La transacción fue revertida. Revisa los logs de Anvil para más detalles.');
        }
        
        console.log('✅ Estado de la transacción: EXITOSA');
        
        // Actualizar el estado de la transacción en MongoDB de 'pending' a 'confirmed'
        // Esto es opcional - si falla, no afecta la creación del token
        try {
          const updateResponse = await fetch('/api/tokens/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash: tx.hash,
              status: 'confirmed',
              blockNumber: receipt.blockNumber,
            }),
          });
          
          if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log('✅ Estado de transacción actualizado a "confirmed" en MongoDB:', result);
          } else if (updateResponse.status === 404) {
            // Si el endpoint no existe (404), registrar advertencia pero no fallar
            console.warn('⚠️ Endpoint /api/tokens/update-status no encontrado (404).', {
              note: 'Esto puede ocurrir si el servidor necesita reiniciarse. La transacción ya está confirmada en blockchain.',
              suggestion: 'Reinicia el servidor de Next.js para que reconozca el nuevo endpoint.',
            });
          } else {
            // Otro error HTTP
            const errorText = await updateResponse.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || 'Unknown error' };
            }
            
            console.warn('⚠️ No se pudo actualizar el estado de la transacción en MongoDB (no crítico):', {
              status: updateResponse.status,
              statusText: updateResponse.statusText,
              error: errorData,
              note: 'La transacción ya está confirmada en blockchain. El token funcionará correctamente.',
            });
          }
        } catch (updateError: any) {
          // Error de red o de fetch - no crítico
          console.warn('⚠️ Error de red al actualizar estado de transacción (no crítico):', {
            message: updateError?.message || updateError,
            note: 'La transacción ya está confirmada en blockchain. El token funcionará correctamente.',
          });
        }

        // Obtener la dirección del token del evento
        // El evento es: TokenCreated(address indexed token, string name, string symbol, address indexed admin)
        // El topic[0] es el hash del evento: keccak256("TokenCreated(address,string,string,address)")
        const eventSignature = 'TokenCreated(address,string,string,address)';
        const eventTopic = ethers.id(eventSignature);
        
        const tokenCreatedEvent = receipt.logs.find(
          (log: any) => log.topics[0] === eventTopic
        );

        let tokenAddress: string | null = null;
        if (tokenCreatedEvent) {
          console.log('📋 Evento TokenCreated encontrado:', {
            topics: tokenCreatedEvent.topics,
            data: tokenCreatedEvent.data,
          });
          try {
            const decoded = factory.interface.parseLog({
              topics: tokenCreatedEvent.topics,
              data: tokenCreatedEvent.data,
            });
            tokenAddress = decoded?.args.token || decoded?.args[0];
            console.log('✅ Token creado en dirección (decodificado):', tokenAddress);
          } catch (parseError: any) {
            console.error('❌ Error parseando evento TokenCreated:', parseError);
            console.log('🔍 Intentando obtener dirección desde topics...');
            // Intentar obtener la dirección directamente del topic[1] (primer parámetro indexado)
            if (tokenCreatedEvent.topics[1]) {
              tokenAddress = ethers.getAddress('0x' + tokenCreatedEvent.topics[1].slice(26));
              console.log('✅ Token creado (obtenido de topic[1]):', tokenAddress);
            } else {
              console.warn('⚠️ No se encontró topic[1] en el evento');
            }
          }
        } else {
          console.warn('⚠️ No se encontró evento TokenCreated en los logs');
          console.log('📋 Logs disponibles:', receipt.logs.map((log: any) => ({
            address: log.address,
            topics: log.topics,
            data: log.data,
          })));
        }
        
        // Si no se pudo obtener del evento, intentar obtenerlo de getAllTokens()
        if (!tokenAddress) {
          console.log('🔍 Intentando obtener dirección del token desde getAllTokens()...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Aumentar delay
          try {
            const allTokens = await factory.getAllTokens();
            console.log(`📋 Total de tokens en factory: ${allTokens.length}`);
            if (allTokens.length > 0) {
              tokenAddress = allTokens[allTokens.length - 1]; // El último token creado
              console.log('✅ Token creado (obtenido de getAllTokens):', tokenAddress);
            } else {
              console.warn('⚠️ No se encontraron tokens en el factory después de crear uno nuevo');
            }
          } catch (err: any) {
            console.error('❌ Error obteniendo tokens desde factory:', err);
            throw new Error(`No se pudo obtener la dirección del token creado: ${err.message}`);
          }
        }
        
        if (!tokenAddress) {
          throw new Error('No se pudo obtener la dirección del token creado. Verifica los logs de la transacción.');
        }

        // Verificar que el token esté completamente inicializado antes de continuar
        if (tokenAddress) {
          let retries = 10; // Aumentar retries
          let tokenIsReady = false;
          
          console.log(`🔍 Verificando inicialización del token ${tokenAddress}...`);
          
          while (retries > 0 && !tokenIsReady) {
            try {
              // Verificar que el token tenga código (incluso si es un minimal proxy)
              const code = await wallet.provider.getCode(tokenAddress);
              if (!code || code === '0x' || code === '0x0') {
                console.log(`⏳ Token aún no tiene código, esperando... (${retries} intentos restantes)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                retries--;
                continue;
              }
              
              // Intentar verificar que el token esté inicializado llamando a una función
              const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet.provider);
              
              try {
                // Intentar llamar a totalSupply con timeout
                await Promise.race([
                  token.totalSupply(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                
                // Si totalSupply funciona, intentar también name() para asegurar que está completamente inicializado
                await Promise.race([
                  token.name(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                
                tokenIsReady = true;
                console.log('✅ Token está completamente inicializado y listo');
              } catch (initErr: any) {
                if (initErr.message?.includes('execution reverted') || 
                    initErr.message?.includes('revert')) {
                  console.log(`⏳ Token aún no está completamente inicializado (revert), esperando... (${retries} intentos restantes)`);
                } else if (initErr.message?.includes('Timeout')) {
                  console.log(`⏳ Token no responde (timeout), esperando... (${retries} intentos restantes)`);
                } else {
                  console.log(`⏳ Error verificando token: ${initErr.message}, esperando... (${retries} intentos restantes)`);
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries--;
              }
            } catch (err: any) {
              console.error(`Error verificando token (intento ${11 - retries}):`, err.message || err);
              retries--;
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          if (!tokenIsReady) {
            console.warn('⚠️ El token no está completamente inicializado después de varios intentos.');
            console.warn('⚠️ Esto puede indicar un problema con la inicialización del token en el contrato.');
            console.warn('⚠️ El token puede aparecer más tarde cuando se recargue la lista.');
          }
        }

        // Recargar lista de tokens después de un delay adicional
        // Solo recargar si el token está listo, sino esperar más tiempo
        if (tokenAddress) {
          // Esperar un poco más antes de recargar para dar tiempo a que el token se inicialice completamente
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Recargar lista de tokens (sin esperar para no bloquear)
        // Usar un delay adicional para evitar llamar funciones en tokens no inicializados
        setTimeout(() => {
          loadTokens().catch(err => {
            console.warn('Error al recargar tokens después de crear:', err);
          });
        }, 2000);

        return { txHash: tx.hash, tokenAddress };
      } catch (err: any) {
        console.error('Error creating token:', err);
        setError(err.message || 'Error al crear token');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet?.signer, loadTokens]
  );

  // Obtener información de un token específico
  const getTokenInfo = useCallback(
    async (tokenAddress: string): Promise<TokenInfo | null> => {
      if (!provider) {
        return null;
      }

      try {
        // Verificar que el contrato tenga código antes de intentar obtener info
        const code = await provider.getCode(tokenAddress);
        if (!code || code === '0x' || code === '0x0') {
          console.warn(`Token ${tokenAddress} no tiene código`);
          return null;
        }

        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [name, symbol, decimals, totalSupply] = await Promise.all([
          token.name().catch(() => 'Unknown'),
          token.symbol().catch(() => 'UNK'),
          token.decimals().catch(() => 18),
          token.totalSupply().catch(() => 0n),
        ]);

        return {
          address: tokenAddress,
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: BigInt(totalSupply.toString()),
          admin: '',
          isPaused: false,
        };
      } catch (err: any) {
        console.error('Error getting token info:', err);
        return null;
      }
    },
    [provider]
  );

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  return {
    tokens,
    loading,
    error,
    loadTokens,
    createToken,
    getTokenInfo,
  };
}

