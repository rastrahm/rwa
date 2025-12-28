# Guía de Diagnóstico para Creación de Tokens

## Problema

Al crear un token, la transacción se confirma pero el token no se registra correctamente. Los errores en Anvil muestran `execution reverted` cuando se intenta leer información del token.

## Herramientas de Diagnóstico

### 1. Componente de Diagnóstico de Contratos

Se ha agregado un componente `ContractDiagnostics` en la página principal que muestra:
- Estado de conexión a Anvil
- Estado de cada contrato (IdentityRegistry, TrustedIssuersRegistry, ClaimTopicsRegistry, TokenCloneFactory)
- Si los contratos están desplegados
- Si las direcciones son válidas
- Detalles de la implementación del factory

**Ubicación:** Parte superior de la página principal de Token Factory

### 2. Endpoint de Diagnóstico

**URL:** `GET /api/diagnostics/contracts`

Retorna información detallada sobre el estado de todos los contratos.

### 3. Logs Mejorados

Al crear un token, ahora verás en la consola:
- Parámetros de creación
- Verificación de registries desplegados
- Estado de la transacción
- Logs de eventos
- Proceso de obtención de la dirección del token
- Verificación de inicialización

## Verificaciones Implementadas

### Antes de Crear el Token

1. **Validación de direcciones**: Verifica que todas las direcciones sean válidas
2. **Verificación de deployment**: Verifica que todos los registries estén desplegados
3. **Verificación del factory**: Verifica que el factory y su implementación estén desplegados

### Durante la Creación

1. **Logging detallado**: Muestra cada paso del proceso
2. **Verificación de transacción**: Verifica que la transacción sea exitosa
3. **Parsing de eventos**: Intenta obtener la dirección del token de múltiples formas

### Después de la Creación

1. **Verificación de inicialización**: Verifica que el token esté completamente inicializado
2. **Múltiples reintentos**: Reintenta hasta 10 veces con delays apropiados
3. **Manejo de errores**: Proporciona mensajes de error claros

## Cómo Usar el Diagnóstico

### Paso 1: Verificar Contratos

1. Abre la página principal de Token Factory
2. Revisa el componente "Diagnóstico de Contratos" en la parte superior
3. Verifica que todos los contratos muestren ✅ Desplegado

### Paso 2: Verificar Variables de Entorno

Asegúrate de que las siguientes variables estén configuradas en `.env.local`:

```env
NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_CLAIM_TOPICS_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_CLONE_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
```

### Paso 3: Verificar Deployment en Anvil

1. Asegúrate de que Anvil esté corriendo
2. Verifica que los contratos estén desplegados usando el componente de diagnóstico
3. Si algún contrato no está desplegado, ejecuta el script de deployment

### Paso 4: Crear Token y Revisar Logs

1. Intenta crear un token
2. Abre la consola del navegador (F12)
3. Revisa los logs para ver:
   - Si los registries están desplegados
   - Si la transacción fue exitosa
   - Si se encontró el evento TokenCreated
   - Si el token se inicializó correctamente

## Problemas Comunes y Soluciones

### Problema: "IdentityRegistry no está desplegado"

**Solución:**
1. Verifica que el contrato IdentityRegistry esté desplegado en Anvil
2. Verifica que la dirección en `.env.local` sea correcta
3. Ejecuta el script de deployment si es necesario

### Problema: "La transacción fue revertida"

**Solución:**
1. Revisa los logs de Anvil para ver el motivo del revert
2. Verifica que todos los registries estén desplegados
3. Verifica que las direcciones de los registries sean correctas
4. Verifica que el factory esté correctamente configurado

### Problema: "No se encontró evento TokenCreated"

**Solución:**
1. Verifica que el factory esté desplegado
2. Verifica que la implementación del factory esté desplegada
3. Revisa los logs de la transacción en Anvil
4. Verifica que el ABI del factory incluya el evento TokenCreated

### Problema: "Token no está completamente inicializado"

**Solución:**
1. Espera unos segundos y recarga la lista de tokens
2. Verifica que los registries estén funcionando correctamente
3. Revisa los logs de Anvil para ver si hay errores durante la inicialización
4. Verifica que el contrato TokenCloneable tenga la función initialize() correctamente implementada

## Próximos Pasos

Si después de seguir esta guía el problema persiste:

1. **Revisa los logs de Anvil** para ver errores específicos
2. **Verifica el contrato TokenCloneable** para asegurar que initialize() funcione correctamente
3. **Prueba crear un token manualmente** usando Foundry para ver si el problema es del contrato o del frontend
4. **Revisa las variables de entorno** para asegurar que todas las direcciones sean correctas

