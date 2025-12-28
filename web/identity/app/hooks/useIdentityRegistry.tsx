'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { IDENTITY_REGISTRY_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';
import { IDENTITY_BYTECODE, IDENTITY_CONSTRUCTOR_ABI } from '@/app/lib/contracts/identity-bytecode';

export function useIdentityRegistry() {
  const { wallet, provider, signer } = useWallet();
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [identityAddress, setIdentityAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar si el wallet está registrado
  const checkRegistration = useCallback(async () => {
    if (!wallet?.address || !provider || !contracts.identityRegistry) {
      setIsRegistered(null);
      setIdentityAddress(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar si el contrato existe en la blockchain
      let code;
      try {
        code = await provider.getCode(contracts.identityRegistry);
      } catch (err: any) {
        console.error('Error al obtener código del contrato:', err);
        // Si el error es por URL RPC inválida, mostrar mensaje específico
        if (err.message?.includes('Invalid RPC URL') || err.message?.includes('twnodes')) {
          setError('Error de conexión: La URL RPC configurada en MetaMask es inválida. Por favor, configura MetaMask para usar Anvil en localhost:8545 o cambia a la red correcta.');
        } else {
          setError(`Error al conectar con la blockchain: ${err.message || 'Error desconocido'}`);
        }
        setIsRegistered(null);
        setIdentityAddress(null);
        return;
      }
      
      if (!code || code === '0x' || code === '0x0') {
        setError('El contrato IdentityRegistry no existe en esta dirección. Por favor, despliega los contratos nuevamente.');
        setIsRegistered(null);
        setIdentityAddress(null);
        return;
      }

      // Crear instancia del contrato con solo el ABI necesario
      // Esto evita que ethers.js intente verificar interfaces automáticamente
      const registry = new ethers.Contract(
        contracts.identityRegistry,
        IDENTITY_REGISTRY_ABI,
        provider
      );
      
      // Deshabilitar verificaciones automáticas de ethers.js
      // Esto previene errores cuando el contrato no implementa ciertas interfaces
      (registry as any)._disableCalls = true;

      // Intentar verificar registro, pero manejar errores silenciosamente
      let registered = false;
      try {
        registered = await registry.isRegistered(wallet.address);
      } catch (err: any) {
        // Si falla isRegistered, asumir que no está registrado
        console.warn('Error checking registration status:', err);
        registered = false;
      }
      
      setIsRegistered(registered);

      if (registered) {
        let identity: string | null = null;
        try {
          identity = await registry.getIdentity(wallet.address);
        } catch (err: any) {
          console.warn('Error getting identity address:', err);
          // Si falla getIdentity, asumir que no hay identity válida
          setIdentityAddress(null);
          setError('El wallet está registrado, pero no se pudo obtener la dirección del contrato Identity.');
          return;
        }
        
        console.log('🔍 getIdentity devolvió:', {
          identity,
          walletAddress: wallet.address,
          isZeroAddress: identity === ethers.ZeroAddress,
          isWalletAddress: identity?.toLowerCase() === wallet.address.toLowerCase(),
          isValidAddress: identity ? ethers.isAddress(identity) : false,
        });
        
        // Validar que la dirección del contrato Identity sea válida
        // No puede ser address(0) ni la dirección del wallet
        if (
          identity &&
          identity !== ethers.ZeroAddress &&
          identity.toLowerCase() !== wallet.address.toLowerCase() &&
          ethers.isAddress(identity)
        ) {
          // Verificar que haya código de contrato en esa dirección
          try {
            let code;
            try {
              code = await provider.getCode(identity);
            } catch (rpcErr: any) {
              console.error('Error al obtener código del contrato Identity (RPC):', rpcErr);
              // Si el error es por URL RPC inválida, mostrar mensaje específico
              if (rpcErr.message?.includes('Invalid RPC URL') || rpcErr.message?.includes('twnodes')) {
                setError('Error de conexión: La URL RPC configurada en MetaMask es inválida. Por favor, configura MetaMask para usar Anvil en localhost:8545.');
              } else {
                setError(`Error al conectar con la blockchain: ${rpcErr.message || 'Error desconocido'}`);
              }
              setIdentityAddress(null);
              return;
            }
            
            if (code && code !== '0x' && code.length > 2) {
              console.log('✅ Dirección de contrato Identity válida con código:', identity);
              setIdentityAddress(identity);
              setError(null); // Limpiar error si todo es válido
            } else {
              console.warn('⚠️ Dirección de contrato Identity no tiene código:', {
                identity,
                code: code || '0x',
              });
              setIdentityAddress(null);
              setError('El wallet está registrado, pero la dirección del contrato Identity no tiene código de contrato. Necesitas desplegar un contrato Identity válido.');
            }
          } catch (codeErr: any) {
            console.warn('Error checking contract code:', codeErr);
            setIdentityAddress(null);
            setError('El wallet está registrado, pero no se pudo verificar el contrato Identity.');
          }
        } else {
          // Si la dirección es inválida, mostrar error pero mantener isRegistered como true
          // porque técnicamente está registrado, solo que el contrato Identity no es válido
          console.warn('⚠️ Dirección de contrato Identity inválida:', {
            identity,
            reason: !identity ? 'null/undefined' :
                    identity === ethers.ZeroAddress ? 'address(0)' :
                    identity.toLowerCase() === wallet.address.toLowerCase() ? 'es la dirección del wallet' :
                    !ethers.isAddress(identity) ? 'no es una dirección válida' : 'desconocido'
          });
          setIdentityAddress(null);
          setError('El wallet está registrado, pero la dirección del contrato Identity no es válida. Necesitas desplegar un contrato Identity válido.');
        }
      } else {
        setIdentityAddress(null);
      }
    } catch (err: any) {
      console.error('Error checking registration:', err);
      
      // Detectar si el error es porque el contrato no existe
      if (err.message?.includes('could not decode') || err.message?.includes('BAD_DATA') || err.code === 'BAD_DATA') {
        setError('El contrato IdentityRegistry no existe o no es válido. Por favor, despliega los contratos nuevamente ejecutando: ./scripts/deploy-and-start.sh');
      } else {
        setError(err.message || 'Error al verificar registro');
      }
      
      setIsRegistered(null);
      setIdentityAddress(null);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address, provider, contracts.identityRegistry]);

  // Desplegar contrato Identity directamente desde el cliente
  const deployIdentity = useCallback(async () => {
    const effectiveSigner = signer ?? wallet?.signer;

    if (!wallet?.address || !provider || !effectiveSigner) {
      throw new Error('Wallet no conectado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Desplegando contrato Identity desde el cliente...');

      // Crear factory para desplegar el contrato usando el signer del usuario
      const factory = new ethers.ContractFactory(
        IDENTITY_CONSTRUCTOR_ABI,
        IDENTITY_BYTECODE,
        effectiveSigner
      );

      // Desplegar el contrato con el wallet del usuario como owner
      const identityContract = await factory.deploy(wallet.address);
      console.log('⏳ Esperando confirmación del despliegue...');
      await identityContract.waitForDeployment();
      
      const identityAddress = await identityContract.getAddress();
      const deployTx = identityContract.deploymentTransaction();
      const txHash = deployTx?.hash || '';

      console.log('✅ Contrato Identity desplegado en:', identityAddress);
      console.log('📝 Hash de transacción:', txHash);

      return { identityAddress, txHash };
    } catch (err: any) {
      console.error('Error deploying Identity:', err);
      setError(err.message || 'Error al desplegar contrato Identity');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wallet?.address, wallet?.signer, provider, signer]);

  // Actualizar identidad (cuando el wallet ya está registrado)
  const updateIdentity = useCallback(
    async (identityContractAddress: string) => {
      console.log('🔍 updateIdentity - estado actual:', {
        walletAddress: wallet?.address,
        hasProvider: !!provider,
        hasWalletSigner: !!wallet?.signer,
        hasContextSigner: !!signer,
        identityRegistryAddress: contracts.identityRegistry,
      });

      const effectiveSigner = signer ?? wallet?.signer;

      if (!wallet?.address || !provider || !effectiveSigner || !contracts.identityRegistry) {
        throw new Error('Wallet no conectado o contrato no configurado');
      }

      try {
        setLoading(true);
        setError(null);

        // Usar registerSelf para actualizar (si ya está registrado, primero debe usar updateIdentity del owner)
        // Por ahora, si el usuario ya está registrado, intentamos usar registerSelf con un nuevo identity
        // Nota: updateIdentity requiere owner, así que si el usuario quiere actualizar, debería usar registerSelf
        // que reemplazará su registro anterior si no está registrado, o fallará si ya está registrado
        const registry = new ethers.Contract(
          contracts.identityRegistry,
          IDENTITY_REGISTRY_ABI,
          effectiveSigner
        );

        // Verificar si ya está registrado
        const isRegistered = await registry.isRegistered(wallet.address);
        if (isRegistered) {
          // Si ya está registrado, no podemos actualizar sin ser owner
          // En este caso, el usuario debería contactar al owner o usar una nueva cuenta
          throw new Error('Ya estás registrado. Para actualizar tu identidad, contacta al administrador del sistema.');
        }

        // Si no está registrado, usar registerSelf
        console.log('📝 Actualizando identidad usando registerSelf...');
        const tx = await registry.registerSelf(identityContractAddress);
        const receipt = await tx.wait();

        console.log('✅ Actualización completada. Transacción confirmada:', {
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber,
          walletAddress: wallet.address,
          identityAddress: identityContractAddress,
        });

        // Esperar un poco para que el estado de la blockchain se actualice
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Actualizar estado después de la transacción
        await checkRegistration();
        
        // Verificar nuevamente después de un breve delay para asegurar que el estado se actualizó
        setTimeout(async () => {
          await checkRegistration();
        }, 2000);

        return tx.hash;
      } catch (err: any) {
        console.error('Error updating identity:', err);
        setError(err.message || 'Error al actualizar identidad');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet?.address, wallet?.signer, provider, signer, checkRegistration]
  );

  // Registrar identidad usando registerSelf (el usuario se registra a sí mismo)
  const registerIdentity = useCallback(
    async (identityContractAddress: string) => {
      console.log('🔍 registerIdentity - estado actual:', {
        walletAddress: wallet?.address,
        hasProvider: !!provider,
        hasWalletSigner: !!wallet?.signer,
        hasContextSigner: !!signer,
        identityRegistryAddress: contracts.identityRegistry,
      });

      const effectiveSigner = signer ?? wallet?.signer;

      if (!wallet?.address || !provider || !effectiveSigner || !contracts.identityRegistry) {
        throw new Error('Wallet no conectado o contrato no configurado');
      }

      try {
        setLoading(true);
        setError(null);

        // Usar registerSelf para que el usuario se registre a sí mismo
        const registry = new ethers.Contract(
          contracts.identityRegistry,
          IDENTITY_REGISTRY_ABI,
          effectiveSigner
        );

        console.log('📝 Registrando identidad usando registerSelf...');
        const tx = await registry.registerSelf(identityContractAddress);
        const receipt = await tx.wait();

        console.log('✅ Registro completado. Transacción confirmada:', {
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber,
          walletAddress: wallet.address,
          identityAddress: identityContractAddress,
        });

        // Esperar un poco para que el estado de la blockchain se actualice
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Actualizar estado después de la transacción
        await checkRegistration();
        
        // Verificar nuevamente después de un breve delay para asegurar que el estado se actualizó
        setTimeout(async () => {
          await checkRegistration();
        }, 2000);

        return tx.hash;
      } catch (err: any) {
        console.error('Error registering identity:', err);
        
        // Manejar error específico de "Wallet already registered"
        if (err.message?.includes('Wallet already registered') || err.reason === 'Wallet already registered') {
          const friendlyError = 'Este wallet ya está registrado. No es necesario registrarlo nuevamente.';
          setError(friendlyError);
          throw new Error(friendlyError);
        }
        
        setError(err.message || 'Error al registrar identidad');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet?.address, wallet?.signer, provider, signer, checkRegistration]
  );

  // Obtener identidad de una dirección
  const getIdentity = useCallback(
    async (address: string) => {
      if (!provider || !contracts.identityRegistry) {
        return null;
      }

      try {
        const registry = new ethers.Contract(
          contracts.identityRegistry,
          IDENTITY_REGISTRY_ABI,
          provider
        );

        const registered = await registry.isRegistered(address);
        if (!registered) {
          return null;
        }

        const identity = await registry.getIdentity(address);
        return identity;
      } catch (err: any) {
        console.error('Error getting identity:', err);
        return null;
      }
    },
    [provider]
  );

  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  // Función combinada: desplegar y registrar/actualizar automáticamente
  const deployAndRegister = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Verificar si el wallet ya está registrado
      let isAlreadyRegistered = false;
      if (wallet?.address && provider && contracts.identityRegistry) {
        try {
          const registry = new ethers.Contract(
            contracts.identityRegistry,
            IDENTITY_REGISTRY_ABI,
            provider
          );
          isAlreadyRegistered = await registry.isRegistered(wallet.address);
        } catch (err) {
          console.warn('Error checking registration status:', err);
          // Continuar asumiendo que no está registrado
        }
      }

      // 2. Desplegar contrato Identity
      const { identityAddress } = await deployIdentity();
      
      // Esperar un poco para que el despliegue se confirme completamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Registrar o actualizar en IdentityRegistry según corresponda
      let txHash: string;
      try {
        if (isAlreadyRegistered) {
          console.log('📝 Wallet ya está registrado, usando updateIdentity...');
          txHash = await updateIdentity(identityAddress);
        } else {
          console.log('📝 Wallet no está registrado, usando registerIdentity...');
          txHash = await registerIdentity(identityAddress);
        }
      } catch (registerErr: any) {
        // Si registerIdentity falla con "Wallet already registered", usar updateIdentity
        if (registerErr.message?.includes('Wallet already registered') || registerErr.reason === 'Wallet already registered') {
          console.log('🔄 registerIdentity falló porque el wallet ya está registrado. Usando updateIdentity...');
          txHash = await updateIdentity(identityAddress);
        } else {
          throw registerErr;
        }
      }
      
      // Esperar un poco más para que el registro/actualización se confirme
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Forzar verificación del estado
      await checkRegistration();
      
      return { identityAddress, txHash };
    } catch (err: any) {
      console.error('Error en deployAndRegister:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [deployIdentity, registerIdentity, updateIdentity, wallet?.address, provider, checkRegistration]);

  return {
    isRegistered,
    identityAddress,
    loading,
    error,
    checkRegistration,
    registerIdentity,
    updateIdentity,
    deployIdentity,
    deployAndRegister,
    getIdentity,
  };
}

