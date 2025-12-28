'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BrowserProvider, JsonRpcProvider, Eip1193Provider, JsonRpcSigner } from 'ethers';

export interface WalletInfo {
  address: string;
  provider: BrowserProvider;
  chainId: number;
  networkName: string;
  signer: JsonRpcSigner | null;
}

export interface WalletOption {
  name: string;
  provider: Eip1193Provider;
}

function useWalletInternal() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletOption[]>([]);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  const getNetworkName = (chainId: number): string => {
    const networks: Record<number, string> = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia',
      31337: 'Anvil Local',
      1337: 'Localhost',
    };
    return networks[chainId] || `Chain ${chainId}`;
  };

  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    console.log('🔄 Evento accountsChanged recibido:', accounts);
    
    if (accounts.length === 0) {
      console.log('⚠️ No hay cuentas, desconectando wallet...');
      setWallet(null);
      setProvider(null);
      setSigner(null);
      return;
    }

    const newAddress = accounts[0].toLowerCase();
    console.log('🔄 Cambio de cuenta detectado:', newAddress);

    // Obtener el provider actual o crear uno nuevo
    let currentProvider: BrowserProvider;
    const eth = (window as any).ethereum;
    
    if (!eth) {
      console.error('❌ window.ethereum no está disponible');
      return;
    }

    try {
      // Crear un nuevo provider para asegurar que esté actualizado
      currentProvider = new BrowserProvider(eth);
      
      // PRIMERO: Obtener las cuentas actuales para verificar
      const currentAccounts = await currentProvider.send('eth_accounts', []);
      console.log('📋 Cuentas actuales en MetaMask:', currentAccounts);
      
      if (currentAccounts.length > 0 && currentAccounts[0].toLowerCase() !== newAddress) {
        console.warn('⚠️ La primera cuenta en MetaMask no coincide con la cuenta seleccionada');
        console.warn('   Primera cuenta:', currentAccounts[0].toLowerCase());
        console.warn('   Cuenta esperada:', newAddress);
      }
      
      setProvider(currentProvider);

      // Esperar un momento para que MetaMask actualice completamente
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Obtener las cuentas nuevamente después de esperar
      const accountsAfterWait = await currentProvider.send('eth_accounts', []);
      console.log('📋 Cuentas después de esperar:', accountsAfterWait);
      
      // Obtener el nuevo signer usando la dirección específica si es posible
      let newSigner;
      try {
        // Intentar obtener el signer con la dirección específica
        newSigner = await currentProvider.getSigner(newAddress);
        console.log('✅ Signer obtenido con dirección específica:', newAddress);
      } catch (err) {
        // Si falla, obtener el signer por defecto
        console.warn('⚠️ No se pudo obtener signer con dirección específica, usando signer por defecto');
        newSigner = await currentProvider.getSigner();
      }
      
      setSigner(newSigner);

      // Verificar que el signer tiene la dirección correcta
      let finalSigner = newSigner;
      let finalAddress = newAddress;
      
      const signerAddress = await newSigner.getAddress();
      const signerAddressLower = signerAddress.toLowerCase();
      console.log('✅ Signer obtenido con dirección:', signerAddressLower);
      console.log('📋 Dirección esperada:', newAddress);
      
      if (signerAddressLower !== newAddress) {
        console.warn('⚠️ La dirección del signer no coincide con la cuenta seleccionada. Reintentando...');
        
        // Esperar más tiempo y crear un nuevo provider
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Forzar actualización del provider
        const refreshedProvider = new BrowserProvider(eth);
        let refreshedSigner;
        try {
          refreshedSigner = await refreshedProvider.getSigner(newAddress);
        } catch {
          refreshedSigner = await refreshedProvider.getSigner();
        }
        const refreshedAddress = await refreshedSigner.getAddress();
        const refreshedAddressLower = refreshedAddress.toLowerCase();
        console.log('✅ Signer refrescado con dirección:', refreshedAddressLower);
        
        if (refreshedAddressLower !== newAddress) {
          console.error('❌ No se pudo actualizar el signer a la cuenta correcta');
          console.error('   Esperado:', newAddress);
          console.error('   Obtenido:', refreshedAddressLower);
          // Usar la dirección que MetaMask reporta (puede ser un problema de timing)
          finalAddress = refreshedAddressLower;
          currentProvider = refreshedProvider;
          setProvider(refreshedProvider);
          setSigner(refreshedSigner);
          finalSigner = refreshedSigner;
        } else {
          currentProvider = refreshedProvider;
          setProvider(refreshedProvider);
          setSigner(refreshedSigner);
          finalSigner = refreshedSigner;
          finalAddress = newAddress;
        }
      } else {
        finalAddress = newAddress;
      }

      // Obtener información de la red
      const network = await currentProvider.getNetwork();
      const chainId = Number(network.chainId);
      const networkName = getNetworkName(chainId);

      // Actualizar el estado del wallet con la nueva información
      const updatedWallet: WalletInfo = {
        address: finalAddress,
        provider: currentProvider,
        chainId,
        networkName,
        signer: finalSigner,
      };

      setWallet(updatedWallet);
      console.log('✅ Wallet actualizado correctamente:', {
        address: updatedWallet.address,
        chainId: updatedWallet.chainId,
        networkName: updatedWallet.networkName,
      });
    } catch (error: any) {
      console.error('❌ Error al actualizar wallet después de cambio de cuenta:', error);
      // Intentar mantener el estado anterior si es posible
      setWallet((prevWallet) => {
        if (prevWallet) {
          return { ...prevWallet, address: newAddress };
        }
        return null;
      });
    }
  }, [getNetworkName]);

  const handleChainChanged = useCallback((chainId: string) => {
    const newChainId = parseInt(chainId, 16);
    const networkName = getNetworkName(newChainId);
    setWallet((prevWallet) => {
      if (prevWallet) {
        return { ...prevWallet, chainId: newChainId, networkName };
      }
      return null;
    });
  }, []);

  // Detectar wallets disponibles (similar a ecommerce-rs con soporte EIP-6963)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getWalletName = (provider: any, index: number): string => {
      if (provider.isMetaMask) return 'MetaMask';
      if (provider.isCoinbaseWallet) return 'Coinbase Wallet';
      if (provider.isBraveWallet) return 'Brave Wallet';
      if (provider.isTrust || provider.isTrustWallet) return 'Trust Wallet';
      if (provider.isRabby) return 'Rabby';
      if (provider.isFrame) return 'Frame';
      if (provider.isTokenPocket) return 'TokenPocket';
      if (provider.isOKExWallet) return 'OKEx Wallet';
      if (provider.isPhantom) return 'Phantom';
      if (provider.providerName) return provider.providerName;
      if (provider.name) return provider.name;
      return `Wallet ${index + 1}`;
    };

    // Método 1: EIP-6963 - estándar moderno para múltiples wallets
    const detectEIP6963Wallets = () => {
      return new Promise<WalletOption[]>((resolve) => {
        const detectedWallets: WalletOption[] = [];

        const handler = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (customEvent.detail && customEvent.detail.info && customEvent.detail.provider) {
            const { info, provider } = customEvent.detail;

            // Evitar duplicados por referencia de provider
            const alreadyAdded = detectedWallets.some(
              (w) => w.provider === provider
            );
            if (!alreadyAdded) {
              detectedWallets.push({
                name: info.name || 'Unknown Wallet',
                provider,
              });
            }
          }
        };

        window.addEventListener('eip6963:announceProvider', handler as EventListener);
        window.dispatchEvent(new Event('eip6963:requestProvider'));

        setTimeout(() => {
          window.removeEventListener('eip6963:announceProvider', handler as EventListener);

          // Además, colapsar por nombre para no mostrar 10 veces "MetaMask" o "Trust Wallet"
          const uniqueByName: WalletOption[] = [];
          const seenNames = new Set<string>();
          for (const w of detectedWallets) {
            if (!seenNames.has(w.name)) {
              seenNames.add(w.name);
              uniqueByName.push(w);
            }
          }

          resolve(uniqueByName);
        }, 500);
      });
    };

    const detectWallets = async () => {
      const wallets: WalletOption[] = [];
      const ethereum: any = (window as any).ethereum;

      // 1) Intentar primero EIP-6963
      const eip6963Wallets = await detectEIP6963Wallets();
      if (eip6963Wallets.length > 0) {
        console.log('✅ EIP-6963 detectó wallets:', eip6963Wallets.map((w) => w.name));
        setAvailableWallets(eip6963Wallets);
      } else {
        // 2) Fallback a window.ethereum / providers
        if (!ethereum) {
          setAvailableWallets([]);
          return;
        }

        if (Array.isArray(ethereum)) {
          ethereum.forEach((provider: any, index: number) => {
            const name = getWalletName(provider, index);
            wallets.push({ name, provider });
          });
        } else if (ethereum.providers && Array.isArray(ethereum.providers)) {
          ethereum.providers.forEach((provider: any, index: number) => {
            const name = getWalletName(provider, index);
            wallets.push({ name, provider });
          });
        } else {
          const name = getWalletName(ethereum, 0);
          wallets.push({ name, provider: ethereum });
        }

        // Si no encontramos wallets pero ethereum existe, agregarlo como única opción
        if (wallets.length === 0 && ethereum) {
          wallets.push({ name: 'Ethereum Wallet', provider: ethereum });
        }

        console.log('Wallets detectados:', wallets.map((w) => w.name));
        setAvailableWallets(wallets);
      }
    };

    // Solo ejecutar una vez al montar
    detectWallets();

    // Escuchar cambios en accounts / chainId (estos listeners se mantienen activos)
    const eth = window.ethereum as any;
    if (eth && typeof eth.on === 'function') {
      console.log('👂 Configurando listeners para accountsChanged y chainChanged');
      
      // Configurar listener para accountsChanged
      const accountsChangedHandler = (accounts: string[]) => {
        console.log('🔔 Evento accountsChanged capturado directamente:', accounts);
        handleAccountsChanged(accounts);
      };
      
      eth.on('accountsChanged', accountsChangedHandler);
      eth.on('chainChanged', handleChainChanged);
      
      // También escuchar el evento 'disconnect' para manejar desconexiones
      const disconnectHandler = () => {
        console.log('🔌 Wallet desconectado');
        setWallet(null);
        setProvider(null);
        setSigner(null);
      };
      eth.on('disconnect', disconnectHandler);
      
      // Verificar que los listeners están configurados
      console.log('✅ Listeners configurados. Verificando cuentas actuales...');
      eth.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        console.log('📋 Cuentas actuales en MetaMask:', accounts);
      }).catch((err: any) => {
        console.error('❌ Error al obtener cuentas:', err);
      });
    } else {
      console.warn('⚠️ window.ethereum no tiene método on(), los listeners no se configuraron');
    }

    return () => {
      const ethCleanup = window.ethereum as any;
      if (ethCleanup && typeof ethCleanup.removeListener === 'function') {
        console.log('🧹 Limpiando listeners de wallet');
        // Nota: Necesitamos mantener la referencia al handler para poder removerlo
        // Por ahora, removemos todos los listeners
        ethCleanup.removeAllListeners('accountsChanged');
        ethCleanup.removeAllListeners('chainChanged');
        ethCleanup.removeAllListeners('disconnect');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vacío: solo ejecutar una vez al montar

  const connectWallet = useCallback(async (walletOption?: WalletOption) => {
    setIsConnecting(true);
    setError(null);

    try {
      let provider: Eip1193Provider | undefined;
      let walletName = 'Wallet';

      if (walletOption) {
        // Comportamiento igual que en ecommerce-rs: usar directamente el provider seleccionado
        walletName = walletOption.name;
        provider = walletOption.provider;
      } else {
        const ethereum: any = (window as any).ethereum;
        if (!ethereum) {
          throw new Error('No wallet found. Please install MetaMask, Trust Wallet u otra wallet compatible.');
        }

        if (Array.isArray(ethereum)) {
          provider = ethereum[0];
        } else if (ethereum.providers && Array.isArray(ethereum.providers)) {
          provider = ethereum.providers[0];
        } else {
          provider = ethereum;
        }

        walletName =
          (provider as any).isMetaMask
            ? 'MetaMask'
            : (provider as any).isTrust || (provider as any).isTrustWallet
            ? 'Trust Wallet'
            : 'Wallet';
      }

      if (!provider) {
        throw new Error('No se pudo determinar el provider del wallet seleccionado.');
      }

      console.log(`🔌 Conectando a ${walletName}...`, {
        isMetaMask: (provider as any).isMetaMask,
        isTrust: (provider as any).isTrust,
        isTrustWallet: (provider as any).isTrustWallet,
      });

      const browserProvider = new BrowserProvider(provider);
      setProvider(browserProvider);
      
      // PRIMERO: Solicitar acceso a las cuentas (esto actualiza la cuenta activa en MetaMask)
      console.log(`📝 Solicitando acceso a ${walletName}...`);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      
      if (accounts.length === 0) {
        throw new Error('No se encontraron cuentas. Por favor, desbloquea tu wallet.');
      }

      const selectedAddress = accounts[0].toLowerCase();
      console.log('✅ Cuenta seleccionada:', selectedAddress);

      // SEGUNDO: Obtener el signer DESPUÉS de solicitar las cuentas
      // Esto asegura que el signer use la cuenta que el usuario seleccionó
      const signer = await browserProvider.getSigner();
      setSigner(signer);
      
      // Verificar que el signer tiene la dirección correcta
      const signerAddress = await signer.getAddress();
      const signerAddressLower = signerAddress.toLowerCase();
      console.log('✅ Signer obtenido con dirección:', signerAddressLower);
      
      if (signerAddressLower !== selectedAddress) {
        console.warn('⚠️ La dirección del signer no coincide con la cuenta seleccionada. Reintentando...');
        // Esperar un momento y crear un nuevo provider
        await new Promise(resolve => setTimeout(resolve, 100));
        const refreshedProvider = new BrowserProvider(provider);
        const refreshedSigner = await refreshedProvider.getSigner();
        const refreshedAddress = await refreshedSigner.getAddress();
        console.log('✅ Signer refrescado con dirección:', refreshedAddress.toLowerCase());
        
        if (refreshedAddress.toLowerCase() === selectedAddress) {
          setProvider(refreshedProvider);
          setSigner(refreshedSigner);
          const network = await refreshedProvider.getNetwork();
          const chainId = Number(network.chainId);
          const networkName = getNetworkName(chainId);
          
          const walletInfo: WalletInfo = {
            address: selectedAddress,
            provider: refreshedProvider,
            chainId,
            networkName,
            signer: refreshedSigner,
          };
          
          console.log(`✓ Conectado a ${walletName}:`, selectedAddress);
          setWallet(walletInfo);
          return;
        }
      }

      const network = await browserProvider.getNetwork();
      const chainId = Number(network.chainId);
      const networkName = getNetworkName(chainId);

      const walletInfo: WalletInfo = {
        address: selectedAddress,
        provider: browserProvider,
        chainId,
        networkName,
        signer,
      };

      console.log(`✓ Conectado a ${walletName}:`, selectedAddress);
      setWallet(walletInfo);
      
      // IMPORTANTE: Configurar listeners también en el provider específico si es diferente de window.ethereum
      const windowEth = (window as any).ethereum;
      if (provider && provider !== windowEth && typeof (provider as any).on === 'function') {
        console.log('👂 Configurando listeners adicionales en el provider específico');
        (provider as any).on('accountsChanged', (accounts: string[]) => {
          console.log('🔔 Evento accountsChanged desde provider específico:', accounts);
          handleAccountsChanged(accounts);
        });
        (provider as any).on('chainChanged', handleChainChanged);
      }
    } catch (err: any) {
      let errorMessage = 'Error al conectar el wallet';
      
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('denied')) {
        errorMessage = 'Conexión rechazada. Por favor, acepta la solicitud en tu wallet.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Error connecting wallet:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setProvider(null);
    setSigner(null);
    setError(null);
  }, []);

  return {
    wallet,
    isConnecting,
    error,
    availableWallets,
    connectWallet,
    disconnectWallet,
    provider,
    signer,
  };
}

type WalletContextType = ReturnType<typeof useWalletInternal>;

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const value = useWalletInternal();
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet debe usarse dentro de un WalletProvider');
  }
  return ctx;
}

// Extender Window interface para TypeScript
declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      isTrust?: boolean;
      isTrustWallet?: boolean;
      isCoinbaseWallet?: boolean;
      isBraveWallet?: boolean;
      isRabby?: boolean;
      isTokenPocket?: boolean;
      providers?: Eip1193Provider[];
    };
    trustwallet?: Eip1193Provider;
  }
}

