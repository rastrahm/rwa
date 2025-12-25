# Shared MongoDB Configuration

Este directorio contiene la configuración compartida de MongoDB para las tres interfaces web del proyecto RWA.

## Estructura

```
shared/
├── db/
│   └── connection.ts      # Configuración de conexión a MongoDB
├── models/
│   ├── Attachment.ts       # Modelo para archivos adjuntos
│   ├── TrustedIssuerRequest.ts  # Modelo para solicitudes de trusted issuers
│   ├── Transaction.ts     # Modelo para transacciones
│   └── index.ts           # Exportaciones centralizadas
└── index.ts               # Exportaciones principales

```

## Uso

### En cada proyecto (identity, trusted-issuers, token-factory)

1. **Configurar path alias en `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "paths": {
      "@/shared/*": ["../shared/*"]
    }
  }
}
```

2. **Importar en tu código:**

```typescript
import { connectDB, Attachment, Transaction } from '@/shared';

// Conectar a MongoDB
await connectDB();

// Usar modelos
const attachment = await Attachment.create({ ... });
const transactions = await Transaction.find({ fromAddress: '0x...' });
```

## Modelos

### Attachment
Almacena archivos adjuntos a tokens o solicitudes de trusted issuers.

**Campos principales:**
- `relatedId`: ID del token o solicitud
- `relatedType`: 'token' | 'trusted-issuer-request'
- `fileName`, `mimeType`, `size`, `filePath`
- `uploadedBy`: dirección del wallet

### TrustedIssuerRequest
Almacena solicitudes para convertirse en trusted issuer.

**Campos principales:**
- `requesterAddress`: dirección del wallet solicitante
- `organizationName`, `description`, `contactEmail`, `website`
- `claimTopics`: array de topic IDs que puede emitir
- `status`: 'pending' | 'approved' | 'rejected'
- `issuerContractAddress`: dirección del contrato (si aprobado)

### Transaction
Registra todas las transacciones realizadas en la plataforma.

**Campos principales:**
- `txHash`: hash de la transacción
- `fromAddress`: dirección del wallet que ejecutó
- `type`: tipo de transacción
- `status`: 'pending' | 'confirmed' | 'failed'
- `metadata`: datos adicionales según el tipo

## Variables de Entorno

Crear archivo `.env.local` en cada proyecto con:

```
MONGODB_URI=mongodb://localhost:27017/rwa-platform
```

## Iniciar MongoDB

```bash
# Si MongoDB está instalado localmente
mongod

# O usar MongoDB Atlas (cloud)
# Actualizar MONGODB_URI en .env.local
```

