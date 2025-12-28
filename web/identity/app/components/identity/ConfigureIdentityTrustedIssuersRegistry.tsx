'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/app/hooks/useWallet';
import { useIdentity } from '@/app/hooks/useIdentity';
import { useIdentityRegistry } from '@/app/hooks/useIdentityRegistry';
import { IDENTITY_ABI } from '@/app/lib/contracts/abis';
import { contracts } from '@/shared/lib/client';

export function ConfigureIdentityTrustedIssuersRegistry() {
  const { wallet, provider, signer } = useWallet();
  const { identityAddress, deployAndRegister, checkRegistration } = useIdentityRegistry();
  const { owner, loadIdentity } = useIdentity(identityAddress);
  
  const [currentRegistry, setCurrentRegistry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [functionExists, setFunctionExists] = useState<boolean | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Verificar si el wallet conectado es el owner
  const isOwner = wallet?.address && owner && 
    wallet.address.toLowerCase() === owner.toLowerCase();

  // Verificar si el contrato tiene la función al cargar
  useEffect(() => {
    const verifyFunction = async () => {
      if (identityAddress && provider) {
        try {
          const check = await checkFunctionExists();
          setFunctionExists(check.exists);
        } catch (err) {
          console.warn('Error verifying function existence:', err);
          setFunctionExists(null);
        }
      } else {
        setFunctionExists(null);
      }
    };
    verifyFunction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityAddress, provider]);

  // Cargar el TrustedIssuersRegistry actual del contrato Identity
  const loadCurrentRegistry = useCallback(async () => {
    if (!identityAddress || !provider) {
      setCurrentRegistry(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, provider);
      
      try {
        // Intentar obtener el TrustedIssuersRegistry
        const registryAddress = await identity.trustedIssuersRegistry();
        if (registryAddress && registryAddress !== ethers.ZeroAddress) {
          setCurrentRegistry(registryAddress);
        } else {
          setCurrentRegistry(null);
        }
      } catch (err: any) {
        // Si falla, intentar con call directo
        try {
          const iface = new ethers.Interface(IDENTITY_ABI);
          const data = iface.encodeFunctionData('trustedIssuersRegistry', []);
          const result = await provider.call({
            to: identityAddress,
            data: data
          });
          
          if (result && result !== '0x' && result !== '0x0000000000000000000000000000000000000000') {
            const decoded = iface.decodeFunctionResult('trustedIssuersRegistry', result);
            const registryAddress = decoded[0];
            if (registryAddress && registryAddress !== ethers.ZeroAddress) {
              setCurrentRegistry(registryAddress);
            } else {
              setCurrentRegistry(null);
            }
          } else {
            setCurrentRegistry(null);
          }
        } catch (callErr: any) {
          console.warn('No se pudo leer el TrustedIssuersRegistry del contrato Identity:', callErr);
          // Si falla con require(false), significa que el contrato tiene uno configurado pero no podemos leerlo
          // Esto puede pasar si el contrato tiene validaciones internas que fallan
          if (callErr.message?.includes('require(false)') || callErr.message?.includes('execution reverted')) {
            setCurrentRegistry('UNKNOWN - No se puede leer (posiblemente configurado pero diferente al global)');
            setError('⚠️ El contrato Identity tiene un TrustedIssuersRegistry configurado, pero no se puede leer. Esto puede causar problemas al agregar claims. Configura el TrustedIssuersRegistry global para solucionarlo.');
          } else {
            setCurrentRegistry(null);
            setError('No se pudo leer el TrustedIssuersRegistry actual del contrato Identity');
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading current registry:', err);
      setError(err.message || 'Error al cargar el TrustedIssuersRegistry actual');
    } finally {
      setLoading(false);
    }
  }, [identityAddress, provider]);

  // Verificar si el contrato tiene la función setTrustedIssuersRegistry
  const checkFunctionExists = useCallback(async (): Promise<{ exists: boolean; reason?: string }> => {
    if (!identityAddress || !provider) {
      return { exists: false, reason: 'No hay identityAddress o provider' };
    }

    try {
      // Primero verificar que el contrato tiene código
      const code = await provider.getCode(identityAddress);
      if (!code || code === '0x' || code === '0x0') {
        return { exists: false, reason: 'El contrato no tiene código en esta dirección' };
      }

      const iface = new ethers.Interface(IDENTITY_ABI);
      const functionFragment = iface.getFunction('setTrustedIssuersRegistry');
      if (!functionFragment) {
        return { exists: false, reason: 'La función no está en el ABI' };
      }

      // Obtener el selector de función (primeros 4 bytes del hash de la firma)
      const functionSelector = functionFragment.selector;
      
      // Verificar si el selector está presente en el bytecode del contrato
      // Esto es la forma más confiable de verificar si una función existe
      if (!code.includes(functionSelector.slice(2).toLowerCase())) {
        console.log('❌ Selector de función no encontrado en bytecode:', {
          selector: functionSelector,
          contractAddress: identityAddress,
          codeLength: code.length
        });
        return { 
          exists: false, 
          reason: 'La función setTrustedIssuersRegistry no existe en el contrato desplegado. Puedes desplegar un nuevo contrato Identity que incluya esta función usando el botón "Actualizar a Nuevo Contrato Identity".' 
        };
      }

      console.log('✅ Selector de función encontrado en bytecode:', {
        selector: functionSelector,
        contractAddress: identityAddress
      });

      // Si el selector está presente, la función existe
      // Ahora intentar estimateGas para verificar que se puede llamar (aunque falle por permisos)
      const data = iface.encodeFunctionData('setTrustedIssuersRegistry', [ethers.ZeroAddress]);
      
      try {
        await provider.estimateGas({
          to: identityAddress,
          data: data,
          from: wallet?.address || ethers.ZeroAddress,
        });
        return { exists: true };
      } catch (gasErr: any) {
        // Si el error es "no matching fragment" o "invalid opcode", la función no existe
        if (gasErr.message?.includes('no matching fragment') || 
            gasErr.message?.includes('function does not exist') ||
            gasErr.message?.includes('invalid opcode')) {
          return { exists: false, reason: 'La función no existe en el contrato desplegado' };
        }
        // Si es un error de permisos o require(false), la función existe pero falló por otra razón
        // PERO solo si el selector está en el bytecode (ya lo verificamos arriba)
        if (gasErr.message?.includes('execution reverted') || 
            gasErr.message?.includes('require(false)')) {
          return { exists: true, reason: 'La función existe pero la transacción fue revertida (posible problema de permisos o validaciones internas)' };
        }
        // Si es otro error, asumimos que la función existe (porque el selector está presente)
        return { exists: true, reason: `Error al verificar: ${gasErr.message}` };
      }
    } catch (err: any) {
      console.warn('Error checking function existence:', err);
      // Si no podemos verificar, asumimos que NO existe para evitar errores
      return { exists: false, reason: `No se pudo verificar: ${err.message}` };
    }
  }, [identityAddress, provider, wallet?.address]);

  // Configurar el TrustedIssuersRegistry del contrato Identity
  const setTrustedIssuersRegistry = useCallback(async (registryAddress: string) => {
    if (!identityAddress || !signer || !isOwner) {
      throw new Error('No tienes permisos para configurar el TrustedIssuersRegistry');
    }

    if (!ethers.isAddress(registryAddress)) {
      throw new Error('Dirección del TrustedIssuersRegistry inválida');
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      // Verificar que la función existe en el contrato
      const functionCheck = await checkFunctionExists();
      if (!functionCheck.exists) {
        throw new Error(
          `El contrato Identity desplegado no tiene la función setTrustedIssuersRegistry. ` +
          `Razón: ${functionCheck.reason || 'Desconocida'}\n\n` +
          `Esto puede ocurrir si el contrato fue desplegado con una versión anterior. ` +
          `Necesitas desplegar una nueva versión del contrato Identity que incluya esta función.`
        );
      }
      
      if (functionCheck.reason) {
        console.warn('⚠️ Advertencia al verificar función:', functionCheck.reason);
      }

      // Verificar nuevamente que el wallet es el owner (doble verificación)
      const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, provider);
      let contractOwner: string;
      try {
        contractOwner = await identity.owner();
      } catch (ownerErr: any) {
        throw new Error('No se pudo verificar el owner del contrato. El contrato podría no ser un Identity válido.');
      }

      if (contractOwner.toLowerCase() !== wallet?.address.toLowerCase()) {
        throw new Error(
          `El wallet conectado (${wallet?.address}) no es el owner del contrato Identity. ` +
          `Owner actual: ${contractOwner}`
        );
      }

      const identityWithSigner = new ethers.Contract(identityAddress, IDENTITY_ABI, signer);
      
      console.log('📝 Configurando TrustedIssuersRegistry en el contrato Identity...', {
        identityAddress,
        registryAddress,
        owner: wallet?.address,
        contractOwner,
      });

      // Intentar la transacción
      const tx = await identityWithSigner.setTrustedIssuersRegistry(registryAddress);
      console.log('⏳ Esperando confirmación...', tx.hash);
      await tx.wait();
      console.log('✅ TrustedIssuersRegistry configurado exitosamente');

      setSuccess(`TrustedIssuersRegistry configurado exitosamente. TX: ${tx.hash}`);
      
      // Recargar el registro actual
      await loadCurrentRegistry();
      await loadIdentity();
    } catch (err: any) {
      console.error('Error setting TrustedIssuersRegistry:', err);
      let errorMessage = err.message || 'Error al configurar TrustedIssuersRegistry';
      
        // Mejorar mensajes de error específicos
      if (err.reason) {
        errorMessage = `Error: ${err.reason}`;
      } else if (err.message?.includes('execution reverted')) {
        if (err.message?.includes('require(false)') || err.data === '0x') {
          // Error específico: require(false) sin datos
          errorMessage = 
            '❌ El contrato Identity rechazó la transacción con require(false).\n\n' +
            '🔍 Posibles causas:\n' +
            '1. El contrato desplegado NO tiene la función setTrustedIssuersRegistry (versión antigua)\n' +
            '2. El wallet conectado no es realmente el owner del contrato\n' +
            '3. El contrato tiene validaciones adicionales que están fallando\n\n' +
            '📋 Información de depuración:\n' +
            `   • Wallet conectado: ${wallet?.address}\n` +
            `   • Owner del contrato: ${owner || 'No se pudo obtener'}\n` +
            `   • Contrato Identity: ${identityAddress}\n\n` +
            '💡 Solución:\n' +
            'Si el contrato no tiene la función setTrustedIssuersRegistry, necesitas:\n' +
            '1. Desplegar una nueva versión del contrato Identity que incluya esta función\n' +
            '2. O actualizar el contrato existente si usa un patrón de upgrade\n' +
            '3. O agregar el issuer directamente al TrustedIssuersRegistry que el contrato ya tiene configurado';
        } else {
          errorMessage = `Error en la transacción: ${err.reason || 'La transacción fue revertida'}`;
        }
      } else if (err.message?.includes('user rejected') || err.code === 4001) {
        errorMessage = 'Transacción cancelada por el usuario.';
      } else if (err.message?.includes('no matching fragment')) {
        errorMessage = 
          '❌ El contrato Identity no tiene la función setTrustedIssuersRegistry.\n\n' +
          '💡 Solución:\n' +
          'Necesitas desplegar una nueva versión del contrato Identity que incluya esta función. ' +
          'El contrato actual fue desplegado con una versión anterior del código.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [identityAddress, signer, isOwner, wallet?.address, owner, provider, checkFunctionExists, loadCurrentRegistry, loadIdentity]);

  // Actualizar a un nuevo contrato Identity con la función setTrustedIssuersRegistry
  const handleUpgradeIdentity = useCallback(async () => {
    if (!wallet?.address || !signer) {
      setError('Wallet no conectado');
      return;
    }

    try {
      setIsUpgrading(true);
      setError(null);
      setSuccess(null);

      console.log('🔄 Actualizando contrato Identity a versión con setTrustedIssuersRegistry...');

      // Desplegar nuevo Identity y actualizar IdentityRegistry
      const { identityAddress: newIdentityAddress, txHash } = await deployAndRegister();
      
      console.log('✅ Nuevo contrato Identity desplegado:', newIdentityAddress);
      setSuccess(`Nuevo contrato Identity desplegado: ${newIdentityAddress}. TX: ${txHash}`);

      // Esperar a que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Recargar el registro para obtener la nueva dirección
      await checkRegistration();
      
      // Esperar un poco más para que el componente se actualice con la nueva dirección
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Si hay TrustedIssuersRegistry global, intentar configurarlo automáticamente
      if (contracts.trustedIssuersRegistry) {
        console.log('🔧 Configurando TrustedIssuersRegistry en el nuevo contrato...');
        try {
          // Esperar a que el componente detecte la nueva dirección
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Intentar configurar el TrustedIssuersRegistry
          // Nota: Esto puede fallar si el componente aún no se ha actualizado con la nueva dirección
          // En ese caso, el usuario puede hacer clic manualmente en el botón de configurar
          setSuccess(
            `✅ Nuevo contrato Identity desplegado. ` +
            `Ahora puedes configurar el TrustedIssuersRegistry usando el botón de abajo.`
          );
        } catch (configErr: any) {
          console.warn('No se pudo configurar automáticamente el TrustedIssuersRegistry:', configErr);
          setSuccess(
            `✅ Nuevo contrato Identity desplegado. ` +
            `Por favor, recarga la página y luego configura el TrustedIssuersRegistry.`
          );
        }
      }
    } catch (err: any) {
      console.error('Error upgrading Identity:', err);
      setError(err.message || 'Error al actualizar el contrato Identity');
    } finally {
      setIsUpgrading(false);
    }
  }, [wallet?.address, signer, deployAndRegister, checkRegistration]);

  // Configurar para usar el TrustedIssuersRegistry global
  const handleSetGlobalRegistry = async () => {
    if (!contracts.trustedIssuersRegistry) {
      setError('No hay TrustedIssuersRegistry global configurado');
      return;
    }

    try {
      await setTrustedIssuersRegistry(contracts.trustedIssuersRegistry);
    } catch (err) {
      // El error ya se estableció en setTrustedIssuersRegistry
    }
  };

  useEffect(() => {
    loadCurrentRegistry();
  }, [loadCurrentRegistry]);

  // No mostrar nada si no hay identityAddress
  if (!identityAddress) {
    return null;
  }

  // Solo mostrar si el wallet conectado es el owner
  if (!isOwner) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Configurar TrustedIssuersRegistry
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Solo el owner del contrato Identity puede configurar el TrustedIssuersRegistry.
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-2">
            Owner actual: <span className="font-mono">{owner}</span>
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            Wallet conectado: <span className="font-mono">{wallet?.address}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Configurar TrustedIssuersRegistry del Contrato Identity
      </h3>
      
      <div className="space-y-4">
        {/* Estado actual */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            TrustedIssuersRegistry Actual
          </label>
          {loading ? (
            <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          ) : currentRegistry ? (
            <div>
              <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                {currentRegistry}
              </p>
              {currentRegistry.includes('UNKNOWN') && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  ⚠️ El contrato tiene un TrustedIssuersRegistry configurado, pero no se puede leer.
                  Esto puede causar problemas al agregar claims. Configura el TrustedIssuersRegistry global para solucionarlo.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No configurado
            </p>
          )}
        </div>

        {/* Advertencia si el contrato no tiene la función */}
        {functionExists === false && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 font-medium mb-2">
              ⚠️ El contrato Identity actual no tiene la función setTrustedIssuersRegistry
            </p>
            <p className="text-red-700 dark:text-red-300 text-sm mb-3">
              Puedes desplegar un nuevo contrato Identity que incluya esta función usando el botón "Actualizar a Nuevo Contrato Identity" a continuación.
            </p>
            <button
              onClick={handleUpgradeIdentity}
              disabled={isUpgrading || !wallet?.address || !signer}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isUpgrading ? 'Actualizando contrato Identity...' : '🔄 Actualizar a Nuevo Contrato Identity'}
            </button>
            <p className="text-red-600 dark:text-red-400 text-xs mt-2">
              Esto desplegará un nuevo contrato Identity y actualizará el IdentityRegistry automáticamente.
            </p>
          </div>
        )}

        {/* TrustedIssuersRegistry global */}
        {contracts.trustedIssuersRegistry && functionExists !== false && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              TrustedIssuersRegistry Global
            </label>
            <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
              {contracts.trustedIssuersRegistry}
            </p>
          </div>
        )}

        {/* Botón para configurar */}
        {contracts.trustedIssuersRegistry && functionExists !== false && (
          <div>
            <button
              onClick={handleSetGlobalRegistry}
              disabled={isSubmitting || loading || isUpgrading || (currentRegistry && !currentRegistry.includes('UNKNOWN') && currentRegistry.toLowerCase() === contracts.trustedIssuersRegistry.toLowerCase())}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isSubmitting ? 'Configurando...' : 
               currentRegistry && !currentRegistry.includes('UNKNOWN') && currentRegistry.toLowerCase() === contracts.trustedIssuersRegistry.toLowerCase()
                 ? '✅ Ya está configurado con el global' 
                 : currentRegistry?.includes('UNKNOWN')
                 ? '⚠️ Configurar con TrustedIssuersRegistry Global (Recomendado)'
                 : 'Configurar con TrustedIssuersRegistry Global'}
            </button>
          </div>
        )}

        {/* Mensajes de error y éxito */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-blue-800 dark:text-blue-200 text-xs">
            💡 <strong>Nota:</strong> El contrato Identity verificará que los issuers estén registrados 
            en el TrustedIssuersRegistry configurado antes de permitir agregar claims. 
            Asegúrate de que el issuer esté registrado en el TrustedIssuersRegistry que configures.
          </p>
        </div>
      </div>
    </div>
  );
}

