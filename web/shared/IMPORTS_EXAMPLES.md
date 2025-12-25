# Ejemplos de Imports y Uso

## Imports Básicos

### Conectar a MongoDB

```typescript
import { connectDB } from '@/shared';

// En un API route o server component
export async function GET() {
  await connectDB();
  // ... tu código
}
```

### Usar Modelos

```typescript
import { Attachment, Transaction, TrustedIssuerRequest } from '@/shared';

// Crear un attachment
const attachment = await Attachment.create({ ... });

// Buscar transacciones
const transactions = await Transaction.find({ ... });
```

### Acceder a Variables de Entorno

```typescript
import { env, validateEnv } from '@/shared';

// Validar variables de entorno al inicio de la aplicación
validateEnv();

// Acceder a variables
const mongoUri = env.MONGODB_URI;
const rpcUrl = env.RPC_URL;
const chainId = env.CHAIN_ID;
```

### Acceder a Direcciones de Contratos

```typescript
import { contracts, validateContracts } from '@/shared';

// Validar que los contratos estén configurados
if (validateContracts()) {
  const identityRegistry = contracts.identityRegistry;
  const trustedIssuersRegistry = contracts.trustedIssuersRegistry;
  const tokenFactory = contracts.tokenCloneFactory;
}
```

## Ejemplos Completos por Proyecto

### Identity Management (puerto 4001)

```typescript
// app/api/identity/route.ts
import { NextResponse } from 'next/server';
import { connectDB, Transaction, env } from '@/shared';
import { ethers } from 'ethers';

export async function POST(request: Request) {
  try {
    // Conectar a MongoDB
    await connectDB();
    
    // Obtener datos del request
    const { address } = await request.json();
    
    // Registrar transacción
    const transaction = await Transaction.create({
      txHash: '0x...',
      fromAddress: address,
      type: 'identity-registration',
      status: 'pending',
    });
    
    // Interactuar con contrato
    const provider = new ethers.JsonRpcProvider(env.RPC_URL);
    // ... lógica del contrato
    
    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
```

### Trusted Issuers Management (puerto 4002)

```typescript
// app/api/trusted-issuers/request/route.ts
import { NextResponse } from 'next/server';
import { connectDB, TrustedIssuerRequest, Attachment, contracts } from '@/shared';

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const data = JSON.parse(formData.get('data') as string);
    
    // Crear solicitud
    const request = await TrustedIssuerRequest.create({
      requesterAddress: data.address,
      organizationName: data.organizationName,
      claimTopics: data.claimTopics,
      status: 'pending',
    });
    
    // Guardar archivo adjunto
    if (file) {
      await Attachment.create({
        relatedId: request._id.toString(),
        relatedType: 'trusted-issuer-request',
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        filePath: `/uploads/${request._id}/${file.name}`,
        uploadedBy: data.address,
      });
    }
    
    return NextResponse.json({ request });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
```

### Token Factory & Marketplace (puerto 4003)

```typescript
// app/api/tokens/create/route.ts
import { NextResponse } from 'next/server';
import { connectDB, Transaction, Attachment, contracts, env } from '@/shared';
import { ethers } from 'ethers';

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const { tokenData, files } = await request.json();
    
    // Crear token usando el factory
    const provider = new ethers.JsonRpcProvider(env.RPC_URL);
    const factory = new ethers.Contract(
      contracts.tokenCloneFactory,
      // ABI del factory
      provider
    );
    
    // Registrar transacción
    const transaction = await Transaction.create({
      txHash: '0x...',
      fromAddress: tokenData.creator,
      contractAddress: contracts.tokenCloneFactory,
      type: 'token-creation',
      status: 'pending',
      metadata: {
        tokenName: tokenData.name,
        tokenSymbol: tokenData.symbol,
      },
    });
    
    // Guardar archivos adjuntos
    for (const file of files) {
      await Attachment.create({
        relatedId: transaction._id.toString(),
        relatedType: 'token',
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        filePath: file.path,
        uploadedBy: tokenData.creator,
      });
    }
    
    return NextResponse.json({ transaction });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
```

## Imports en Componentes React

```typescript
// app/components/TransactionList.tsx
'use client';

import { useEffect, useState } from 'react';

export function TransactionList({ address }: { address: string }) {
  const [transactions, setTransactions] = useState([]);
  
  useEffect(() => {
    fetch(`/api/transactions?address=${address}`)
      .then(res => res.json())
      .then(data => setTransactions(data.transactions));
  }, [address]);
  
  return (
    <div>
      {transactions.map(tx => (
        <div key={tx._id}>{tx.txHash}</div>
      ))}
    </div>
  );
}
```

## Configuración Inicial

1. **Copiar archivo de ejemplo:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Configurar variables en `.env.local`:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/rwa-platform
   RPC_URL=http://localhost:8545
   CHAIN_ID=31337
   ```

3. **Después del despliegue de contratos, agregar direcciones:**
   ```env
   IDENTITY_REGISTRY_ADDRESS=0x...
   TRUSTED_ISSUERS_REGISTRY_ADDRESS=0x...
   TOKEN_CLONE_FACTORY_ADDRESS=0x...
   ```

