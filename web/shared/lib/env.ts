/**
 * Utilidades para acceder a las variables de entorno
 */

export const env = {
  // MongoDB (solo servidor, no necesita NEXT_PUBLIC_)
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-platform',
  
  // Blockchain
  // En cliente, Next.js requiere NEXT_PUBLIC_ para exponer variables
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'http://localhost:8545',
  PRIVATE_KEY: process.env.PRIVATE_KEY, // Solo servidor, nunca NEXT_PUBLIC_
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || process.env.CHAIN_ID || '31337', 10),
  
  // Contract Addresses (usadas en cliente, necesitan NEXT_PUBLIC_)
  IDENTITY_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS || process.env.IDENTITY_REGISTRY_ADDRESS || '',
  TRUSTED_ISSUERS_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS || process.env.TRUSTED_ISSUERS_REGISTRY_ADDRESS || '',
  CLAIM_TOPICS_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_CLAIM_TOPICS_REGISTRY_ADDRESS || process.env.CLAIM_TOPICS_REGISTRY_ADDRESS || '',
  TOKEN_CLONE_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_TOKEN_CLONE_FACTORY_ADDRESS || process.env.TOKEN_CLONE_FACTORY_ADDRESS || '',
} as const;

/**
 * Valida que las variables de entorno requeridas estén configuradas
 */
export function validateEnv() {
  const required = ['MONGODB_URI', 'RPC_URL'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file.'
    );
  }
}

