'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { IDENTITY_ABI } from '@/app/lib/contracts/abis';
import type { Claim } from '@/app/lib/types/identity';

export function useIdentity(identityAddress: string | null) {
  const { provider, wallet } = useWallet();
  const [owner, setOwner] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar información de la identidad
  const loadIdentity = useCallback(async () => {
    if (!identityAddress || !provider) {
      setOwner(null);
      setClaims([]);
      return;
    }

    // Verificar si la dirección es válida (no es address(0))
    if (identityAddress === ethers.ZeroAddress || !ethers.isAddress(identityAddress)) {
      setOwner(null);
      setClaims([]);
      setError('Dirección de identidad inválida');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar si el contrato tiene código
      let code;
      try {
        code = await provider.getCode(identityAddress);
      } catch (err: any) {
        console.error('Error al obtener código del contrato Identity:', err);
        // Si el error es por URL RPC inválida, mostrar mensaje específico
        if (err.message?.includes('Invalid RPC URL') || err.message?.includes('twnodes')) {
          setError('Error de conexión: La URL RPC configurada en MetaMask es inválida. Por favor, configura MetaMask para usar Anvil en localhost:8545.');
        } else {
          setError(`Error al conectar con la blockchain: ${err.message || 'Error desconocido'}`);
        }
        setOwner(null);
        setClaims([]);
        return;
      }
      
      if (code === '0x' || code === '0x0') {
        setOwner(null);
        setClaims([]);
        setError('El contrato de identidad no existe en esta dirección');
        return;
      }

      const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, provider);

      // Obtener owner (con manejo de errores específico)
      try {
        const ownerAddress = await identity.owner();
        setOwner(ownerAddress);
      } catch (ownerErr: any) {
        // Si el método owner() no existe o falla, puede ser que el contrato no sea un Identity válido
        console.warn('No se pudo obtener el owner del contrato Identity:', ownerErr);
        setOwner(null);
        setError('El contrato no parece ser un Identity válido');
      }

      // Nota: Para obtener todos los claims, necesitaríamos eventos o una función adicional
      // Por ahora, los claims se cargarán individualmente cuando se necesiten
      setClaims([]);
    } catch (err: any) {
      console.error('Error loading identity:', err);
      // No establecer error si es solo que el contrato no existe
      if (err.message?.includes('could not decode') || err.message?.includes('BAD_DATA')) {
        setError('El contrato de identidad no es válido o no tiene el formato esperado');
      } else {
        setError(err.message || 'Error al cargar identidad');
      }
      setOwner(null);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [identityAddress, provider]);

  // Obtener un claim específico
  const getClaim = useCallback(
    async (topic: bigint, issuer: string) => {
      if (!identityAddress || !provider) {
        return null;
      }

      try {
        const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, provider);
        const exists = await identity.claimExists(topic, issuer);
        
        if (!exists) {
          return null;
        }

        const claimData = await identity.getClaim(topic, issuer);
        return {
          topic: claimData.topic,
          scheme: claimData.scheme,
          issuer: claimData.issuer,
          signature: claimData.signature,
          data: claimData.data,
          uri: claimData.uri,
        } as Claim;
      } catch (err: any) {
        console.error('Error getting claim:', err);
        return null;
      }
    },
    [identityAddress, provider]
  );

  // Agregar un claim (con validaciones de producción)
  const addClaim = useCallback(
    async (
      topic: bigint,
      scheme: bigint,
      issuer: string,
      signature: string,
      data: string,
      uri: string
    ) => {
      if (!identityAddress || !wallet?.signer || !provider) {
        throw new Error('Identity no disponible o wallet no conectado');
      }

      // Validar que la dirección no sea la dirección del wallet (error común)
      if (identityAddress.toLowerCase() === wallet.address.toLowerCase()) {
        throw new Error('La dirección del contrato Identity no puede ser la misma que la dirección del wallet. El contrato Identity no está desplegado correctamente.');
      }

      // Validar que la dirección no sea address(0)
      if (identityAddress === ethers.ZeroAddress || !ethers.isAddress(identityAddress)) {
        throw new Error('Dirección de contrato Identity inválida');
      }

      // Validar dirección del issuer
      if (!issuer || !ethers.isAddress(issuer)) {
        throw new Error('Dirección del issuer inválida');
      }

      try {
        setLoading(true);
        setError(null);

        // Verificar si el contrato existe en la blockchain
        let code;
        try {
          code = await provider.getCode(identityAddress);
        } catch (err: any) {
          console.error('Error al obtener código del contrato Identity:', err);
          // Si el error es por URL RPC inválida, mostrar mensaje específico
          if (err.message?.includes('Invalid RPC URL') || err.message?.includes('twnodes')) {
            throw new Error('Error de conexión: La URL RPC configurada en MetaMask es inválida. Por favor, configura MetaMask para usar Anvil en localhost:8545.');
          }
          throw err;
        }
        
        if (!code || code === '0x' || code === '0x0') {
          throw new Error('El contrato Identity no existe en esta dirección. Por favor, verifica que el contrato esté desplegado correctamente.');
        }

        // Validaciones de producción: Verificar Trusted Issuer
        // Nota: Estas validaciones se hacen en el componente AddClaim antes de llamar a addClaim
        // pero las mantenemos aquí como capa adicional de seguridad
        console.log('🔍 Validaciones de producción antes de agregar claim:', {
          topic: topic.toString(),
          scheme: scheme.toString(),
          issuer: issuer.toLowerCase(),
          hasSignature: signature && signature !== '0x',
          hasData: data && data !== '0x',
        });

        const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, wallet.signer);

        // Verificar que el usuario es el owner del Identity Contract
        try {
          const owner = await identity.owner();
          if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
            throw new Error('Solo el owner del contrato Identity puede agregar claims. Verifica que estés usando el wallet correcto.');
          }
        } catch (ownerErr: any) {
          console.warn('No se pudo verificar el owner (puede ser normal si el contrato no tiene método owner):', ownerErr);
          // Continuar si no se puede verificar el owner
        }

        console.log('📝 Enviando transacción para agregar claim...');
        const tx = await identity.addClaim(topic, scheme, issuer, signature, data, uri);
        console.log('⏳ Esperando confirmación...');
        await tx.wait();
        console.log('✅ Claim agregado exitosamente');

        // Recargar identidad después de agregar claim
        await loadIdentity();

        return tx.hash;
      } catch (err: any) {
        console.error('Error adding claim:', err);
        
        // Mensajes de error más específicos
        let errorMessage = err.message || 'Error al agregar claim';
        
        if (err.message?.includes('could not decode') || err.message?.includes('BAD_DATA')) {
          errorMessage = 'El contrato Identity no es válido o no tiene el formato esperado. Verifica que el contrato esté desplegado correctamente.';
        } else if (err.message?.includes('execution reverted')) {
          errorMessage = `Error en la transacción: ${err.reason || err.message}`;
        } else if (err.message?.includes('user rejected') || err.code === 4001) {
          errorMessage = 'Transacción cancelada por el usuario.';
        }
        
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [identityAddress, wallet?.signer, wallet?.address, provider, loadIdentity]
  );

  // Remover un claim
  const removeClaim = useCallback(
    async (topic: bigint, issuer: string) => {
      if (!identityAddress || !wallet?.signer) {
        throw new Error('Identity no disponible o wallet no conectado');
      }

      try {
        setLoading(true);
        setError(null);

        const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, wallet.signer);

        const tx = await identity.removeClaim(topic, issuer);
        await tx.wait();

        // Recargar identidad después de remover claim
        await loadIdentity();

        return tx.hash;
      } catch (err: any) {
        console.error('Error removing claim:', err);
        setError(err.message || 'Error al remover claim');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [identityAddress, wallet?.signer, loadIdentity]
  );

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  return {
    owner,
    claims,
    loading,
    error,
    loadIdentity,
    getClaim,
    addClaim,
    removeClaim,
  };
}

