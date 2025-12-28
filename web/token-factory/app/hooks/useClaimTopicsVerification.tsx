'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { contracts } from '@/shared/lib/client';

// ABI para Identity y IdentityRegistry
const IDENTITY_ABI = [
  'function claimExists(uint256 topic, address issuer) external view returns (bool)',
] as const;

const IDENTITY_REGISTRY_ABI = [
  'function getIdentity(address _wallet) external view returns (address)',
  'function isRegistered(address _wallet) external view returns (bool)',
] as const;

const TRUSTED_ISSUERS_REGISTRY_ABI = [
  'function getTrustedIssuers() external view returns (address[])',
  'function hasClaimTopic(address _issuer, uint256 _claimTopic) external view returns (bool)',
] as const;

export function useClaimTopicsVerification() {
  const { wallet, provider } = useWallet();
  const [checking, setChecking] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    hasAllTopics: boolean;
    missingTopics: number[];
    verifiedTopics: number[];
  } | null>(null);

  /**
   * Verifica si el usuario tiene todos los claim topics requeridos
   * @param requiredTopics Array de IDs de claim topics requeridos
   * @returns true si el usuario tiene todos los topics requeridos
   */
  const verifyClaimTopics = useCallback(
    async (requiredTopics: number[]): Promise<{
      hasAllTopics: boolean;
      missingTopics: number[];
      verifiedTopics: number[];
    }> => {
      if (!wallet?.address || !provider || requiredTopics.length === 0) {
        return {
          hasAllTopics: true, // Si no hay topics requeridos, está OK
          missingTopics: [],
          verifiedTopics: [],
        };
      }

      if (!contracts.identityRegistry || !contracts.trustedIssuersRegistry) {
        return {
          hasAllTopics: false,
          missingTopics: requiredTopics,
          verifiedTopics: [],
        };
      }

      try {
        setChecking(true);

        const identityRegistry = new ethers.Contract(
          contracts.identityRegistry,
          IDENTITY_REGISTRY_ABI,
          provider
        );

        const trustedIssuersRegistry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        // 1. Verificar que el usuario está registrado
        const isRegistered = await identityRegistry.isRegistered(wallet.address);
        if (!isRegistered) {
          setVerificationStatus({
            hasAllTopics: false,
            missingTopics: requiredTopics,
            verifiedTopics: [],
          });
          return {
            hasAllTopics: false,
            missingTopics: requiredTopics,
            verifiedTopics: [],
          };
        }

        // 2. Obtener el contrato Identity del usuario
        const identityAddress = await identityRegistry.getIdentity(wallet.address);
        if (!identityAddress || identityAddress === ethers.ZeroAddress) {
          setVerificationStatus({
            hasAllTopics: false,
            missingTopics: requiredTopics,
            verifiedTopics: [],
          });
          return {
            hasAllTopics: false,
            missingTopics: requiredTopics,
            verifiedTopics: [],
          };
        }

        const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, provider);

        // 3. Obtener todos los trusted issuers
        const trustedIssuers = await trustedIssuersRegistry.getTrustedIssuers();

        // 4. Para cada topic requerido, verificar que existe un claim válido
        const verifiedTopics: number[] = [];
        const missingTopics: number[] = [];

        for (const topicId of requiredTopics) {
          let hasValidClaim = false;

          // Buscar un trusted issuer que pueda emitir este topic y que el usuario tenga el claim
          for (const issuerAddress of trustedIssuers) {
            try {
              // Verificar que el issuer puede emitir este topic
              const canIssue = await trustedIssuersRegistry.hasClaimTopic(issuerAddress, topicId);
              if (canIssue) {
                // Verificar que el usuario tiene este claim de este issuer
                const claimExists = await identity.claimExists(topicId, issuerAddress);
                if (claimExists) {
                  hasValidClaim = true;
                  break;
                }
              }
            } catch (err) {
              console.warn(`Error verificando claim topic ${topicId} con issuer ${issuerAddress}:`, err);
            }
          }

          if (hasValidClaim) {
            verifiedTopics.push(topicId);
          } else {
            missingTopics.push(topicId);
          }
        }

        const result = {
          hasAllTopics: missingTopics.length === 0,
          missingTopics,
          verifiedTopics,
        };

        setVerificationStatus(result);
        return result;
      } catch (err: any) {
        console.error('Error verifying claim topics:', err);
        setVerificationStatus({
          hasAllTopics: false,
          missingTopics: requiredTopics,
          verifiedTopics: [],
        });
        return {
          hasAllTopics: false,
          missingTopics: requiredTopics,
          verifiedTopics: [],
        };
      } finally {
        setChecking(false);
      }
    },
    [wallet?.address, provider]
  );

  return {
    verifyClaimTopics,
    verificationStatus,
    checking,
  };
}

