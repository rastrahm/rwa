# Documentación de Tests - RWA Token Platform

**Total de Tests:** 202  
**Estado:** ✅ Todos pasando (202/202)  
**Framework:** Foundry  
**Fecha:** 2024

---

## Índice

1. [Identity System Tests](#1-identity-system-tests)
2. [Compliance Modules Tests](#2-compliance-modules-tests)
3. [Token Core Tests](#3-token-core-tests)
4. [Integración Tests](#4-integración-tests)
5. [Factory & Clones Tests](#5-factory--clones-tests)
6. [Tests de Integración Completa](#6-tests-de-integración-completa)

---

## 1. Identity System Tests

### 1.1 Identity.sol (7 tests)

**Archivo:** `test/Identity.t.sol`

#### `test_Constructor()`
- **Propósito:** Verifica que el contrato Identity se inicializa correctamente
- **Qué prueba:** Que el owner se asigna correctamente al crear el contrato
- **Importancia:** Asegura que el control de acceso funciona desde el inicio

#### `test_AddClaim()`
- **Propósito:** Verifica que se pueden agregar claims a una identidad
- **Qué prueba:** 
  - Que el owner puede agregar claims
  - Que el claim se almacena correctamente
  - Que se emite el evento `ClaimAdded`
- **Importancia:** Funcionalidad core del sistema de identidad

#### `test_GetClaim()`
- **Propósito:** Verifica que se pueden recuperar claims almacenados
- **Qué prueba:** Que los datos del claim (topic, issuer, signature, data, uri) se recuperan correctamente
- **Importancia:** Permite verificar claims para compliance

#### `test_ClaimExists()`
- **Propósito:** Verifica la función de verificación de existencia de claims
- **Qué prueba:** 
  - Retorna `true` cuando el claim existe
  - Retorna `false` cuando no existe
- **Importancia:** Usado por `Token.isVerified()` para validar usuarios

#### `test_RemoveClaim()`
- **Propósito:** Verifica que se pueden remover claims
- **Qué prueba:** 
  - Que el claim se elimina correctamente
  - Que se emite el evento `ClaimRemoved`
- **Importancia:** Permite revocar verificaciones

#### `test_RevertWhen_AddClaim_NotOwner()`
- **Propósito:** Verifica el control de acceso
- **Qué prueba:** Que solo el owner puede agregar claims
- **Importancia:** Seguridad - previene que usuarios agreguen claims falsos

#### `test_RevertWhen_RemoveClaim_NotOwner()`
- **Propósito:** Verifica el control de acceso
- **Qué prueba:** Que solo el owner puede remover claims
- **Importancia:** Seguridad - previene remoción no autorizada

---

### 1.2 IdentityRegistry.sol (14 tests)

**Archivo:** `test/IdentityRegistry.t.sol`

#### `test_Constructor()`
- **Propósito:** Verifica inicialización del registry
- **Qué prueba:** Que el owner se asigna correctamente

#### `test_RegisterIdentity()`
- **Propósito:** Verifica registro de identidades
- **Qué prueba:** 
  - Que se puede registrar un wallet con su Identity contract
  - Que se emite el evento `IdentityRegistered`
  - Que se actualiza el mapping y el array
- **Importancia:** Paso fundamental para que usuarios puedan usar el token

#### `test_UpdateIdentity()`
- **Propósito:** Verifica actualización de identidades
- **Qué prueba:** 
  - Que se puede cambiar el Identity contract de un wallet
  - Que se emite el evento `IdentityUpdated`
- **Importancia:** Permite migrar identidades si es necesario

#### `test_RemoveIdentity()`
- **Propósito:** Verifica remoción de identidades
- **Qué prueba:** 
  - Que se elimina del mapping y array
  - Que se emite el evento `IdentityRemoved`
  - Que el contador se actualiza correctamente
- **Importancia:** Permite deshabilitar usuarios

#### `test_GetIdentity()`
- **Propósito:** Verifica recuperación de Identity contract
- **Qué prueba:** Que retorna la dirección correcta del Identity contract

#### `test_IsRegistered()`
- **Propósito:** Verifica función de verificación de registro
- **Qué prueba:** Retorna `true` si está registrado, `false` si no

#### `test_GetRegisteredCount()`
- **Propósito:** Verifica contador de usuarios registrados
- **Qué prueba:** Que retorna el número correcto de usuarios

#### `test_GetRegisteredAddress()`
- **Propósito:** Verifica acceso a direcciones por índice
- **Qué prueba:** Que retorna la dirección correcta del índice

#### Tests de Reversión:
- `test_RevertWhen_RegisterIdentity_AlreadyRegistered()` - Previene doble registro
- `test_RevertWhen_RegisterIdentity_InvalidWallet()` - Valida dirección no cero
- `test_RevertWhen_RegisterIdentity_InvalidIdentity()` - Valida Identity contract válido
- `test_RevertWhen_RegisterIdentity_NotOwner()` - Control de acceso
- `test_RevertWhen_RemoveIdentity_WalletNotRegistered()` - Valida existencia
- `test_RevertWhen_UpdateIdentity_WalletNotRegistered()` - Valida existencia
- `test_RevertWhen_GetRegisteredAddress_IndexOutOfBounds()` - Previene acceso inválido

---

### 1.3 TrustedIssuersRegistry.sol (17 tests)

**Archivo:** `test/TrustedIssuersRegistry.t.sol`

#### `test_Constructor()`
- **Propósito:** Verifica inicialización

#### `test_AddTrustedIssuer()`
- **Propósito:** Verifica agregado de issuers confiables
- **Qué prueba:** 
  - Que se agrega el issuer con sus claim topics
  - Que se emite el evento `TrustedIssuerAdded`
  - Que se actualiza el array de issuers
- **Importancia:** Solo claims de trusted issuers son válidos

#### `test_RemoveTrustedIssuer()`
- **Propósito:** Verifica remoción de issuers
- **Qué prueba:** 
  - Que se elimina del mapping y array
  - Que se emite el evento `TrustedIssuerRemoved`
- **Importancia:** Permite revocar confianza en un issuer

#### `test_UpdateIssuerClaimTopics()`
- **Propósito:** Verifica actualización de topics permitidos
- **Qué prueba:** 
  - Que se actualizan los topics del issuer
  - Que se emite el evento `ClaimTopicsUpdated`
- **Importancia:** Permite cambiar qué topics puede emitir un issuer

#### `test_IsTrustedIssuer()`
- **Propósito:** Verifica función de verificación
- **Qué prueba:** Retorna `true` si es trusted, `false` si no

#### `test_GetIssuerClaimTopics()`
- **Propósito:** Verifica recuperación de topics
- **Qué prueba:** Retorna el array correcto de topics

#### `test_HasClaimTopic()`
- **Propósito:** Verifica si un issuer puede emitir un topic específico
- **Qué prueba:** 
  - Retorna `true` si el issuer puede emitir el topic
  - Retorna `false` si no puede o no es trusted
- **Importancia:** Usado por `Token.isVerified()` para validar claims

#### `test_GetTrustedIssuers()`
- **Propósito:** Verifica recuperación de todos los issuers
- **Qué prueba:** Retorna el array completo de issuers

#### `test_GetTrustedIssuersCount()`
- **Propósito:** Verifica contador de issuers
- **Qué prueba:** Retorna el número correcto

#### Tests de Reversión:
- `test_RevertWhen_AddTrustedIssuer_AlreadyTrusted()` - Previene duplicados
- `test_RevertWhen_AddTrustedIssuer_EmptyTopics()` - Valida que hay topics
- `test_RevertWhen_AddTrustedIssuer_InvalidAddress()` - Valida dirección
- `test_RevertWhen_AddTrustedIssuer_NotOwner()` - Control de acceso
- `test_RevertWhen_RemoveTrustedIssuer_NotTrusted()` - Valida existencia
- `test_RevertWhen_UpdateIssuerClaimTopics_EmptyTopics()` - Valida topics
- `test_RevertWhen_UpdateIssuerClaimTopics_NotTrusted()` - Valida existencia

---

### 1.4 ClaimTopicsRegistry.sol (13 tests)

**Archivo:** `test/ClaimTopicsRegistry.t.sol`

#### `test_Constructor()`
- **Propósito:** Verifica inicialización

#### `test_AddClaimTopic()`
- **Propósito:** Verifica agregado de topics requeridos
- **Qué prueba:** 
  - Que se agrega el topic al array
  - Que se emite el evento `ClaimTopicAdded`
- **Importancia:** Define qué claims son obligatorios para usar el token

#### `test_RemoveClaimTopic()`
- **Propósito:** Verifica remoción de topics
- **Qué prueba:** 
  - Que se elimina del array correctamente
  - Que se emite el evento `ClaimTopicRemoved`
- **Importancia:** Permite cambiar requisitos de compliance

#### `test_ClaimTopicExists()`
- **Propósito:** Verifica función de verificación
- **Qué prueba:** Retorna `true` si existe, `false` si no

#### `test_GetClaimTopics()`
- **Propósito:** Verifica recuperación de todos los topics
- **Qué prueba:** Retorna el array completo

#### `test_GetClaimTopicsCount()`
- **Propósito:** Verifica contador de topics
- **Qué prueba:** Retorna el número correcto

#### `test_MultipleClaimTopics()`
- **Propósito:** Verifica manejo de múltiples topics
- **Qué prueba:** Que se pueden agregar y recuperar múltiples topics

#### Tests de Remoción en Diferentes Posiciones:
- `test_RemoveClaimTopic_FirstElement()` - Prueba remoción del inicio
- `test_RemoveClaimTopic_LastElement()` - Prueba remoción del final
- `test_RemoveClaimTopic_MiddleElement()` - Prueba remoción del medio
- **Importancia:** Verifica que el algoritmo de swap funciona correctamente

#### Tests de Reversión:
- `test_RevertWhen_AddClaimTopic_AlreadyExists()` - Previene duplicados
- `test_RevertWhen_AddClaimTopic_NotOwner()` - Control de acceso
- `test_RevertWhen_RemoveClaimTopic_DoesNotExist()` - Valida existencia
- `test_RevertWhen_RemoveClaimTopic_NotOwner()` - Control de acceso

---

### 1.5 Identity Integration Tests (6 tests)

**Archivo:** `test/IdentityIntegration.t.sol`

#### `test_CompleteIdentityVerification_Flow()`
- **Propósito:** Prueba el flujo completo de verificación
- **Qué prueba:** 
  - Registro de usuario
  - Agregado de claim topic requerido
  - Agregado de trusted issuer
  - Emisión de claim
  - Verificación exitosa
- **Importancia:** Verifica que todos los componentes trabajan juntos

#### `test_VerificationFails_WhenMissingRequiredClaim()`
- **Propósito:** Verifica que falla si falta un claim requerido
- **Qué prueba:** Que un usuario sin todos los claims requeridos no pasa verificación
- **Importancia:** Seguridad - asegura compliance completo

#### `test_VerificationFails_WhenIssuerNotTrusted()`
- **Propósito:** Verifica que solo claims de trusted issuers son válidos
- **Qué prueba:** Que un claim de un issuer no trusted no pasa verificación
- **Importancia:** Seguridad - previene claims falsos

#### `test_VerificationFails_WhenIssuerCannotIssueTopic()`
- **Propósito:** Verifica que el issuer debe tener permiso para el topic
- **Qué prueba:** Que un issuer sin permiso para un topic no puede emitir claims válidos
- **Importancia:** Control granular de permisos

#### `test_VerificationWorks_WithMultipleIssuersForSameTopic()`
- **Propósito:** Verifica flexibilidad con múltiples issuers
- **Qué prueba:** Que un usuario puede tener claims de diferentes issuers para el mismo topic
- **Importancia:** Permite redundancia y flexibilidad

#### `test_VerificationUpdates_WhenRequirementsChange()`
- **Propósito:** Verifica comportamiento dinámico
- **Qué prueba:** 
  - Que al agregar un nuevo topic requerido, usuarios existentes deben obtenerlo
  - Que al remover un topic, usuarios ya no necesitan ese claim
- **Importancia:** Verifica que el sistema se adapta a cambios

---

## 2. Compliance Modules Tests

### 2.1 ICompliance Interface (7 tests)

**Archivo:** `test/ICompliance.t.sol`

#### `test_InterfaceExists()`
- **Propósito:** Verifica que la interfaz está definida
- **Qué prueba:** Que se puede importar y usar la interfaz

#### `test_InterfaceCanBeUsedAsType()`
- **Propósito:** Verifica que se puede usar como tipo
- **Qué prueba:** Que se puede declarar variables del tipo `ICompliance`

#### `test_CanTransfer_ReturnsTrue()`
- **Propósito:** Verifica función `canTransfer()`
- **Qué prueba:** Que retorna un booleano correctamente

#### `test_CanTransfer_WithDifferentParameters()`
- **Propósito:** Verifica que acepta diferentes parámetros
- **Qué prueba:** Que funciona con diferentes direcciones y cantidades

#### `test_Transferred_CanBeCalled()`
- **Propósito:** Verifica función `transferred()`
- **Qué prueba:** Que se puede llamar sin errores

#### `test_Created_CanBeCalled()`
- **Propósito:** Verifica función `created()`
- **Qué prueba:** Que se puede llamar sin errores

#### `test_Destroyed_CanBeCalled()`
- **Propósito:** Verifica función `destroyed()`
- **Qué prueba:** Que se puede llamar sin errores

**Importancia:** Asegura que la interfaz está correctamente definida y puede ser implementada

---

### 2.2 MaxBalanceCompliance (14 tests)

**Archivo:** `test/MaxBalanceCompliance.t.sol`

#### `test_Constructor()`
- **Propósito:** Verifica inicialización
- **Qué prueba:** Que `maxBalance` y `tokenContract` se asignan correctamente

#### `test_CanTransfer_WhenRecipientHasZeroBalance()`
- **Propósito:** Verifica caso básico
- **Qué prueba:** Que permite transferencia cuando el destinatario tiene balance 0
- **Lógica:** `0 + amount <= maxBalance` debe ser `true`

#### `test_CanTransfer_WhenUnderMaxBalance()`
- **Propósito:** Verifica caso normal
- **Qué prueba:** Que permite cuando `balance + amount < maxBalance`

#### `test_CanTransfer_WhenExactlyMaxBalance()`
- **Propósito:** Verifica caso límite
- **Qué prueba:** Que permite cuando `balance + amount == maxBalance`
- **Importancia:** Verifica que el límite es inclusivo

#### `test_CannotTransfer_WhenExceedsMaxBalance()`
- **Propósito:** Verifica rechazo correcto
- **Qué prueba:** Que rechaza cuando `balance + amount > maxBalance`
- **Importancia:** Seguridad - previene exceder límites

#### `test_CannotTransfer_WhenRecipientHasMaxBalance()`
- **Propósito:** Verifica caso cuando ya está en el límite
- **Qué prueba:** Que rechaza cualquier transferencia adicional

#### `test_CanTransfer_IgnoresSender()`
- **Propósito:** Verifica que solo valida el destinatario
- **Qué prueba:** Que el balance del remitente no afecta la validación
- **Importancia:** Clarifica el comportamiento del módulo

#### `test_SetMaxBalance()`
- **Propósito:** Verifica actualización del límite
- **Qué prueba:** 
  - Que el owner puede cambiar el límite
  - Que se emite el evento `MaxBalanceUpdated`

#### `test_SetTokenContract()`
- **Propósito:** Verifica actualización del token contract
- **Qué prueba:** 
  - Que el owner puede cambiar la referencia
  - Que se emite el evento `TokenContractUpdated`

#### `test_Transferred_CanBeCalled()`
- **Propósito:** Verifica que la función existe
- **Qué prueba:** Que se puede llamar (no hace nada en este módulo)

#### `test_Created_CanBeCalled()`
- **Propósito:** Verifica que la función existe
- **Qué prueba:** Que se puede llamar (no hace nada en este módulo)

#### `test_Destroyed_CanBeCalled()`
- **Propósito:** Verifica que la función existe
- **Qué prueba:** Que se puede llamar (no hace nada en este módulo)

#### Tests de Control de Acceso:
- `test_RevertWhen_SetMaxBalance_NotOwner()` - Solo owner puede cambiar
- `test_RevertWhen_SetTokenContract_NotOwner()` - Solo owner puede cambiar

---

### 2.3 MaxHoldersCompliance (15 tests)

**Archivo:** `test/MaxHoldersCompliance.t.sol`

#### `test_Constructor()`
- **Propósito:** Verifica inicialización
- **Qué prueba:** Que `maxHolders` y `tokenContract` se asignan correctamente

#### `test_CanTransfer_ToExistingHolder()`
- **Propósito:** Verifica caso cuando el destinatario ya es holder
- **Qué prueba:** Que siempre permite (no aumenta el contador)
- **Importancia:** Optimización - no cuenta duplicados

#### `test_CanTransfer_WhenUnderMaxHolders()`
- **Propósito:** Verifica caso normal
- **Qué prueba:** Que permite cuando `holdersCount < maxHolders`

#### `test_CannotExceedMaxHolders()`
- **Propósito:** Verifica rechazo correcto
- **Qué prueba:** Que rechaza cuando `holdersCount >= maxHolders` y el destinatario es nuevo
- **Importancia:** Seguridad - previene exceder límite

#### `test_CanTransfer_AfterMaxHoldersUpdated()`
- **Propósito:** Verifica comportamiento dinámico
- **Qué prueba:** Que al aumentar el límite, se pueden agregar más holders

#### `test_Transferred_AddsNewHolder()`
- **Propósito:** Verifica actualización de estado
- **Qué prueba:** 
  - Que cuando un nuevo usuario recibe tokens, se agrega como holder
  - Que el contador se incrementa
  - Que se emite el evento `HolderAdded`

#### `test_Transferred_DoesNotAddDuplicateHolder()`
- **Propósito:** Verifica que no cuenta duplicados
- **Qué prueba:** Que si el usuario ya es holder, no se incrementa el contador

#### `test_Transferred_RemovesHolder_WhenBalanceZero()`
- **Propósito:** Verifica remoción de holders
- **Qué prueba:** 
  - Que cuando un usuario transfiere todos sus tokens (balance = 0), se remueve como holder
  - Que el contador se decrementa
  - Que se emite el evento `HolderRemoved`

#### `test_Created_AddsNewHolder()`
- **Propósito:** Verifica que mint también actualiza holders
- **Qué prueba:** Que al mintear a un nuevo usuario, se agrega como holder

#### `test_Destroyed_RemovesHolder_WhenBalanceZero()`
- **Propósito:** Verifica que burn también actualiza holders
- **Qué prueba:** Que al quemar todos los tokens de un usuario, se remueve como holder

#### `test_Destroyed_DoesNotRemoveHolder_WhenBalanceNotZero()`
- **Propósito:** Verifica lógica correcta
- **Qué prueba:** Que si el usuario aún tiene balance, no se remueve

#### `test_IsHolder()`
- **Propósito:** Verifica función de consulta
- **Qué prueba:** Retorna `true` si es holder, `false` si no

#### `test_GetHoldersCount()`
- **Propósito:** Verifica contador
- **Qué prueba:** Retorna el número correcto de holders

#### Tests de Control de Acceso:
- `test_RevertWhen_SetMaxHolders_NotOwner()` - Solo owner puede cambiar
- `test_RevertWhen_SetTokenContract_NotOwner()` - Solo owner puede cambiar

---

### 2.4 TransferLockCompliance (14 tests)

**Archivo:** `test/TransferLockCompliance.t.sol`

#### `test_Constructor()`
- **Propósito:** Verifica inicialización
- **Qué prueba:** Que `lockPeriod` se asigna correctamente

#### `test_CanTransfer_WhenNoLock()`
- **Propósito:** Verifica caso sin lock
- **Qué prueba:** Que permite cuando `lockUntil == 0`
- **Importancia:** Usuarios sin lock pueden transferir libremente

#### `test_CannotTransferDuringLockPeriod()`
- **Propósito:** Verifica bloqueo durante el período
- **Qué prueba:** Que rechaza cuando `block.timestamp < lockUntil`
- **Importancia:** Seguridad - previene transferencias inmediatas

#### `test_CanTransfer_ExactlyAtLockPeriod()`
- **Propósito:** Verifica caso límite
- **Qué prueba:** Que permite cuando `block.timestamp == lockUntil`
- **Importancia:** Verifica que el límite es inclusivo

#### `test_CanTransfer_AfterLockPeriod()`
- **Propósito:** Verifica desbloqueo
- **Qué prueba:** Que permite cuando `block.timestamp > lockUntil`
- **Importancia:** Verifica que el lock expira correctamente

#### `test_Transferred_UpdatesLockUntil()`
- **Propósito:** Verifica actualización de lock
- **Qué prueba:** 
  - Que al recibir tokens, se actualiza `lockUntil = block.timestamp + lockPeriod`
  - Que se emite el evento `LockUpdated`

#### `test_Created_AlsoLocks()`
- **Propósito:** Verifica que mint también bloquea
- **Qué prueba:** Que al mintear tokens, se aplica el lock

#### `test_Destroyed_DoesNotAffectLock()`
- **Propósito:** Verifica que burn no afecta el lock
- **Qué prueba:** Que quemar tokens no cambia `lockUntil`
- **Importancia:** El usuario sigue bloqueado hasta que expire

#### `test_MultipleTransfers_ExtendLockPeriod()`
- **Propósito:** Verifica comportamiento con múltiples recepciones
- **Qué prueba:** Que cada vez que se reciben tokens, el lock se resetea/extiende
- **Importancia:** Previene que usuarios eviten el lock recibiendo tokens gradualmente

#### `test_MultipleUsers_IndependentLocks()`
- **Propósito:** Verifica independencia de locks
- **Qué prueba:** Que cada usuario tiene su propio `lockUntil`
- **Importancia:** Asegura que los locks no interfieren entre sí

#### `test_TransferFromZero_DoesNotLock()`
- **Propósito:** Verifica caso especial
- **Qué prueba:** Que `from == address(0)` (mint) no bloquea al remitente (no existe)

#### `test_IsLocked()`
- **Propósito:** Verifica función de consulta
- **Qué prueba:** Retorna `true` si está bloqueado, `false` si no

#### `test_GetLockUntil()`
- **Propósito:** Verifica función de consulta
- **Qué prueba:** Retorna el timestamp correcto de `lockUntil`

#### `test_SetLockPeriod()`
- **Propósito:** Verifica actualización del período
- **Qué prueba:** 
  - Que el owner puede cambiar el período
  - Que se emite el evento `LockPeriodUpdated`

#### `test_RevertWhen_SetLockPeriod_NotOwner()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo el owner puede cambiar el período

---

## 3. Token Core Tests

### 3.1 Token Básico - ERC-20 (15 tests)

**Archivo:** `test/Token.t.sol`

#### `test_Constructor()`
- **Propósito:** Verifica inicialización del token
- **Qué prueba:** 
  - Nombre, símbolo, decimals correctos
  - Total supply inicial en 0
  - Roles asignados correctamente
  - Registries asignados

#### `test_Mint()`
- **Propósito:** Verifica creación de tokens
- **Qué prueba:** 
  - Que se pueden mintear tokens
  - Que el balance se actualiza correctamente
  - Que el total supply se actualiza
  - Que requiere usuario verificado (implementado recientemente)

#### `test_RevertWhen_Mint_NotAgent()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo `AGENT_ROLE` puede mintear

#### `test_RevertWhen_Mint_ToZeroAddress()`
- **Propósito:** Validación de entrada
- **Qué prueba:** Que no se puede mintear a `address(0)`

#### `test_Transfer()`
- **Propósito:** Verifica transferencia básica
- **Qué prueba:** 
  - Que se pueden transferir tokens
  - Que los balances se actualizan correctamente
  - Que el total supply no cambia

#### `test_RevertWhen_Transfer_InsufficientBalance()`
- **Propósito:** Validación de balance
- **Qué prueba:** Que no se puede transferir más de lo que se tiene

#### `test_RevertWhen_Transfer_ToZeroAddress()`
- **Propósito:** Validación de entrada
- **Qué prueba:** Que no se puede transferir a `address(0)`

#### `test_TransferFrom()`
- **Propósito:** Verifica transferencia con approve
- **Qué prueba:** 
  - Que se puede transferir desde otra dirección con approve
  - Que el allowance se consume correctamente

#### `test_RevertWhen_TransferFrom_WithoutApprove()`
- **Propósito:** Validación de approve
- **Qué prueba:** Que no se puede transferir sin approve

#### `test_RevertWhen_TransferFrom_InsufficientAllowance()`
- **Propósito:** Validación de allowance
- **Qué prueba:** Que no se puede transferir más del allowance aprobado

#### `test_Approve()`
- **Propósito:** Verifica función approve
- **Qué prueba:** 
  - Que se puede aprobar una cantidad
  - Que el allowance se actualiza correctamente

#### `test_Burn()`
- **Propósito:** Verifica quema de tokens propios
- **Qué prueba:** 
  - Que se pueden quemar tokens
  - Que el balance y total supply se reducen

#### `test_BurnFrom()`
- **Propósito:** Verifica quema por agente
- **Qué prueba:** 
  - Que `AGENT_ROLE` puede quemar tokens de otros
  - Que el balance se reduce correctamente

#### `test_RevertWhen_BurnFrom_NotAgent()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo `AGENT_ROLE` puede usar `burnFrom()`

#### `test_Events()`
- **Propósito:** Verifica emisión de eventos
- **Qué prueba:** Que los eventos `Transfer` se emiten correctamente

---

### 3.2 Token Advanced Features (14 tests)

**Archivo:** `test/TokenAdvancedFeatures.t.sol`

#### `test_Pause()`
- **Propósito:** Verifica funcionalidad de pausa
- **Qué prueba:** 
  - Que se puede pausar el token
  - Que el estado `paused()` cambia a `true`
- **Importancia:** Mecanismo de emergencia

#### `test_Unpause()`
- **Propósito:** Verifica desbloqueo
- **Qué prueba:** Que se puede despausar el token

#### `test_RevertWhen_Pause_NotAdmin()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo `DEFAULT_ADMIN_ROLE` puede pausar

#### `test_CanTransfer_ReturnsFalse_WhenPaused()`
- **Propósito:** Verifica que pause bloquea transferencias
- **Qué prueba:** Que `canTransfer()` retorna `false` cuando está pausado

#### `test_Mint_WorksWhenPaused()`
- **Propósito:** Verifica comportamiento de mint durante pause
- **Qué prueba:** Que se puede mintear incluso cuando está pausado
- **Importancia:** Permite distribución durante emergencias

#### `test_Burn_WorksWhenPaused()`
- **Propósito:** Verifica comportamiento de burn durante pause
- **Qué prueba:** Que se puede quemar incluso cuando está pausado

#### `test_FreezeAccount()`
- **Propósito:** Verifica congelamiento de cuentas
- **Qué prueba:** 
  - Que se puede congelar una cuenta
  - Que se emite el evento `AccountFrozen`
  - Que `isFrozen()` retorna `true`

#### `test_UnfreezeAccount()`
- **Propósito:** Verifica descongelamiento
- **Qué prueba:** 
  - Que se puede descongelar una cuenta
  - Que se emite el evento `AccountUnfrozen`

#### `test_RevertWhen_FreezeAccount_NotAdmin()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo `DEFAULT_ADMIN_ROLE` puede congelar

#### `test_CanTransfer_ReturnsFalse_WhenFrozen()`
- **Propósito:** Verifica que freeze bloquea transferencias
- **Qué prueba:** Que `canTransfer()` retorna `false` para cuentas congeladas

#### `test_ForcedTransfer()`
- **Propósito:** Verifica transferencia forzada
- **Qué prueba:** 
  - Que `AGENT_ROLE` puede forzar transferencias
  - Que bypassa pause, freeze, identity y compliance
  - Que los balances se actualizan correctamente
- **Importancia:** Mecanismo administrativo para recuperación de fondos

#### `test_ForcedTransfer_WorksWhenPaused()`
- **Propósito:** Verifica que funciona durante pause
- **Qué prueba:** Que se puede forzar transferencia incluso cuando está pausado

#### `test_ForcedTransfer_WorksWithFrozenAccounts()`
- **Propósito:** Verifica que funciona con cuentas congeladas
- **Qué prueba:** Que se puede forzar transferencia desde/hacia cuentas congeladas

#### `test_RevertWhen_ForcedTransfer_NotAgent()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo `AGENT_ROLE` puede usar `forcedTransfer()`

---

## 4. Integración Tests

### 4.1 Token + Identity Integration (13 tests)

**Archivo:** `test/TokenIdentityIntegration.t.sol`

#### `test_IsVerified_ReturnsFalse_WhenNotRegistered()`
- **Propósito:** Verifica caso básico
- **Qué prueba:** Que usuarios no registrados no están verificados

#### `test_IsVerified_ReturnsTrue_WhenNoRequiredTopics()`
- **Propósito:** Verifica caso sin requisitos
- **Qué prueba:** Que si no hay topics requeridos, cualquier usuario registrado está verificado
- **Importancia:** Permite flexibilidad en configuración

#### `test_IsVerified_ReturnsTrue_WhenFullyVerified()`
- **Propósito:** Verifica caso completo
- **Qué prueba:** Que usuarios con todos los claims requeridos están verificados

#### `test_IsVerified_ReturnsFalse_WhenMissingClaims()`
- **Propósito:** Verifica validación estricta
- **Qué prueba:** Que falta un claim requerido causa fallo

#### `test_IsVerified_WithMultipleRequiredTopics()`
- **Propósito:** Verifica múltiples requisitos
- **Qué prueba:** Que se requieren TODOS los topics, no solo uno

#### `test_CanTransfer_WhenBothVerified()`
- **Propósito:** Verifica transferencia exitosa
- **Qué prueba:** Que usuarios verificados pueden transferir

#### `test_CannotTransfer_WhenSenderNotVerified()`
- **Propósito:** Verifica bloqueo de remitente
- **Qué prueba:** Que remitentes no verificados no pueden transferir

#### `test_CannotTransfer_WhenRecipientNotVerified()`
- **Propósito:** Verifica bloqueo de destinatario
- **Qué prueba:** Que destinatarios no verificados no pueden recibir

#### `test_CanTransferFrom_WhenBothVerified()`
- **Propósito:** Verifica transferFrom con verificación
- **Qué prueba:** Que `transferFrom()` también requiere verificación

#### `test_CannotTransferFrom_WhenSenderNotVerified()`
- **Propósito:** Verifica bloqueo en transferFrom
- **Qué prueba:** Que el remitente debe estar verificado en `transferFrom()`

#### `test_Mint_RequiresVerification()`
- **Propósito:** Verifica verificación en mint
- **Qué prueba:** 
  - Que mint requiere que el destinatario esté verificado
  - Que falla si no está verificado
- **Importancia:** Implementado recientemente - asegura compliance desde el inicio

#### `test_SetIdentityRegistry()`
- **Propósito:** Verifica actualización de registry
- **Qué prueba:** Que `COMPLIANCE_ROLE` puede cambiar el registry

#### `test_RevertWhen_SetIdentityRegistry_NotAdmin()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo `COMPLIANCE_ROLE` puede cambiar registries

---

### 4.2 Token + Compliance Integration (13 tests)

**Archivo:** `test/TokenComplianceIntegration.t.sol`

#### `test_AddComplianceModule()`
- **Propósito:** Verifica agregado de módulos
- **Qué prueba:** 
  - Que se puede agregar un módulo de compliance
  - Que se emite el evento `ComplianceModuleAdded`
  - Que el módulo queda activo

#### `test_RemoveComplianceModule()`
- **Propósito:** Verifica remoción de módulos
- **Qué prueba:** 
  - Que se puede remover un módulo
  - Que se emite el evento `ComplianceModuleRemoved`
  - Que el módulo queda inactivo

#### `test_RevertWhen_AddComplianceModule_NotAdmin()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo `COMPLIANCE_ROLE` puede agregar módulos

#### `test_RevertWhen_RemoveComplianceModule_NotAdmin()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo `COMPLIANCE_ROLE` puede remover módulos

#### `test_CanTransfer_WhenMaxBalanceCompliancePasses()`
- **Propósito:** Verifica integración con MaxBalance
- **Qué prueba:** Que transferencias dentro del límite son permitidas

#### `test_CannotTransfer_WhenMaxBalanceComplianceFails()`
- **Propósito:** Verifica rechazo de MaxBalance
- **Qué prueba:** Que transferencias que exceden el límite son rechazadas

#### `test_CanTransfer_WhenMaxHoldersCompliancePasses()`
- **Propósito:** Verifica integración con MaxHolders
- **Qué prueba:** Que transferencias cuando hay espacio son permitidas

#### `test_CannotTransfer_WhenMaxHoldersComplianceFails()`
- **Propósito:** Verifica rechazo de MaxHolders
- **Qué prueba:** Que transferencias cuando se excede el límite son rechazadas

#### `test_CanTransfer_WhenTransferLockCompliancePasses()`
- **Propósito:** Verifica integración con TransferLock
- **Qué prueba:** Que transferencias después del lock son permitidas

#### `test_CannotTransfer_WhenTransferLockComplianceFails()`
- **Propósito:** Verifica rechazo de TransferLock
- **Qué prueba:** Que transferencias durante el lock son rechazadas

#### `test_CanTransfer_ValidatesAllModules()`
- **Propósito:** Verifica validación múltiple
- **Qué prueba:** Que TODOS los módulos deben pasar para permitir transferencia

#### `test_CannotTransfer_WhenOneModuleFails()`
- **Propósito:** Verifica lógica AND
- **Qué prueba:** Que si UN módulo falla, toda la transferencia falla
- **Importancia:** Seguridad - requiere cumplimiento de todas las reglas

#### `test_MultipleComplianceModules_WorkingTogether()`
- **Propósito:** Verifica integración completa
- **Qué prueba:** Que múltiples módulos trabajan juntos correctamente
- **Importancia:** Verifica el sistema completo

---

## 5. Factory & Clones Tests

### 5.1 TokenCloneable (7 tests)

**Archivo:** `test/TokenCloneable.t.sol`

#### `test_Initialize()`
- **Propósito:** Verifica inicialización del clone
- **Qué prueba:** 
  - Que se puede inicializar con parámetros
  - Que los valores se asignan correctamente
  - Que los roles se otorgan

#### `test_CannotInitializeTwice()`
- **Propósito:** Verifica protección contra re-inicialización
- **Qué prueba:** Que no se puede inicializar dos veces
- **Importancia:** Seguridad - previene reset de estado

#### `test_Constructor_DisablesInitializers()`
- **Propósito:** Verifica protección en implementación
- **Qué prueba:** Que el constructor de la implementación deshabilita initializers
- **Importancia:** Previene inicialización accidental de la implementación

#### `test_Mint_AfterInitialize()`
- **Propósito:** Verifica funcionalidad básica
- **Qué prueba:** Que se puede mintear después de inicializar

#### `test_Transfer_AfterInitialize()`
- **Propósito:** Verifica funcionalidad de transferencia
- **Qué prueba:** Que se pueden transferir tokens

#### `test_MultipleClones_IndependentState()`
- **Propósito:** Verifica independencia de clones
- **Qué prueba:** 
  - Que múltiples clones tienen estado independiente
  - Que mintear en uno no afecta al otro
- **Importancia:** Asegura que EIP-1167 funciona correctamente

#### `test_AllFeatures_WorkInClone()`
- **Propósito:** Verifica funcionalidad completa
- **Qué prueba:** Que todas las características (mint, transfer, compliance, etc.) funcionan en clones

---

### 5.2 TokenCloneFactory (12 tests)

**Archivo:** `test/TokenCloneFactory.t.sol`

#### `test_Constructor()`
- **Propósito:** Verifica inicialización del factory
- **Qué prueba:** 
  - Que se despliega la implementación
  - Que el owner se asigna correctamente

#### `test_CreateToken()`
- **Propósito:** Verifica creación de tokens
- **Qué prueba:** 
  - Que se puede crear un token clone
  - Que se inicializa correctamente
  - Que se agrega a la lista de tokens

#### `test_CreateToken_EmitsEvent()`
- **Propósito:** Verifica emisión de eventos
- **Qué prueba:** Que se emite el evento `TokenCreated` con datos correctos

#### `test_CreateMultipleTokens()`
- **Propósito:** Verifica creación múltiple
- **Qué prueba:** Que se pueden crear múltiples tokens

#### `test_GasSavings()`
- **Propósito:** Verifica ahorro de gas
- **Qué prueba:** Que crear un clone usa significativamente menos gas que deployment directo
- **Importancia:** Justifica el uso de EIP-1167

#### `test_Tokens_IndependentState()`
- **Propósito:** Verifica independencia
- **Qué prueba:** 
  - Que tokens creados tienen estado independiente
  - Que mintear en uno no afecta al otro

#### `test_AllTokens_UseSameImplementation()`
- **Propósito:** Verifica eficiencia
- **Qué prueba:** Que todos los clones usan la misma implementación
- **Importancia:** Confirma el patrón EIP-1167

#### `test_GetTotalTokens()`
- **Propósito:** Verifica contador
- **Qué prueba:** Que retorna el número correcto de tokens creados

#### `test_GetToken()`
- **Propósito:** Verifica acceso por índice
- **Qué prueba:** Que retorna la dirección correcta del token

#### `test_RevertWhen_GetToken_InvalidIndex()`
- **Propósito:** Validación de índice
- **Qué prueba:** Que rechaza índices fuera de rango

#### `test_GetAllTokens()`
- **Propósito:** Verifica recuperación completa
- **Qué prueba:** Que retorna el array completo de tokens

#### `test_IsToken()`
- **Propósito:** Verifica función de verificación
- **Qué prueba:** Que retorna `true` si es un token creado, `false` si no

---

## 6. Tests de Integración Completa

### 6.1 Complete Integration (7 tests)

**Archivo:** `test/CompleteIntegration.t.sol`

#### `test_CompleteFlow()`
- **Propósito:** Prueba el flujo completo end-to-end
- **Qué prueba:** 
  1. Setup de identidades y compliance
  2. Mint de tokens
  3. Transferencias entre usuarios verificados
  4. Validación de compliance modules
  5. Verificación de balances finales
- **Importancia:** Verifica que todo el sistema trabaja junto

#### `test_CompleteFlow_MultipleUsers()`
- **Propósito:** Prueba con múltiples usuarios
- **Qué prueba:** 
  - Setup de 3 usuarios
  - Múltiples transferencias
  - Verificación de compliance en cada paso
- **Importancia:** Verifica escalabilidad

#### `test_Compliance_RejectsExceedingLimit()`
- **Propósito:** Verifica rechazo de compliance
- **Qué prueba:** 
  - Llenar el límite de holders
  - Intentar transferir a un nuevo holder (debe fallar)
- **Importancia:** Verifica que los límites se respetan

#### `test_TransferLock_WorksCorrectly()`
- **Propósito:** Verifica TransferLock en flujo completo
- **Qué prueba:** 
  - Mint bloquea al usuario
  - Transferencia falla durante el lock
  - Transferencia funciona después del lock
- **Importancia:** Verifica time-based compliance

#### `test_Factory_CreatesTokens()`
- **Propósito:** Verifica factory en flujo completo
- **Qué prueba:** 
  - Crear tokens usando el factory
  - Verificar que funcionan correctamente
- **Importancia:** Verifica deployment eficiente

#### `test_Pause_WorksInCompleteFlow()`
- **Propósito:** Verifica pause en flujo completo
- **Qué prueba:** 
  - Pausar el token
  - Verificar que transferencias fallan
  - Despausar y verificar que funciona
- **Importancia:** Verifica mecanismo de emergencia

#### `test_Freeze_WorksInCompleteFlow()`
- **Propósito:** Verifica freeze en flujo completo
- **Qué prueba:** 
  - Congelar una cuenta
  - Verificar que transferencias fallan
  - Descongelar y verificar que funciona
- **Importancia:** Verifica control granular

---

### 6.2 ComplianceAggregator (14 tests)

**Archivo:** `test/ComplianceAggregator.t.sol`

#### `test_AddModule()`
- **Propósito:** Verifica agregado de módulos
- **Qué prueba:** 
  - Que se puede agregar un módulo para un token
  - Que se emite el evento `ModuleAdded`

#### `test_AddMultipleModules()`
- **Propósito:** Verifica múltiples módulos
- **Qué prueba:** Que se pueden agregar varios módulos para el mismo token

#### `test_RemoveModule()`
- **Propósito:** Verifica remoción de módulos
- **Qué prueba:** 
  - Que se puede remover un módulo
  - Que se emite el evento `ModuleRemoved`

#### `test_RevertWhen_AddDuplicateModule()`
- **Propósito:** Previene duplicados
- **Qué prueba:** Que no se puede agregar el mismo módulo dos veces

#### `test_RevertWhen_NotOwner_AddModule()`
- **Propósito:** Control de acceso
- **Qué prueba:** Que solo el owner puede agregar módulos

#### `test_RevertWhen_RemoveNonExistentModule()`
- **Propósito:** Validación
- **Qué prueba:** Que no se puede remover un módulo que no existe

#### `test_CanTransfer_AllowsWhenNoModules()`
- **Propósito:** Verifica comportamiento por defecto
- **Qué prueba:** Que si no hay módulos, permite todas las transferencias

#### `test_CanTransfer_AllowsWhenAllModulesPass()`
- **Propósito:** Verifica validación múltiple
- **Qué prueba:** Que si todos los módulos pasan, permite la transferencia

#### `test_CanTransfer_RejectsWhenOneModuleFails()`
- **Propósito:** Verifica lógica AND
- **Qué prueba:** Que si un módulo falla, rechaza la transferencia

#### `test_CanTransfer_IComplianceInterface()`
- **Propósito:** Verifica implementación de interfaz
- **Qué prueba:** Que funciona como módulo ICompliance

#### `test_Transferred_NotifiesAllModules()`
- **Propósito:** Verifica notificaciones
- **Qué prueba:** Que notifica a todos los módulos después de transferencia

#### `test_Created_NotifiesAllModules()`
- **Propósito:** Verifica notificaciones de mint
- **Qué prueba:** Que notifica a todos los módulos después de mint

#### `test_Destroyed_NotifiesAllModules()`
- **Propósito:** Verifica notificaciones de burn
- **Qué prueba:** Que notifica a todos los módulos después de burn

#### `test_GetModulesForToken()`
- **Propósito:** Verifica recuperación de módulos
- **Qué prueba:** Que retorna el array correcto de módulos para un token

---

## Resumen de Cobertura

### Por Categoría:

- **Identity System:** 47 tests
- **Compliance Modules:** 42 tests
- **Token Core:** 29 tests
- **Integraciones:** 26 tests
- **Factory & Clones:** 19 tests
- **Integración Completa:** 21 tests

### Por Tipo de Test:

- **Funcionalidad Básica:** ~80 tests
- **Control de Acceso:** ~25 tests
- **Validaciones:** ~30 tests
- **Casos Límite:** ~20 tests
- **Integración:** ~27 tests
- **Reversión (Revert):** ~20 tests

### Cobertura de Funcionalidades:

✅ **100% de funcionalidades principales cubiertas:**
- Identity System completo
- Compliance Modules (3 módulos)
- Token ERC-20 básico
- Funcionalidades avanzadas (pause, freeze, forced transfer)
- Factory y clones
- Integraciones completas

---

## Conclusión

Los 202 tests proporcionan una cobertura completa del sistema RWA Token Platform, verificando:

1. **Funcionalidad:** Todas las características principales funcionan correctamente
2. **Seguridad:** Control de acceso y validaciones están implementados
3. **Integración:** Todos los componentes trabajan juntos correctamente
4. **Casos Límite:** Se manejan correctamente casos extremos
5. **Compliance:** Los módulos de compliance funcionan como se espera

**Estado:** ✅ **Listo para producción** (después de auditoría externa)

