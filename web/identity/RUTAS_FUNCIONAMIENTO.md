# 📋 Rutas de Funcionamiento - Módulo Identity

Este documento describe todas las rutas API del módulo de Identity, sus métodos HTTP, parámetros, respuestas y flujos de trabajo.

## 🗺️ Mapa de Rutas

```
/api/identity/
├── register/              POST    - Registrar transacción de registro
├── deploy/                POST    - Desplegar contrato Identity
├── claims/                GET     - Obtener claims completados
├── statistics/            GET     - Obtener estadísticas
└── claim/
    ├── request/           POST    - Crear solicitud de claim
    ├── request/           GET     - Obtener solicitudes de claims
    ├── approve/           POST    - Aprobar solicitud de claim
    ├── reject/            POST    - Rechazar solicitud de claim
    ├── add/               POST    - Agregar claim directamente
    └── remove/            POST    - Remover claim
```

---

## 📍 Rutas Detalladas

### 1. `/api/identity/register` - Registrar Transacción

**Método:** `POST`

**Descripción:** Registra una transacción de registro de identidad en MongoDB.

**Body:**
```json
{
  "txHash": "0x...",
  "fromAddress": "0x...",
  "identityAddress": "0x..."
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "transaction": {
    "txHash": "0x...",
    "fromAddress": "0x...",
    "contractAddress": "0x...",
    "type": "identity-registration",
    "status": "pending"
  }
}
```

**Flujo:**
1. Recibe datos de transacción
2. Valida parámetros requeridos
3. Crea registro en MongoDB (colección `transactions`)
4. Retorna transacción registrada

---

### 2. `/api/identity/deploy` - Desplegar Contrato Identity

**Método:** `POST`

**Descripción:** Despliega un nuevo contrato Identity en la blockchain.

**Body:**
```json
{
  "owner": "0x..."  // Dirección del propietario
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "identityAddress": "0x...",
  "txHash": "0x..."
}
```

**Flujo:**
1. Valida dirección del owner
2. Conecta a blockchain (RPC_URL)
3. Despliega contrato Identity con bytecode
4. Retorna dirección del contrato y hash de transacción

**Dependencias:**
- `PRIVATE_KEY` en variables de entorno
- `RPC_URL` en variables de entorno
- Blockchain accesible (Anvil o red configurada)

---

### 3. `/api/identity/claims` - Obtener Claims Completados

**Método:** `GET`

**Descripción:** Obtiene los claims completados de un Identity desde MongoDB.

**Query Parameters:**
- `identityAddress` (requerido): Dirección del contrato Identity

