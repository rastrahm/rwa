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
      const code = await provider.getCode(contracts.identityRegistry);
      if (!code || code === '0x' || code === '0x0') {
        setError('El contrato IdentityRegistry no existe en esta dirección. Por favor, despliega los contratos nuevamente.');
        setIsRegistered(null);
        setIdentityAddress(null);
        return;
      }

      const registry = new ethers.Contract(
        contracts.identityRegistry,
        IDENTITY_REGISTRY_ABI,
        provider
      );

      const registered = await registry.isRegistered(wallet.address);
      setIsRegistered(registered);

      if (registered) {
        const identity = await registry.getIdentity(wallet.address);
        
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
          const code = await provider.getCode(identity);
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

  // Registrar identidad
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

        const registry = new ethers.Contract(
          contracts.identityRegistry,
          IDENTITY_REGISTRY_ABI,
          effectiveSigner
        );

        const tx = await registry.registerIdentity(wallet.address, identityContractAddress);
        const receipt = await tx.wait();

        console.log('✅ Registro completado. Transacción confirmada:', {
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
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

  // Función combinada: desplegar y registrar automáticamente
  const deployAndRegister = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Desplegar contrato Identity
      const { identityAddress } = await deployIdentity();
      
      // Esperar un poco para que el despliegue se confirme completamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Registrar en IdentityRegistry
      const txHash = await registerIdentity(identityAddress);
      
      // Esperar un poco más para que el registro se confirme
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
  }, [deployIdentity, registerIdentity]);

  return {
    isRegistered,
    identityAddress,
    loading,
    error,
    checkRegistration,
    registerIdentity,
    deployIdentity,
    deployAndRegister,
    getIdentity,
  };
}

