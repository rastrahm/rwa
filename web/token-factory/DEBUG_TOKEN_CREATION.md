# Debug: Error en Creación de Tokens

## Problema

Al crear un token, Anvil muestra errores de `execution reverted` cuando se intenta llamar a `symbol()` y `decimals()` en el token recién creado.

## Análisis del Error

El error muestra:
```
RPC request failed:
    Request: EthCall(..., data: Some(0x95d89b41))  // symbol()
    Request: EthCall(..., data: Some(0x313ce567))  // decimals()
    Error: Execution error: execution reverted
```

Esto indica que:
1. El token se está creando (el clone se despliega)
2. Pero cuando se intenta leer información del token, revierte
3. Esto sugiere que el token no está completamente inicializado

## Posibles Causas

1. **Inicialización fallida**: El `initialize()` del token puede estar fallando silenciosamente
2. **Registries inválidos**: Las direcciones de IdentityRegistry, TrustedIssuersRegistry o ClaimTopicsRegistry pueden ser inválidas
3. **Timing issue**: El token se crea pero no está listo cuando se intenta leer
4. **Problema con el proxy**: El minimal proxy no está delegando correctamente

## Soluciones Implementadas

### 1. Mejora en `loadTokens()`
- Verificación de inicialización antes de leer funciones
- Manejo individual de errores para cada función ERC20
- Timeouts para evitar esperas infinitas
- Saltar tokens no inicializados en lugar de fallar

### 2. Mejora en `createToken()`
- Validación de direcciones de registries antes de crear
- Mejor logging del proceso de creación
- Verificación más robusta de inicialización
- Más reintentos con delays apropiados

### 3. Verificación de Inicialización
- Verificar `totalSupply()` primero (requiere inicialización)
- Verificar `name()` para confirmar inicialización completa
- Timeouts para evitar esperas infinitas
- Mejor manejo de errores de revert

## Cómo Verificar

1. **Revisar logs de consola** cuando se crea un token:
   - Debe mostrar los parámetros de creación
   - Debe mostrar la confirmación de transacción
   - Debe mostrar la verificación de inicialización

2. **Verificar en Anvil**:
   - Revisar si la transacción de creación fue exitosa
   - Verificar si hay eventos `TokenCreated` emitidos
   - Verificar el estado del token después de la creación

3. **Verificar direcciones de registries**:
   - Asegurarse de que `IDENTITY_REGISTRY_ADDRESS` es válida
   - Asegurarse de que `TRUSTED_ISSUERS_REGISTRY_ADDRESS` es válida
   - Asegurarse de que `CLAIM_TOPICS_REGISTRY_ADDRESS` es válida

## Próximos Pasos

Si el problema persiste:

1. **Verificar el contrato TokenCloneFactory**:
   - Asegurarse de que `createToken()` está llamando `initialize()` correctamente
   - Verificar que no hay errores en la inicialización

2. **Verificar los registries**:
   - Asegurarse de que los registries están desplegados
   - Verificar que las direcciones en `.env` son correctas

3. **Agregar más logging**:
   - Loggear el resultado de `initialize()`
   - Loggear el estado del token después de la inicialización

4. **Probar con un token simple**:
   - Crear un token sin registries (si es posible)
   - Verificar si el problema es específico de los registries

