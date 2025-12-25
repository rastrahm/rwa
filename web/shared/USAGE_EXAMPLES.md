# Ejemplos de Uso de MongoDB

## Configuración Inicial

### 1. Variables de Entorno

Crear archivo `.env.local` en cada proyecto (identity, trusted-issuers, token-factory):

```env
MONGODB_URI=mongodb://localhost:27017/rwa-platform
```

### 2. Conectar a MongoDB

```typescript
import { connectDB } from '@/shared';

// En un API route o server component
export async function GET() {
  await connectDB();
  // ... tu código
}
```

## Ejemplos de Uso de Modelos

### Attachment (Archivos Adjuntos)

#### Crear un archivo adjunto

```typescript
import { connectDB, Attachment } from '@/shared';

await connectDB();

const attachment = await Attachment.create({
  relatedId: 'token-123',
  relatedType: 'token',
  fileName: 'documento.pdf',
  mimeType: 'application/pdf',
  size: 1024000,
  filePath: '/uploads/token-123/documento.pdf',
  fileHash: '0xabc123...',
  description: 'Documento legal del token',
  uploadedBy: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
});

console.log('Archivo adjunto creado:', attachment._id);
```

#### Buscar archivos de un token

```typescript
const tokenAttachments = await Attachment.find({
  relatedId: 'token-123',
  relatedType: 'token',
}).sort({ createdAt: -1 });
```

### TrustedIssuerRequest (Solicitudes de Trusted Issuers)

#### Crear una solicitud

```typescript
import { connectDB, TrustedIssuerRequest } from '@/shared';

await connectDB();

const request = await TrustedIssuerRequest.create({
  requesterAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  organizationName: 'KYC Provider Inc.',
  description: 'Proveedor de servicios KYC certificado',
  contactEmail: 'contact@kycprovider.com',
  website: 'https://kycprovider.com',
  claimTopics: [1, 2, 3], // KYC, AML, PEP
  status: 'pending',
});

console.log('Solicitud creada:', request._id);
```

#### Aprobar una solicitud

```typescript
const request = await TrustedIssuerRequest.findById(requestId);

if (request && request.status === 'pending') {
  request.status = 'approved';
  request.issuerContractAddress = '0x...'; // Dirección del contrato desplegado
  request.approvalTxHash = '0x...';
  request.reviewedAt = new Date();
  request.reviewedBy = adminAddress;
  await request.save();
}
```

#### Buscar solicitudes pendientes

```typescript
const pendingRequests = await TrustedIssuerRequest.find({
  status: 'pending',
}).sort({ createdAt: -1 });
```

### Transaction (Transacciones)

#### Registrar una transacción

```typescript
import { connectDB, Transaction } from '@/shared';

await connectDB();

const transaction = await Transaction.create({
  txHash: '0xabc123...',
  fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  contractAddress: '0x...',
  type: 'identity-registration',
  status: 'pending',
  metadata: {
    identityAddress: '0x...',
  },
});

console.log('Transacción registrada:', transaction._id);
```

#### Actualizar estado de transacción

```typescript
const transaction = await Transaction.findOne({ txHash: '0xabc123...' });

if (transaction) {
  transaction.status = 'confirmed';
  transaction.blockNumber = 12345;
  transaction.gasUsed = '21000';
  transaction.gasPrice = '20000000000';
  transaction.totalCost = '420000000000000';
  transaction.confirmedAt = new Date();
  await transaction.save();
}
```

#### Buscar transacciones de un usuario

```typescript
const userTransactions = await Transaction.find({
  fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
})
  .sort({ createdAt: -1 })
  .limit(50);
```

#### Buscar transacciones por tipo

```typescript
const tokenCreations = await Transaction.find({
  type: 'token-creation',
  status: 'confirmed',
}).sort({ createdAt: -1 });
```

## Uso en API Routes de Next.js

### Ejemplo: API Route para obtener transacciones

```typescript
// app/api/transactions/route.ts
import { NextResponse } from 'next/server';
import { connectDB, Transaction } from '@/shared';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    const query: any = {};
    if (address) {
      query.fromAddress = address.toLowerCase();
    }
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(100);
    
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener transacciones' },
      { status: 500 }
    );
  }
}
```

### Ejemplo: API Route para crear solicitud de trusted issuer

```typescript
// app/api/trusted-issuers/request/route.ts
import { NextResponse } from 'next/server';
import { connectDB, TrustedIssuerRequest } from '@/shared';

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      requesterAddress,
      organizationName,
      description,
      contactEmail,
      website,
      claimTopics,
    } = body;
    
    const newRequest = await TrustedIssuerRequest.create({
      requesterAddress: requesterAddress.toLowerCase(),
      organizationName,
      description,
      contactEmail,
      website,
      claimTopics,
      status: 'pending',
    });
    
    return NextResponse.json({ request: newRequest }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error al crear solicitud' },
      { status: 500 }
    );
  }
}
```

## Verificar Conexión

Para verificar que MongoDB está funcionando correctamente:

```bash
# Asegúrate de que MongoDB esté corriendo
mongod

# En otro terminal, ejecutar el script de prueba
cd web/shared
npm install
npx tsx db/test-connection.ts
```

