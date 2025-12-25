'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BrowserProvider, Eip1193Provider, JsonRpcSigner } from 'ethers';

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

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setWallet(null);
      return;
    }

    const address = accounts[0];

    setWallet((prevWallet) => {
      // Si ya teníamos wallet, solo actualizamos la dirección
      if (prevWallet) {
        return { ...prevWallet, address };
      }

      // Si no había wallet en este hook (otro componente hizo el connect),
      // creamos una instancia mínima usando window.ethereum
      if (typeof window !== 'undefined' && window.ethereum) {
        const browserProvider = new BrowserProvider(window.ethereum);
        setProvider(browserProvider);
        // Cargar signer de forma asíncrona
        browserProvider.getSigner().then(setSigner).catch(() => {});
        return {
          address,
          provider: browserProvider,
          chainId: 0,
          networkName: 'Desconocida',
          signer: null,
        };
      }

      return null;
    });
  }, []);

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

    detectWallets();

    // Escuchar cambios en accounts / chainId como antes
    const eth = window.ethereum as any;
    if (eth && typeof eth.on === 'function') {
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);
    }

    return () => {
      const ethCleanup = window.ethereum as any;
      if (ethCleanup && typeof ethCleanup.removeListener === 'function') {
        ethCleanup.removeListener('accountsChanged', handleAccountsChanged);
        ethCleanup.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [handleAccountsChanged, handleChainChanged]);

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
      const signer = await browserProvider.getSigner();
      setSigner(signer);
      
      // Solicitar acceso a las cuentas
      console.log(`📝 Solicitando acceso a ${walletName}...`);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      
      if (accounts.length === 0) {
        throw new Error('No se encontraron cuentas. Por favor, desbloquea tu wallet.');
      }

      const network = await browserProvider.getNetwork();
      const chainId = Number(network.chainId);
      const networkName = getNetworkName(chainId);

      const walletInfo: WalletInfo = {
        address: accounts[0],
        provider: browserProvider,
        chainId,
        networkName,
        signer,
      };

      console.log(`✓ Conectado a ${walletName}:`, accounts[0]);
      setWallet(walletInfo);
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
