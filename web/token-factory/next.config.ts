import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configurar alias para @/shared
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/shared': path.resolve(__dirname, '../shared'),
    };
    
    // Asegurar que webpack busque módulos primero en el node_modules del proyecto actual
    // y luego en shared/node_modules si existe
    const projectNodeModules = path.resolve(__dirname, 'node_modules');
    const sharedNodeModules = path.resolve(__dirname, '../shared/node_modules');
    
    // Configurar el orden de resolución de módulos
    // Primero busca en el proyecto actual, luego en shared
    config.resolve.modules = [
      projectNodeModules,
      sharedNodeModules,
      'node_modules',
    ];
    
    // Ignorar módulos nativos de Node.js en el cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
