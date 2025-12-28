'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/app/hooks/useWallet';
// useIdentity no es necesario aquí, usamos el contrato directamente
import { IDENTITY_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';

interface ClaimRequest {
  id: string;
  requesterAddress: string;
  identityAddress: string;
  topic: number;
  scheme: number;
  issuerAddress: string;
  signature?: string;
  dataText?: string;
  dataHex?: string;
  uri?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  claimTxHash?: string;
  rejectionReason?: string;
  issuerNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

// Mapeo de topic IDs a nombres
const TOPIC_OPTIONS: Record<number, string> = {
  1: 'KYC - Know Your Customer',
  2: 'AML - Anti-Money Laundering',
  3: 'PEP - Politically Exposed Person',
  4: 'Sanctions',
  5: 'Geographic',
  6: 'Tax Compliance',
  7: 'Accredited',
  8: 'Risk Assessment',
  9: 'Source of Funds',
  10: 'Storage Verification',
};

export function ApproveClaimRequests() {
  const { wallet, provider, signer } = useWallet();
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isTrustedIssuer, setIsTrustedIssuer] = useState<boolean | null>(null);
  const [checkingIssuer, setCheckingIssuer] = useState(false);

  // Verificar si el wallet conectado es un Trusted Issuer
  useEffect(() => {
    const checkTrustedIssuer = async () => {
      if (!wallet?.address || !provider) {
        setIsTrustedIssuer(null);
        return;
      }

      if (!contracts.trustedIssuersRegistry) {
        setIsTrustedIssuer(false);
        return;
      }

      try {
        setCheckingIssuer(true);
        const { TRUSTED_ISSUERS_REGISTRY_ABI } = await import('@/app/lib/contracts/abis');
        const registry = new ethers.Contract(
          contracts.trustedIssuersRegistry,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        const isTrusted = await registry.isTrustedIssuer(wallet.address);
        setIsTrustedIssuer(isTrusted);
      } catch (err: any) {
        console.error('Error checking trusted issuer:', err);
        setIsTrustedIssuer(false);
      } finally {
        setCheckingIssuer(false);
      }
    };

    checkTrustedIssuer();
  }, [wallet?.address, provider]);

  // Cargar solicitudes de claims pendientes
  const loadClaimRequests = useCallback(async () => {
    if (!wallet?.address || !isTrustedIssuer) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/claims/request?issuerAddress=${wallet.address}&status=pending`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al cargar solicitudes de claims');
      }

      const data = await response.json();
      setClaimRequests(data.claimRequests || []);
    } catch (err: any) {
      console.error('Error loading claim requests:', err);
      setError(err.message || 'Error al cargar solicitudes de claims');
      setClaimRequests([]);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address, isTrustedIssuer]);

  useEffect(() => {
    if (isTrustedIssuer === true) {
      loadClaimRequests();
      // Recargar cada 10 segundos
      const interval = setInterval(loadClaimRequests, 10000);
      return () => clearInterval(interval);
    } else {
      setClaimRequests([]);
    }
  }, [isTrustedIssuer, loadClaimRequests]);

  // Aprobar una solicitud de claim
  const approveClaimRequest = useCallback(async (claimRequest: ClaimRequest) => {
    if (!wallet?.address || !signer || !isTrustedIssuer || !provider) {
      throw new Error('Wallet no conectado, provider no disponible o no eres un Trusted Issuer');
    }

    if (claimRequest.issuerAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error('Solo puedes aprobar solicitudes dirigidas a tu dirección de Trusted Issuer');
    }

    try {
      setProcessingId(claimRequest.id);
      setError(null);

      // Obtener el contrato Identity del solicitante y el issuer
      const identityAddress = claimRequest.identityAddress;
      const issuer = claimRequest.issuerAddress;
      const topic = BigInt(claimRequest.topic);
      
      // Verificar que el wallet conectado es el issuer (requisito del contrato)
      if (wallet.address.toLowerCase() !== issuer.toLowerCase()) {
        throw new Error(`El wallet conectado (${wallet.address}) debe ser el issuer (${issuer}) para agregar el claim`);
      }

      // Verificar que el contrato Identity existe
      const code = await provider.getCode(identityAddress);
      if (!code || code === '0x') {
        throw new Error('El contrato Identity no existe en esta dirección');
      }

      // Instanciar el contrato Identity
      const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, provider);

      // Verificar si el wallet es el owner del contrato Identity
      const identityOwner = await identity.owner();
      const isOwner = identityOwner.toLowerCase() === wallet.address.toLowerCase();

      // Si no es el owner, verificar que el TrustedIssuersRegistry esté configurado
      if (!isOwner) {
        let identityTrustedIssuersRegistry: string | null = null;
        let trustedIssuersRegistryAddress: string | null = null;
        
        try {
          // PRIMERO: Obtener el TrustedIssuersRegistry del contrato Identity (este es el que el contrato usará)
          // Usar un método más robusto que maneje errores de llamada
          try {
            // Intentar con el método normal primero
            identityTrustedIssuersRegistry = await identity.trustedIssuersRegistry();
            console.log('📋 TrustedIssuersRegistry del contrato Identity:', identityTrustedIssuersRegistry);
          } catch (trustedIssuersError: any) {
            console.warn('⚠️ No se pudo obtener trustedIssuersRegistry del contrato Identity con método normal:', trustedIssuersError.message);
            
            // Si falla, intentar con provider.call() directamente
            try {
              const iface = new ethers.Interface(IDENTITY_ABI);
              const data = iface.encodeFunctionData('trustedIssuersRegistry', []);
              const result = await provider.call({
                to: identityAddress,
                data: data
              });
              
              if (result && result !== '0x' && result !== '0x0000000000000000000000000000000000000000') {
                // Decodificar el resultado
                const decoded = iface.decodeFunctionResult('trustedIssuersRegistry', result);
                identityTrustedIssuersRegistry = decoded[0];
                console.log('📋 TrustedIssuersRegistry del contrato Identity (obtenido con call):', identityTrustedIssuersRegistry);
              } else {
                identityTrustedIssuersRegistry = ethers.ZeroAddress;
                console.log('📋 El contrato Identity no tiene TrustedIssuersRegistry configurado (es ZeroAddress)');
              }
            } catch (callError: any) {
              console.warn('⚠️ No se pudo obtener trustedIssuersRegistry con call directo:', callError.message);
              // Si ambos métodos fallan, asumir que el contrato tiene uno configurado pero no podemos leerlo
              // Usar el global para validar, pero advertir que podría ser diferente
              identityTrustedIssuersRegistry = null;
              console.warn('⚠️ No se pudo leer el TrustedIssuersRegistry del contrato Identity. ' +
                'El contrato podría tener uno configurado que no podemos leer. ' +
                'Usaremos el TrustedIssuersRegistry global para validar, pero el contrato usará el suyo.');
            }
          }
          
          // Si el contrato Identity tiene un TrustedIssuersRegistry configurado, DEBEMOS usarlo
          if (identityTrustedIssuersRegistry && identityTrustedIssuersRegistry !== ethers.ZeroAddress) {
            trustedIssuersRegistryAddress = identityTrustedIssuersRegistry;
            console.log('✅ Usando TrustedIssuersRegistry del contrato Identity:', trustedIssuersRegistryAddress);
          } else {
            // Si no está configurado, el contrato no verificará, pero es mejor advertir
            console.warn('⚠️ El contrato Identity no tiene TrustedIssuersRegistry configurado. ' +
              'El contrato no verificará si el issuer es confiable, pero es recomendable configurarlo.');
            
            // Si hay un global, podemos usarlo para validar, pero el contrato no lo usará
            if (contracts.trustedIssuersRegistry) {
              trustedIssuersRegistryAddress = contracts.trustedIssuersRegistry;
              console.log('📋 Usando TrustedIssuersRegistry global para validación (el contrato no lo usará):', trustedIssuersRegistryAddress);
            } else {
              // Si no hay ninguno, no podemos validar, pero el contrato tampoco verificará
              console.warn('⚠️ No hay TrustedIssuersRegistry configurado. El contrato no verificará si el issuer es confiable.');
              trustedIssuersRegistryAddress = null;
            }
          }

          // Si tenemos un TrustedIssuersRegistry (del contrato o global), validar
          if (trustedIssuersRegistryAddress) {
            const { TRUSTED_ISSUERS_REGISTRY_ABI } = await import('@/app/lib/contracts/abis');
            const trustedIssuersRegistry = new ethers.Contract(
              trustedIssuersRegistryAddress,
              TRUSTED_ISSUERS_REGISTRY_ABI,
              provider
            );

            const isTrusted = await trustedIssuersRegistry.isTrustedIssuer(issuer);
            console.log('🔍 Verificando issuer:', {
              issuer,
              registry: trustedIssuersRegistryAddress,
              isTrusted,
            });
            
            if (!isTrusted) {
              throw new Error(
                `El issuer ${issuer} no está registrado como Trusted Issuer en el TrustedIssuersRegistry (${trustedIssuersRegistryAddress}). ` +
                `Debe ser agregado primero usando addTrustedIssuer() en ese registro. ` +
                `Si el contrato Identity tiene su propio TrustedIssuersRegistry configurado, el issuer debe estar registrado en ESE registro específico.`
              );
            }

            // Verificar que el issuer tiene permiso para emitir este topic
            const hasTopic = await trustedIssuersRegistry.hasClaimTopic(issuer, topic);
            if (!hasTopic) {
              throw new Error(
                `El Trusted Issuer ${issuer} no tiene permiso para emitir el topic ${topic} en el TrustedIssuersRegistry (${trustedIssuersRegistryAddress}). ` +
                `Debe ser agregado usando updateIssuerClaimTopics() o addTrustedIssuer() en ese registro.`
              );
            }
            
            console.log('✅ Validaciones pasadas:', {
              isOwner,
              trustedIssuersRegistry: trustedIssuersRegistryAddress,
              isTrusted,
              hasTopic,
            });
          } else {
            console.log('⚠️ No se puede validar el issuer porque no hay TrustedIssuersRegistry configurado. ' +
              'El contrato Identity tampoco verificará, así que debería funcionar.');
          }
        } catch (checkError: any) {
          // Si el error es de validación, lanzarlo
          if (checkError.message?.includes('no tiene permiso') || 
              checkError.message?.includes('no está registrado') ||
              checkError.message?.includes('no tiene configurado')) {
            throw checkError;
          }
          // Si es otro error, lanzarlo también para que el usuario sepa qué pasó
          throw new Error(`Error al verificar permisos: ${checkError.message}`);
        }
      } else {
        console.log('✅ El wallet es el owner del contrato Identity, no se requiere TrustedIssuersRegistry');
      }

      // Preparar los datos del claim
      const scheme = BigInt(claimRequest.scheme);
      const signature = claimRequest.signature || '0x';
      const data = claimRequest.dataHex || (claimRequest.dataText ? ethers.toUtf8Bytes(claimRequest.dataText) : '0x');
      const dataHex = typeof data === 'string' ? data : ethers.hexlify(data);
      const uri = claimRequest.uri || '';

      // Instanciar el contrato Identity con el signer para la transacción
      const identityWithSigner = new ethers.Contract(identityAddress, IDENTITY_ABI, signer);

      // Verificaciones finales antes de intentar la transacción
      console.log('🔍 Verificaciones finales antes de agregar el claim:', {
        walletAddress: wallet.address,
        issuerAddress: issuer,
        identityAddress,
        identityOwner,
        isOwner,
        topic: topic.toString(),
        walletIsIssuer: wallet.address.toLowerCase() === issuer.toLowerCase(),
      });

      // Verificar que el wallet conectado es el issuer
      if (wallet.address.toLowerCase() !== issuer.toLowerCase()) {
        throw new Error(
          `El wallet conectado (${wallet.address}) debe ser el issuer (${issuer}) para agregar el claim. ` +
          `Conecta con la cuenta del issuer o usa el owner del contrato Identity.`
        );
      }

      // Si no es el owner, intentar verificar el TrustedIssuersRegistry del contrato
      // PERO si falla, no bloquear - el contrato lo verificará internamente
      if (!isOwner) {
        let finalIdentityRegistry: string | null = null;
        let registryCheckFailed = false;
        
        try {
          finalIdentityRegistry = await identity.trustedIssuersRegistry();
          console.log('📋 TrustedIssuersRegistry del contrato Identity:', finalIdentityRegistry);
        } catch (e: any) {
          console.warn('⚠️ No se pudo obtener TrustedIssuersRegistry del contrato Identity:', e.message);
          registryCheckFailed = true;
          // Si falla, intentar usar el global para validar (aunque el contrato usará el suyo)
          if (contracts.trustedIssuersRegistry) {
            finalIdentityRegistry = contracts.trustedIssuersRegistry;
            console.log('📋 Usando TrustedIssuersRegistry global para validación:', finalIdentityRegistry);
          }
        }

        if (finalIdentityRegistry && finalIdentityRegistry !== ethers.ZeroAddress) {
          console.log('🔍 Verificación final del TrustedIssuersRegistry:', finalIdentityRegistry);
          try {
            const { TRUSTED_ISSUERS_REGISTRY_ABI } = await import('@/app/lib/contracts/abis');
            const finalRegistry = new ethers.Contract(
              finalIdentityRegistry,
              TRUSTED_ISSUERS_REGISTRY_ABI,
              provider
            );
            
            const finalIsTrusted = await finalRegistry.isTrustedIssuer(issuer);
            const finalHasTopic = await finalRegistry.hasClaimTopic(issuer, topic);
            
            console.log('🔍 Estado final del issuer:', {
              isTrusted: finalIsTrusted,
              hasTopic: finalHasTopic,
              registry: finalIdentityRegistry,
            });

            if (!finalIsTrusted) {
              throw new Error(
                `❌ El issuer ${issuer} NO está registrado como Trusted Issuer en el TrustedIssuersRegistry (${finalIdentityRegistry}). ` +
                `El contrato Identity verificará esto y rechazará la transacción. ` +
                `El owner del TrustedIssuersRegistry debe agregar este issuer usando addTrustedIssuer().`
              );
            }

            if (!finalHasTopic) {
              throw new Error(
                `❌ El Trusted Issuer ${issuer} NO tiene permiso para emitir el topic ${topic} en el TrustedIssuersRegistry (${finalIdentityRegistry}). ` +
                `El contrato Identity verificará esto y rechazará la transacción. ` +
                `El owner del TrustedIssuersRegistry debe agregar este topic usando updateIssuerClaimTopics() o addTrustedIssuer().`
              );
            }
          } catch (checkError: any) {
            // Si la verificación falla y no pudimos obtener el registry del contrato,
            // mostrar un mensaje más claro
            if (registryCheckFailed && checkError.message?.includes('NO está registrado')) {
              throw new Error(
                `❌ No se pudo verificar el TrustedIssuersRegistry del contrato Identity, pero la validación con el registro global falló. ` +
                `El issuer ${issuer} probablemente NO está registrado como Trusted Issuer. ` +
                `El owner del TrustedIssuersRegistry debe agregar este issuer usando addTrustedIssuer(). ` +
                `Error: ${checkError.message}`
              );
            }
            throw checkError;
          }
        } else {
          if (registryCheckFailed) {
            console.warn('⚠️ No se pudo verificar si el contrato Identity tiene TrustedIssuersRegistry configurado. ' +
              'El contrato lo verificará internamente al intentar agregar el claim.');
          } else {
            console.log('✅ El contrato Identity no tiene TrustedIssuersRegistry configurado, no verificará el issuer');
          }
        }
      }

      // Intentar usar addClaimByIssuer (debe funcionar si el wallet es el issuer)
      let tx;
      try {
        console.log('🔄 Llamando a addClaimByIssuer en el contrato Identity...', {
          wallet: wallet.address,
          issuer,
          topic: topic.toString(),
          scheme: scheme.toString(),
        });
        
        tx = await identityWithSigner.addClaimByIssuer(
          topic,
          scheme,
          issuer,
          signature,
          dataHex,
          uri
        );
        console.log('✅ addClaimByIssuer exitoso, esperando confirmación...');
      } catch (addClaimByIssuerError: any) {
        console.error('❌ Error en addClaimByIssuer:', addClaimByIssuerError);
        
        // Si el error es porque la función no existe (no matching fragment), intentar addClaim como fallback
        if (addClaimByIssuerError.message?.includes('no matching fragment')) {
          console.log('⚠️ addClaimByIssuer no existe en el contrato, intentando addClaim como fallback...');
          
          // Verificar que el wallet es el owner antes de usar addClaim
          const identityOwner = await identity.owner();
          if (identityOwner.toLowerCase() !== wallet.address.toLowerCase()) {
            throw new Error(
              `No se puede agregar el claim: el contrato Identity no tiene la función addClaimByIssuer y el wallet conectado no es el owner. ` +
              `Owner: ${identityOwner}, Wallet: ${wallet.address}, Issuer: ${issuer}. ` +
              `El contrato Identity necesita tener la función addClaimByIssuer o el wallet debe ser el owner.`
            );
          }
          
          // Usar addClaim como fallback (solo funciona si es owner)
          console.log('✅ Usando addClaim (wallet es owner)...');
          tx = await identityWithSigner.addClaim(
            topic,
            scheme,
            issuer,
            signature,
            dataHex,
            uri
          );
        } else {
          // Para otros errores (execution reverted, etc.), mostrar el error real
          let errorMessage = addClaimByIssuerError.message || 'Error desconocido';
          
          // Intentar extraer el mensaje de revert si existe
          if (addClaimByIssuerError.reason) {
            errorMessage = addClaimByIssuerError.reason;
          } else if (addClaimByIssuerError.data && addClaimByIssuerError.data !== '0x') {
            // Intentar decodificar el error si hay datos
            try {
              const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], addClaimByIssuerError.data);
              if (decoded && decoded[0]) {
                errorMessage = decoded[0];
              }
            } catch (e) {
              // Si no se puede decodificar, intentar otros formatos
              console.warn('No se pudo decodificar el error:', e);
            }
          }
          
          // Si el error es "require(false)" o "no data present", es probable que sea una validación fallida
          if (errorMessage.includes('require(false)') || 
              errorMessage.includes('no data present') ||
              (addClaimByIssuerError.data === '0x' && errorMessage.includes('execution reverted'))) {
            
            // Obtener el TrustedIssuersRegistry del contrato Identity para verificar
            let identityTrustedIssuersRegistry: string | null = null;
            try {
              identityTrustedIssuersRegistry = await identity.trustedIssuersRegistry();
            } catch (e) {
              // Ignorar errores al obtener el registry
            }
            
            if (identityTrustedIssuersRegistry && identityTrustedIssuersRegistry !== ethers.ZeroAddress) {
              // El contrato tiene TrustedIssuersRegistry configurado, verificar si el issuer está registrado
              const { TRUSTED_ISSUERS_REGISTRY_ABI } = await import('@/app/lib/contracts/abis');
              const identityRegistry = new ethers.Contract(
                identityTrustedIssuersRegistry,
                TRUSTED_ISSUERS_REGISTRY_ABI,
                provider
              );
              
              try {
                const isTrusted = await identityRegistry.isTrustedIssuer(issuer);
                const hasTopic = await identityRegistry.hasClaimTopic(issuer, topic);
                
                if (!isTrusted) {
                  throw new Error(
                    `El issuer ${issuer} NO está registrado como Trusted Issuer en el TrustedIssuersRegistry del contrato Identity (${identityTrustedIssuersRegistry}). ` +
                    `El contrato Identity está configurado para verificar que los issuers sean confiables, pero este issuer no está registrado. ` +
                    `El owner del TrustedIssuersRegistry debe agregar este issuer usando addTrustedIssuer().`
                  );
                }
                
                if (!hasTopic) {
                  throw new Error(
                    `El Trusted Issuer ${issuer} NO tiene permiso para emitir el topic ${topic} en el TrustedIssuersRegistry del contrato Identity (${identityTrustedIssuersRegistry}). ` +
                    `El contrato Identity está configurado para verificar permisos, pero este issuer no tiene permiso para este topic. ` +
                    `El owner del TrustedIssuersRegistry debe agregar este topic usando updateIssuerClaimTopics() o addTrustedIssuer().`
                  );
                }
              } catch (checkError: any) {
                // Si la verificación falla, lanzar ese error
                throw checkError;
              }
            }
            
            // Si llegamos aquí, el error es otro tipo de require(false)
            // Verificar nuevamente el estado actual
            const walletIsIssuer = wallet.address.toLowerCase() === issuer.toLowerCase();
            const walletIsOwner = identityOwner.toLowerCase() === wallet.address.toLowerCase();
            
            let registryInfo = '';
            let registryAddress: string | null = null;
            let isTrusted = false;
            let hasTopic = false;
            
            // Intentar obtener el TrustedIssuersRegistry usando el global si el del contrato falla
            try {
              registryAddress = await identity.trustedIssuersRegistry();
              if (registryAddress && registryAddress !== ethers.ZeroAddress) {
                const { TRUSTED_ISSUERS_REGISTRY_ABI } = await import('@/app/lib/contracts/abis');
                const reg = new ethers.Contract(registryAddress, TRUSTED_ISSUERS_REGISTRY_ABI, provider);
                isTrusted = await reg.isTrustedIssuer(issuer);
                hasTopic = await reg.hasClaimTopic(issuer, topic);
                registryInfo = `\nTrustedIssuersRegistry del contrato: ${registryAddress}\n` +
                  `- Issuer registrado: ${isTrusted ? '✅ SÍ' : '❌ NO'}\n` +
                  `- Tiene permiso para topic ${topic}: ${hasTopic ? '✅ SÍ' : '❌ NO'}`;
              } else {
                registryInfo = `\nEl contrato Identity no tiene TrustedIssuersRegistry configurado (es ZeroAddress).`;
              }
            } catch (e: any) {
              // Si falla, intentar con el global
              if (contracts.trustedIssuersRegistry) {
                try {
                  registryAddress = contracts.trustedIssuersRegistry;
                  const { TRUSTED_ISSUERS_REGISTRY_ABI } = await import('@/app/lib/contracts/abis');
                  const reg = new ethers.Contract(registryAddress, TRUSTED_ISSUERS_REGISTRY_ABI, provider);
                  isTrusted = await reg.isTrustedIssuer(issuer);
                  hasTopic = await reg.hasClaimTopic(issuer, topic);
                  registryInfo = `\n⚠️ No se pudo obtener el TrustedIssuersRegistry del contrato Identity.\n` +
                    `Usando TrustedIssuersRegistry global para verificación: ${registryAddress}\n` +
                    `- Issuer registrado: ${isTrusted ? '✅ SÍ' : '❌ NO'}\n` +
                    `- Tiene permiso para topic ${topic}: ${hasTopic ? '✅ SÍ' : '❌ NO'}\n` +
                    `⚠️ NOTA: El contrato Identity podría tener un TrustedIssuersRegistry diferente configurado.`;
                } catch (globalError) {
                  registryInfo = `\n❌ No se pudo verificar el TrustedIssuersRegistry: ${e.message}`;
                }
              } else {
                registryInfo = `\n❌ No se pudo verificar el TrustedIssuersRegistry: ${e.message}`;
              }
            }
            
            // Si el issuer no está registrado o no tiene permiso, ese es el problema
            if (registryAddress && (!isTrusted || !hasTopic)) {
              if (!isTrusted) {
                throw new Error(
                  `❌ El issuer ${issuer} NO está registrado como Trusted Issuer en el TrustedIssuersRegistry (${registryAddress}). ` +
                  `El contrato Identity está rechazando la transacción porque el issuer no está registrado. ` +
                  `El owner del TrustedIssuersRegistry debe agregar este issuer usando addTrustedIssuer().`
                );
              }
              if (!hasTopic) {
                throw new Error(
                  `❌ El Trusted Issuer ${issuer} NO tiene permiso para emitir el topic ${topic} en el TrustedIssuersRegistry (${registryAddress}). ` +
                  `El contrato Identity está rechazando la transacción porque el issuer no tiene permiso para este topic. ` +
                  `El owner del TrustedIssuersRegistry debe agregar este topic usando updateIssuerClaimTopics() o addTrustedIssuer().`
                );
              }
            }
            
            throw new Error(
              `❌ El contrato Identity rechazó la transacción con require(false).\n\n` +
              `Estado actual:\n` +
              `- Wallet conectado: ${wallet.address}\n` +
              `- Issuer requerido: ${issuer}\n` +
              `- Wallet es el issuer: ${walletIsIssuer ? '✅ SÍ' : '❌ NO'}\n` +
              `- Owner del contrato: ${identityOwner}\n` +
              `- Wallet es el owner: ${walletIsOwner ? '✅ SÍ' : '❌ NO'}\n` +
              `${registryInfo}\n\n` +
              `El contrato Identity tiene estas validaciones:\n` +
              `1. msg.sender debe ser el issuer O el owner del contrato (${walletIsIssuer || walletIsOwner ? '✅ Debería pasar' : '❌ FALLA'})\n` +
              `2. Si hay TrustedIssuersRegistry configurado, el issuer debe estar registrado\n` +
              `3. Si hay TrustedIssuersRegistry configurado, el issuer debe tener permiso para el topic\n\n` +
              `💡 SOLUCIÓN: El issuer ${issuer} debe estar registrado como Trusted Issuer en el TrustedIssuersRegistry ` +
              `que tiene configurado el contrato Identity. El owner del TrustedIssuersRegistry debe agregarlo usando addTrustedIssuer().`
            );
          }
          
          // Si el error menciona "Only issuer or owner", verificar que el wallet sea el issuer
          if (errorMessage.includes('Only issuer or owner')) {
            throw new Error(
              `Error de permisos: El wallet conectado (${wallet.address}) debe ser el issuer (${issuer}) o el owner del contrato Identity para agregar el claim. ` +
              `Verifica que estés conectado con la cuenta correcta.`
            );
          }
          
          // Si el error menciona "Issuer must be a trusted issuer", el issuer no está registrado
          if (errorMessage.includes('Issuer must be a trusted issuer')) {
            throw new Error(
              `El issuer ${issuer} no está registrado como Trusted Issuer en el TrustedIssuersRegistry del contrato Identity. ` +
              `Debe ser agregado primero por el owner del TrustedIssuersRegistry.`
            );
          }
          
          throw new Error(`Error al agregar el claim: ${errorMessage}`);
        }
      }
      
      await tx.wait();

      // Actualizar el estado de la solicitud en MongoDB
      // Usar 'completed' porque el claim ya fue agregado exitosamente al contrato
      const updateResponse = await fetch('/api/identity/claim/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimRequestId: claimRequest.id,
          issuerAddress: wallet.address,
          txHash: tx.hash,
          status: 'completed', // 'completed' porque el claim ya fue agregado al contrato
        }),
      });

      if (!updateResponse.ok) {
        console.error('Error updating claim request status:', await updateResponse.text());
        // No lanzar error aquí, el claim ya fue agregado al contrato
      }

      // Recargar solicitudes
      await loadClaimRequests();
    } catch (err: any) {
      console.error('Error approving claim request:', err);
      setError(err.message || 'Error al aprobar solicitud de claim');
      throw err;
    } finally {
      setProcessingId(null);
    }
  }, [wallet?.address, signer, isTrustedIssuer, provider, loadClaimRequests]);

  // Rechazar una solicitud de claim
  const rejectClaimRequest = useCallback(async (claimRequest: ClaimRequest, reason: string) => {
    if (!wallet?.address || !isTrustedIssuer) {
      throw new Error('Wallet no conectado o no eres un Trusted Issuer');
    }

    if (claimRequest.issuerAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error('Solo puedes rechazar solicitudes dirigidas a tu dirección de Trusted Issuer');
    }

    try {
      setProcessingId(claimRequest.id);
      setError(null);

      const response = await fetch('/api/identity/claim/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimRequestId: claimRequest.id,
          issuerAddress: wallet.address,
          rejectionReason: reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al rechazar solicitud');
      }

      // Recargar solicitudes
      await loadClaimRequests();
    } catch (err: any) {
      console.error('Error rejecting claim request:', err);
      setError(err.message || 'Error al rechazar solicitud de claim');
      throw err;
    } finally {
      setProcessingId(null);
    }
  }, [wallet?.address, isTrustedIssuer, loadClaimRequests]);

  if (checkingIssuer) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Aprobar Solicitudes de Claims
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para ver las solicitudes de claims pendientes.
        </p>
      </div>
    );
  }

  if (isTrustedIssuer === false) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Aprobar Solicitudes de Claims
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            ⚠️ No eres un Trusted Issuer
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            Solo los Trusted Issuers registrados pueden aprobar solicitudes de claims.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Aprobar Solicitudes de Claims
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Revisa y aprueba las solicitudes de claims pendientes dirigidas a tu dirección de Trusted Issuer.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading && claimRequests.length === 0 ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : claimRequests.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200">
            No hay solicitudes de claims pendientes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {claimRequests.map((request) => (
            <ClaimRequestCard
              key={request.id}
              request={request}
              onApprove={approveClaimRequest}
              onReject={rejectClaimRequest}
              processing={processingId === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ClaimRequestCardProps {
  request: ClaimRequest;
  onApprove: (request: ClaimRequest) => Promise<void>;
  onReject: (request: ClaimRequest, reason: string) => Promise<void>;
  processing: boolean;
}

function ClaimRequestCard({ request, onApprove, onReject, processing }: ClaimRequestCardProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await onApprove(request);
    } catch (err) {
      // El error ya se maneja en el componente padre
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return;
    }

    try {
      setIsRejecting(true);
      await onReject(request, rejectionReason.trim());
      setShowRejectForm(false);
      setRejectionReason('');
    } catch (err) {
      // El error ya se maneja en el componente padre
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {TOPIC_OPTIONS[request.topic] || `Topic ${request.topic}`}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Solicitante: <span className="font-mono text-xs">{request.requesterAddress}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Identity: <span className="font-mono text-xs">{request.identityAddress}</span>
          </p>
        </div>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Pendiente
        </span>
      </div>

      {request.dataText && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Datos:</strong> {request.dataText}
          </p>
        </div>
      )}

      {request.uri && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>URI:</strong>{' '}
            <a href={request.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
              {request.uri}
            </a>
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleApprove}
          disabled={processing || isApproving || isRejecting}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isApproving ? 'Aprobando...' : 'Aprobar'}
        </button>
        <button
          onClick={() => setShowRejectForm(!showRejectForm)}
          disabled={processing || isApproving || isRejecting}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          Rechazar
        </button>
      </div>

      {showRejectForm && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Razón del rechazo:
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explica por qué se rechaza esta solicitud..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isRejecting || isApproving}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isRejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setRejectionReason('');
              }}
              disabled={isRejecting || isApproving}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

