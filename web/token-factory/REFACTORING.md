# Refactorización de Token Factory

## Resumen

Se ha realizado una refactorización completa del código de `token-factory` para mejorar la gestión de conexiones a MongoDB y Anvil, centralizar la configuración y mejorar el manejo de errores.

## Cambios Realizados

### 1. Módulo de Configuración Centralizado

**Archivo:** `app/lib/config/connections.ts`

- Configuración centralizada para MongoDB y Anvil
- Funciones de validación de conexiones:
  - `validateMongoDBConnection()` - Valida conexión a MongoDB
  - `validateAnvilConnection()` - Valida conexión a Anvil (RPC)
  - `validateAllConnections()` - Valida ambas conexiones
  - `healthCheck()` - Health check completo del sistema
- Manejo robusto de errores y timeouts

### 2. Utilidades MongoDB

**Archivo:** `app/lib/utils/mongodb.ts`

- Funciones helper para operaciones comunes:
  - `withMongoDBConnection()` - Ejecuta operaciones con validación automática
  - `getMongoCollection()` - Obtiene colección con validación
  - `findDocuments()` - Consulta documentos con manejo de errores
  - `insertDocument()` - Inserta documentos con validación
  - `updateDocument()` - Actualiza documentos con validación
- Eliminación de código duplicado
- Manejo consistente de errores de conexión

### 3. Refactorización de Rutas API

#### `app/api/tokens/route.ts`
- Eliminado código duplicado de conexión MongoDB
- Uso de `findDocuments()` para consultas
- Manejo de errores mejorado

#### `app/api/tokens/create/route.ts`
- Eliminado código duplicado de conexión MongoDB
- Uso de `insertDocument()` para insertar transacciones y attachments
- Código más limpio y mantenible

#### `app/api/tokens/purchase/route.ts`
- Refactorizado para usar `insertDocument()`
- Manejo de errores consistente

### 4. Endpoint de Health Check

**Archivo:** `app/api/health/route.ts`

- Endpoint `/api/health` para verificar estado de conexiones
- Retorna estado de MongoDB y Anvil
- Útil para monitoreo y debugging

### 5. Hook de Conexiones

**Archivo:** `app/hooks/useConnections.tsx`

- Hook React para verificar estado de conexiones en el cliente
- Actualización automática cada 30 segundos
- Estado reactivo para mostrar en UI

### 6. Componente de Estado de Conexiones

**Archivo:** `app/components/connections/ConnectionStatus.tsx`

- Componente visual para mostrar estado de conexiones
- Indicadores visuales (✅/❌)
- Botón para actualizar manualmente
- Muestra última verificación

## Estructura de Archivos

```
web/token-factory/
├── app/
│   ├── api/
│   │   ├── health/
│   │   │   └── route.ts          # Nuevo: Health check endpoint
│   │   └── tokens/
│   │       ├── route.ts          # Refactorizado
│   │       ├── create/
│   │       │   └── route.ts      # Refactorizado
│   │       └── purchase/
│   │           └── route.ts      # Refactorizado
│   ├── components/
│   │   └── connections/
│   │       └── ConnectionStatus.tsx  # Nuevo: Componente de estado
│   ├── hooks/
│   │   └── useConnections.tsx   # Nuevo: Hook de conexiones
│   ├── lib/
│   │   ├── config/
│   │   │   └── connections.ts   # Nuevo: Configuración centralizada
│   │   └── utils/
│   │       └── mongodb.ts        # Nuevo: Utilidades MongoDB
│   └── layout.tsx                # Actualizado: Agregado ConnectionStatus
```

## Validación de Conexiones

### MongoDB

La validación de MongoDB:
1. Conecta usando `connectDB()` del módulo compartido
2. Verifica que `readyState === 1`
3. Hace ping a la base de datos
4. Retorna estado con información de error si falla

### Anvil (RPC)

La validación de Anvil:
1. Crea un `JsonRpcProvider` con la URL configurada
2. Intenta obtener el número de bloque (con timeout)
3. Obtiene información de la red (chainId)
4. Retorna estado con información de error si falla

## Configuración

Las configuraciones se obtienen de variables de entorno a través de `@/shared/lib/env`:

- `MONGODB_URI` - URI de conexión a MongoDB
- `RPC_URL` - URL del RPC de Anvil
- `CHAIN_ID` - Chain ID de la red

## Uso

### Verificar Estado de Conexiones

```typescript
import { validateAllConnections } from '@/app/lib/config/connections';

const status = await validateAllConnections();
console.log('MongoDB:', status.mongodb.connected);
console.log('Anvil:', status.anvil.connected);
```

### Usar Utilidades MongoDB

```typescript
import { findDocuments, insertDocument } from '@/app/lib/utils/mongodb';

// Consultar documentos
const tokens = await findDocuments('transactions', {
  type: 'token-creation',
}, { sort: { createdAt: -1 }, limit: 10 });

// Insertar documento
const newToken = await insertDocument('transactions', {
  txHash: '0x...',
  type: 'token-creation',
  // ...
});
```

### Usar Hook de Conexiones

```typescript
import { useConnections } from '@/app/hooks/useConnections';

function MyComponent() {
  const { connectionStatus, isChecking, checkConnections } = useConnections();
  
  if (connectionStatus.status === 'unhealthy') {
    return <div>Servicios no disponibles</div>;
  }
  
  return <div>Todo funcionando</div>;
}
```

## Beneficios

1. **Código más limpio**: Eliminación de código duplicado
2. **Mantenibilidad**: Configuración centralizada
3. **Robustez**: Manejo consistente de errores
4. **Observabilidad**: Health check endpoint y componente visual
5. **Reutilización**: Utilidades compartidas para operaciones MongoDB
6. **Validación**: Verificación automática de conexiones antes de operaciones

## Próximos Pasos

1. Agregar tests para las nuevas utilidades
2. Implementar retry logic con backoff exponencial
3. Agregar métricas de performance
4. Implementar cache para resultados de health check
5. Agregar alertas cuando las conexiones fallen

