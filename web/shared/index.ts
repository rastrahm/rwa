// Exportar conexión y modelos (solo para uso en servidor/API routes)
export { default as connectDB } from './db/connection';
export * from './models';

// Exportar utilidades del cliente (sin dependencias de Node.js)
export * from './lib/client';

