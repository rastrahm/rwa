'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
// ABI simplificado de IdentityRegistry para verificación
const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_wallet', type: 'address' }],
    name: 'isRegistered',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
import { contracts } from '@/shared/lib/client';

/**
 * Hook para verificar si un usuario tiene identidad verificada
 * antes de permitir comprar tokens
 */
export function useIdentityVerification() {
  const { wallet, provider } = useWallet();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkVerification = useCallback(async (address?: string) => {
    const addressToCheck = address || wallet?.address;
    
    if (!addressToCheck || !provider || !contracts.identityRegistry) {
      setIsVerified(null);
      return false;
    }

    try {
      setChecking(true);

      const registry = new ethers.Contract(
        contracts.identityRegistry,
        IDENTITY_REGISTRY_ABI,
        provider
      );

      const registered = await registry.isRegistered(addressToCheck);
      setIsVerified(registered);
      return registered;
    } catch (err: any) {
      console.error('Error checking identity verification:', err);
      setIsVerified(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, [wallet?.address, provider]);

  return {
    isVerified,
    checking,
    checkVerification,
  };
}