**Ejemplo:**
```
GET /api/identity/claims?identityAddress=0x...
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "claims": [
    {
      "id": "...",
      "topic": 1,
      "scheme": 1,
      "issuer": "0x...",
      "signature": "0x...",
      "data": "0x...",
      "uri": "",
      "claimTxHash": "0x...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "reviewedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Flujo:**
1. Valida dirección del Identity
2. Conecta a MongoDB
3. Busca claims con `status: 'completed'` y `identityAddress`
4. Retorna lista de claims completados

---

### 4. `/api/identity/statistics` - Obtener Estadísticas

**Método:** `GET`

**Descripción:** Obtiene estadísticas y análisis de claims e identidades.

**Query Parameters (opcionales):**
- `identityAddress`: Filtrar por Identity específico
- `requesterAddress`: Filtrar por solicitante específico

**Ejemplo:**
```
GET /api/identity/statistics?identityAddress=0x...
GET /api/identity/statistics?requesterAddress=0x...
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "statistics": {
    "overview": {
      "totalRequests": 100,
      "completionRate": 75.5,
      "approvalRate": 80.0,
      "rejectionRate": 20.0
    },
    "statusDistribution": {
      "pending": 10,
      "approved": 5,
      "rejected": 15,
      "completed": 70
    },
    "topicDistribution": [
      {
        "topic": 1,
        "topicName": "KYC - Know Your Customer",
        "count": 30
      }
    ],
    "issuerDistribution": [
      {
        "issuer": "0x...",
        "count": 25
      }
    ],
    "dailyActivity": [
      {
        "date": "2024-01-01",
        "requests": 5,
        "completed": 3
      }
    ]
  }
}
```

**Flujo:**
1. Conecta a MongoDB
2. Obtiene todos los claim requests (con filtros opcionales)
3. Calcula estadísticas:
   - Distribución por estado
   - Distribución por topic
   - Distribución por issuer (top 10)
   - Actividad diaria (últimos 30 días)
4. Retorna estadísticas agregadas

---

### 5. `/api/identity/claim/request` - Crear Solicitud de Claim

**Método:** `POST`

**Descripción:** Crea una nueva solicitud de claim que debe ser aprobada por un Trusted Issuer.

**Body:**
```json
{
  "requesterAddress": "0x...",
  "identityAddress": "0x...",
  "topic": 1,
  "scheme": 1,
  "issuerAddress": "0x...",
  "signature": "0x...",      // Opcional
  "dataText": "texto",       // Opcional
  "uri": "https://...",     // Opcional
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "claimRequest": {
    "id": "...",
    "requesterAddress": "0x...",
    "identityAddress": "0x...",
    "topic": 1,
    "scheme": 1,
    "issuerAddress": "0x...",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Flujo:**
1. Valida todos los parámetros requeridos
2. Conecta a MongoDB
3. Convierte `dataText` a hexadecimal si se proporciona
4. Crea documento en colección `claimrequests` con `status: 'pending'`
5. Retorna solicitud creada

**Estados posibles:**
- `pending`: Recién creada, esperando aprobación
- `approved`: Aprobada por issuer (intermedio)
- `rejected`: Rechazada por issuer
- `completed`: Claim agregado exitosamente al contrato

---

### 6. `/api/identity/claim/request` - Obtener Solicitudes de Claims

**Método:** `GET`

**Descripción:** Obtiene solicitudes de claims con filtros opcionales.

**Query Parameters (opcionales):**
- `requesterAddress`: Filtrar por solicitante
- `issuerAddress`: Filtrar por issuer
- `status`: Filtrar por estado (`pending`, `approved`, `rejected`, `completed`)

**Ejemplo:**
```
GET /api/identity/claim/request?requesterAddress=0x...&status=pending
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "claimRequests": [
    {
      "id": "...",
      "requesterAddress": "0x...",
      "identityAddress": "0x...",
      "topic": 1,
      "scheme": 1,
      "issuerAddress": "0x...",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Flujo:**
1. Conecta a MongoDB
2. Construye query con filtros opcionales
3. Busca en colección `claimrequests`
4. Ordena por `createdAt` descendente
5. Limita a 100 resultados
6. Retorna lista de solicitudes

---

### 7. `/api/identity/claim/approve` - Aprobar Solicitud de Claim

**Método:** `POST`

**Descripción:** Aprueba una solicitud de claim y la agrega al contrato Identity en blockchain.

**Body:**
```json
{
  "requestId": "...",           // ID de MongoDB
  "issuerAddress": "0x...",      // Debe coincidir con issuer de la solicitud
  "signature": "0x...",          // Opcional
  "issuerNotes": "Notas..."      // Opcional
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "claimRequest": {
    "id": "...",
    "status": "completed",
    "claimTxHash": "0x..."
  }
}
```

**Flujo:**
1. Valida parámetros
2. Busca solicitud en MongoDB por `requestId`
3. Verifica que:
   - El `issuerAddress` coincida con el de la solicitud
   - El estado sea `pending`
4. Conecta a blockchain
5. Llama a `addClaimByIssuer()` en el contrato Identity
6. Espera confirmación de transacción
7. Actualiza solicitud en MongoDB:
   - `status: 'completed'`
   - `claimTxHash`: hash de la transacción
   - `reviewedAt`: fecha actual
   - `reviewedBy`: dirección del issuer
8. Retorna solicitud actualizada

**Dependencias:**
- `PRIVATE_KEY` debe corresponder al issuer
- Contrato Identity debe tener función `addClaimByIssuer()`
- Blockchain accesible

---

### 8. `/api/identity/claim/reject` - Rechazar Solicitud de Claim

**Método:** `POST`

**Descripción:** Rechaza una solicitud de claim sin agregarla a blockchain.

**Body:**
```json
{
  "requestId": "...",
  "issuerAddress": "0x...",
  "rejectionReason": "Razón del rechazo"  // Opcional
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "claimRequest": {
    "id": "...",
    "status": "rejected",
    "rejectionReason": "Razón del rechazo"
  }
}
```

**Flujo:**
1. Valida parámetros
2. Busca solicitud en MongoDB
3. Verifica que:
   - El `issuerAddress` coincida
   - El estado sea `pending`
4. Actualiza solicitud:
   - `status: 'rejected'`
   - `rejectionReason`: razón proporcionada
   - `reviewedAt`: fecha actual
   - `reviewedBy`: dirección del issuer
5. Retorna solicitud actualizada

**Nota:** Esta operación NO interactúa con blockchain, solo actualiza MongoDB.

---

### 9. `/api/identity/claim/add` - Agregar Claim Directamente

**Método:** `POST`

**Descripción:** Agrega un claim directamente al contrato Identity sin pasar por el flujo de solicitud/aprobación.

**Body:**
```json
{
  "identityAddress": "0x...",
  "topic": 1,
  "scheme": 1,
  "issuer": "0x...",
  "signature": "0x...",
  "data": "0x...",
  "uri": "https://..."
}
```

**Flujo:**
1. Valida parámetros
2. Conecta a blockchain
3. Llama a función del contrato Identity para agregar claim
4. Retorna hash de transacción

**Nota:** Esta ruta permite agregar claims directamente sin el flujo de aprobación.

---

### 10. `/api/identity/claim/remove` - Remover Claim

**Método:** `POST`

**Descripción:** Remueve un claim del contrato Identity.

**Body:**
```json
{
  "identityAddress": "0x...",
  "topic": 1,
  "issuer": "0x..."
}
```

**Flujo:**
1. Valida parámetros
2. Conecta a blockchain
3. Llama a función del contrato Identity para remover claim
4. Retorna hash de transacción

---

## 🔄 Flujos de Trabajo Principales

### Flujo 1: Registro de Identidad

```
1. Usuario registra identidad en blockchain
   ↓
2. POST /api/identity/register
   - Guarda transacción en MongoDB
   ↓
3. POST /api/identity/deploy (si es necesario)
   - Despliega contrato Identity
```

### Flujo 2: Solicitud y Aprobación de Claim

```
1. Usuario solicita claim
   ↓
2. POST /api/identity/claim/request
   - Crea solicitud con status: 'pending'
   - Guarda en MongoDB
   ↓
3. Trusted Issuer revisa solicitudes
   ↓
4a. POST /api/identity/claim/approve
    - Agrega claim a blockchain
    - Actualiza status: 'completed'
   ↓
4b. POST /api/identity/claim/reject
    - Actualiza status: 'rejected'
    - NO modifica blockchain
   ↓
5. GET /api/identity/claims
   - Usuario ve claims completados
```

### Flujo 3: Consulta de Estadísticas

```
1. GET /api/identity/statistics
   ↓
2. Consulta MongoDB para obtener todos los claim requests
   ↓
3. Calcula estadísticas agregadas
   ↓
4. Retorna datos para visualización
```

---

## 📊 Diagrama Visual del Flujo del Sistema

### Diagrama Completo: Solicitud y Aprobación de Claim

```
                    ┌─────────────┐
                    │   👤 Usuario │
                    │ Wallet Address│
                    └──────┬───────┘
                           │
                           │ POST /api/identity/claim/request
                           │ Body: requesterAddress, identityAddress, 
                           │       topic, scheme, issuerAddress
                           ▼
        ┌─────────────────────────────────────────┐
        │  [1] POST /api/identity/claim/request    │
        │  Crear solicitud de claim                │
        │  Status: pending                         │
        └──────────────────┬──────────────────────┘
                           │
                           │ Guarda en MongoDB
                           ▼
                    ┌──────────────┐
                    │   🗄️ MongoDB  │
                    │ claimrequests│
                    │ Status:      │
                    │ pending     │
                    └──────┬───────┘
                           │
                           │ Notificación
                           ▼
              ┌────────────────────────┐
              │  🏛️ Trusted Issuer     │
              │  Revisa solicitudes   │
              └──────┬────────┬────────┘
                     │        │
         ┌───────────┘        └───────────┐
         │                                  │
         ▼                                  ▼
┌────────────────────┐        ┌────────────────────┐
│ [2a] POST          │        │ [2b] POST          │
│ /api/identity/     │        │ /api/identity/     │
│ claim/approve      │        │ claim/reject       │
│                    │        │                    │
│ Aprobar y agregar  │        │ Rechazar solicitud │
│ a blockchain       │        │ (solo MongoDB)      │
└─────────┬──────────┘        └─────────┬──────────┘
          │                              │
          │ Agrega claim                 │ Actualiza
          │ a blockchain                 │ status: rejected
          ▼                              ▼
   ┌──────────────┐              ┌──────────────┐
   │ ⛓️ Blockchain │              │ 🗄️ MongoDB   │
   │ Contrato     │              │ Status:      │
   │ Identity     │              │ rejected     │
   │              │              └──────────────┘
   │ Claim agregado│
   └──────┬───────┘
          │
          │ Actualiza MongoDB
          │ status: completed
          ▼
   ┌──────────────┐
   │ 🗄️ MongoDB   │
   │ Status:      │
   │ completed    │
   └──────┬───────┘
          │
          │ GET /api/identity/claims
          │ Query: identityAddress
          ▼
   ┌─────────────────────────────┐
   │ [3] GET /api/identity/claims│
   │ Obtener claims completados  │
   └──────────────┬──────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ ✅ Claims        │
         │ Obtenidos      │
         │ Lista de claims │
         │ completados     │
         └─────────────────┘
```

### Diagrama Simplificado: Flujo Principal

```
Usuario → [POST request] → MongoDB (pending) 
                              ↓
                    Trusted Issuer revisa
                              ↓
              ┌───────────────┴───────────────┐
              │                               │
        [POST approve]                  [POST reject]
              │                               │
              ▼                               ▼
    Blockchain + MongoDB            Solo MongoDB
    (completed)                    (rejected)
              │
              └───────────────┐
                              ▼
                    [GET claims] → Usuario ve resultados
```

### Diagrama de Componentes del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA IDENTITY                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   Frontend    │◄────►│   API Routes │                   │
│  │  (Next.js)    │      │  (Next.js)   │                   │
│  └──────────────┘      └──────┬───────┘                   │
│                                │                            │
│                                ├─────────────────┐          │
│                                │                 │          │
│                                ▼                 ▼          │
│                      ┌──────────────┐  ┌──────────────┐    │
│                      │   MongoDB    │  │  Blockchain  │    │
│                      │              │  │  (Anvil/Red) │    │
│                      │ - claimreqs  │  │              │    │
│                      │ - transacts │  │ - Identity   │    │
│                      │              │  │   Contract   │    │
│                      └──────────────┘  └──────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Flujo de Datos:
1. Frontend → API Routes → MongoDB (lectura/escritura)
2. API Routes → Blockchain (operaciones on-chain)
3. Blockchain → API Routes → MongoDB (sincronización)
```

### Estados de una Solicitud de Claim

```
┌─────────┐
│ PENDING│ ← Estado inicial al crear solicitud
└───┬────┘
    │
    ├─────────────────┐
    │                 │
    ▼                 ▼
┌─────────┐    ┌──────────┐
│APPROVED │    │ REJECTED │ ← Estados intermedios
└───┬─────┘    └──────────┘
    │
    ▼
┌───────────┐
│ COMPLETED │ ← Estado final (claim en blockchain)
└───────────┘

Transiciones válidas:
- pending → approved → completed
- pending → rejected
- pending → completed (directo)
```

### Diagrama de Dependencias

```
┌─────────────────────────────────────────────────┐
│           Variables de Entorno                   │
│  - PRIVATE_KEY (para firmar transacciones)      │
│  - RPC_URL (conexión a blockchain)              │
│  - MONGODB_URI (conexión a base de datos)       │
└──────────────────┬────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│              API Routes                           │
│  ┌──────────────────────────────────────────┐   │
│  │ Rutas que requieren MongoDB:             │   │
│  │ - /register                              │   │
│  │ - /claim/request (POST/GET)              │   │
│  │ - /claim/approve                         │   │
│  │ - /claim/reject                          │   │
│  │ - /claims                                │   │
│  │ - /statistics                            │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ Rutas que requieren Blockchain:          │   │
│  │ - /deploy                                 │   │
│  │ - /claim/approve                          │   │
│  │ - /claim/add                              │   │
│  │ - /claim/remove                           │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

---

## 🗄️ Modelos de Datos

### ClaimRequest (MongoDB)

```typescript
{
  requesterAddress: string;      // Wallet que solicita
  identityAddress: string;        // Contrato Identity
  topic: number;                  // Tipo de claim (1-10)
  scheme: number;                 // Esquema de firma
  issuerAddress: string;          // Trusted Issuer asignado
  signature?: string;             // Firma criptográfica
  dataText?: string;              // Datos en texto
  dataHex?: string;               // Datos en hexadecimal
  uri?: string;                   // URI con documentación
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  claimTxHash?: string;           // Hash de transacción (si completado)
  rejectionReason?: string;       // Razón de rechazo
  issuerNotes?: string;           // Notas del issuer
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;              // Fecha de revisión
  reviewedBy?: string;            // Wallet que revisó
}
```

### Transaction (MongoDB)

```typescript
{
  txHash: string;
  fromAddress: string;
  contractAddress: string;
  type: 'identity-registration' | ...;
  status: 'pending' | 'confirmed' | 'failed';
  metadata: {
    identityAddress?: string;
  };
}
```

---

## 🔐 Seguridad y Validaciones

### Validaciones Comunes:
- ✅ Direcciones Ethereum válidas (`ethers.isAddress()`)
- ✅ Parámetros requeridos presentes
- ✅ Estados válidos en transiciones
- ✅ Permisos de issuer en aprobaciones/rechazos

### Dependencias Externas:
- **MongoDB**: Base de datos para almacenar solicitudes y transacciones
- **Blockchain (Anvil/Red)**: Para desplegar contratos y agregar claims
- **Variables de Entorno**:
  - `PRIVATE_KEY`: Clave privada para firmar transacciones
  - `RPC_URL`: URL del nodo blockchain

---

## 📊 Códigos de Estado HTTP

- `200`: Operación exitosa
- `201`: Recurso creado exitosamente
- `400`: Error de validación (parámetros inválidos)
- `403`: Sin permisos (issuer incorrecto)
- `404`: Recurso no encontrado
- `409`: Conflicto (recurso ya existe)
- `500`: Error interno del servidor
- `503`: Servicio no disponible (MongoDB/Blockchain no accesible)

---

## 🔍 Ejemplos de Uso

### Ejemplo 1: Crear Solicitud de Claim

```bash
curl -X POST http://localhost:4001/api/identity/claim/request \
  -H "Content-Type: application/json" \
  -d '{
    "requesterAddress": "0x123...",
    "identityAddress": "0x456...",
    "topic": 1,
    "scheme": 1,
    "issuerAddress": "0x789...",
    "dataText": "KYC Approved"
  }'
```

### Ejemplo 2: Aprobar Solicitud

```bash
curl -X POST http://localhost:4001/api/identity/claim/approve \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "507f1f77bcf86cd799439011",
    "issuerAddress": "0x789...",
    "issuerNotes": "Documentación verificada"
  }'
```

### Ejemplo 3: Obtener Estadísticas

```bash
curl http://localhost:4001/api/identity/statistics?identityAddress=0x456...
```

---

## 📝 Notas Importantes

1. **MongoDB es requerido**: Todas las rutas que interactúan con datos requieren MongoDB activo
2. **Blockchain para operaciones on-chain**: Las rutas que modifican contratos requieren blockchain accesible
3. **PRIVATE_KEY debe corresponder al issuer**: Para aprobar claims, la PRIVATE_KEY debe ser del Trusted Issuer
4. **Estados de solicitudes**: Solo se pueden aprobar/rechazar solicitudes con estado `pending`
5. **Filtros opcionales**: Muchas rutas GET aceptan filtros opcionales para consultas específicas

---

**Última actualización:** 2024-12-27

