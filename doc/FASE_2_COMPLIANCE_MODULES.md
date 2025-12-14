# Fase 2: Compliance Modules - División Detallada

## 📋 Índice

1. [Visión General](#visión-general)
2. [Estructura de la Fase 2](#estructura-de-la-fase-2)
3. [Paso 2.1: ICompliance Interface](#paso-21-icompliance-interface)
4. [Paso 2.2: MaxBalanceCompliance](#paso-22-maxbalancecompliance)
5. [Paso 2.3: MaxHoldersCompliance](#paso-23-maxholderscompliance)
6. [Paso 2.4: TransferLockCompliance](#paso-24-transferlockcompliance)
7. [Resumen y Checkpoints](#resumen-y-checkpoints)

---

## Visión General

### ¿Qué son los Compliance Modules?

Los **Compliance Modules** son contratos modulares que validan las transferencias de tokens según reglas específicas. Cada módulo implementa la interfaz `ICompliance` y puede ser agregado o removido del Token de forma independiente.

### Objetivo de la Fase 2

Implementar un sistema modular de compliance que permita:
- ✅ Validar transferencias antes de ejecutarlas
- ✅ Notificar a los módulos después de transferencias
- ✅ Múltiples módulos trabajando en conjunto
- ✅ Módulos intercambiables y actualizables

### Arquitectura Modular

```
┌─────────────────────────────────────────────────────────┐
│                    TOKEN (ERC-3643)                     │
│                                                          │
│  complianceModules: ICompliance[]                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ MaxBalance   │  │ MaxHolders   │  │TransferLock  │ │
│  │ Compliance   │  │ Compliance   │  │ Compliance   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  • canTransfer() - Valida ANTES de transferir          │
│  • transferred() - Notifica DESPUÉS de transferir      │
│  • created() - Notifica cuando se mintean tokens       │
│  • destroyed() - Notifica cuando se queman tokens      │
└─────────────────────────────────────────────────────────┘
```

---

## Estructura de la Fase 2

### Orden de Desarrollo

La Fase 2 se divide en **4 pasos**, ordenados de menor a mayor complejidad:

```
┌─────────────────────────────────────────────────────────┐
│  PASO 2.1: ICompliance Interface                        │
│  └─ Definir el contrato que todos los módulos deben     │
│     implementar                                         │
│                                                          │
│  PASO 2.2: MaxBalanceCompliance                        │
│  └─ Módulo más simple: solo valida balance máximo       │
│     (sin estado interno complejo)                        │
│                                                          │
│  PASO 2.3: MaxHoldersCompliance                        │
│  └─ Módulo con estado: rastrea número de holders       │
│     (requiere gestión de estado)                        │
│                                                          │
│  PASO 2.4: TransferLockCompliance                      │
│  └─ Módulo más complejo: bloquea transferencias por    │
│     tiempo (requiere gestión de tiempo y estado)        │
└─────────────────────────────────────────────────────────┘
```

### Progresión de Complejidad

| Paso | Módulo | Complejidad | Estado | Tiempo |
|------|--------|-------------|--------|--------|
| 2.1 | ICompliance | Baja | - | - |
| 2.2 | MaxBalanceCompliance | Baja | No | No |
| 2.3 | MaxHoldersCompliance | Media | Sí | No |
| 2.4 | TransferLockCompliance | Alta | Sí | Sí |

---

## Paso 2.1: ICompliance Interface

### Objetivo

Definir el contrato que todos los módulos de compliance deben implementar.

### ¿Por qué primero?

- Es la base de todos los módulos
- Define el contrato que deben cumplir
- Permite testear la interfaz antes de implementar módulos

### Funciones de la Interface

```solidity
interface ICompliance {
    /**
     * @dev Verificar si una transferencia es permitida ANTES de ejecutarla
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad a transferir
     * @return true si la transferencia es permitida
     */
    function canTransfer(address from, address to, uint256 amount) 
        external view returns (bool);

    /**
     * @dev Notificar DESPUÉS de que ocurrió una transferencia
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad transferida
     */
    function transferred(address from, address to, uint256 amount) external;

    /**
     * @dev Notificar cuando se mintean tokens (mint)
     * @param to Dirección que recibe los tokens
     * @param amount Cantidad minteada
     */
    function created(address to, uint256 amount) external;

    /**
     * @dev Notificar cuando se queman tokens (burn)
     * @param from Dirección de la que se queman tokens
     * @param amount Cantidad quemada
     */
    function destroyed(address from, uint256 amount) external;
}
```

### Tests a Implementar

```solidity
// test/ICompliance.t.sol
contract MockCompliance is ICompliance {
    function canTransfer(address, address, uint256) external pure returns (bool) {
        return true;
    }
    function transferred(address, address, uint256) external {}
    function created(address, uint256) external {}
    function destroyed(address, uint256) external {}
}

function test_InterfaceCompliance() public {
    MockCompliance compliance = new MockCompliance();
    assertTrue(compliance.canTransfer(address(0), address(0), 0));
}
```

### Checkpoint 2.1

- ✅ Interface `ICompliance` definida
- ✅ Test de interface pasando
- ✅ Mock implementation funcionando

---

## Paso 2.2: MaxBalanceCompliance

### Objetivo

Limitar el balance máximo que puede tener cualquier wallet.

### Características

- **Complejidad:** Baja
- **Estado:** Mínimo (solo `maxBalance` y `tokenContract`)
- **Tiempo:** No requiere
- **Lógica:** Simple validación matemática

### Funcionalidad

```solidity
// Valida: balanceActual + cantidad <= maxBalance
function canTransfer(address from, address to, uint256 amount) 
    external view override returns (bool) {
    uint256 balance = ERC20(tokenContract).balanceOf(to);
    return (balance + amount) <= maxBalance;
}
```

### Casos de Uso

1. **Transferencia permitida:**
   - user2 tiene 500 tokens
   - maxBalance = 1000 tokens
   - Transferencia de 400 tokens → ✅ Permitida (500 + 400 = 900 ≤ 1000)

2. **Transferencia rechazada:**
   - user2 tiene 500 tokens
   - maxBalance = 1000 tokens
   - Transferencia de 600 tokens → ❌ Rechazada (500 + 600 = 1100 > 1000)

### Tests a Implementar

```solidity
// test/MaxBalanceCompliance.t.sol

function test_CanTransfer_WhenUnderMaxBalance() public {
    // Setup: user2 tiene 500 tokens, maxBalance = 1000
    token.setBalance(user2, 500 * 10**18);
    compliance.setMaxBalance(1000 * 10**18);
    
    // Transferencia de 400 tokens debe ser permitida
    bool canTransfer = compliance.canTransfer(user1, user2, 400 * 10**18);
    assertTrue(canTransfer);
}

function test_CannotTransfer_WhenExceedsMaxBalance() public {
    // Setup: user2 tiene 500 tokens, maxBalance = 1000
    token.setBalance(user2, 500 * 10**18);
    compliance.setMaxBalance(1000 * 10**18);
    
    // Transferencia de 600 tokens debe ser rechazada
    bool canTransfer = compliance.canTransfer(user1, user2, 600 * 10**18);
    assertFalse(canTransfer);
}

function test_CanTransfer_WhenExactlyMaxBalance() public {
    // Setup: user2 tiene 500 tokens, maxBalance = 1000
    token.setBalance(user2, 500 * 10**18);
    compliance.setMaxBalance(1000 * 10**18);
    
    // Transferencia de exactamente 500 tokens debe ser permitida
    bool canTransfer = compliance.canTransfer(user1, user2, 500 * 10**18);
    assertTrue(canTransfer);
}

function test_Transferred_UpdatesState() public {
    // Verificar que transferred() se llama correctamente
    compliance.transferred(user1, user2, 100 * 10**18);
    // No hay estado que actualizar en este módulo
}
```

### Estructura del Contrato

```solidity
// src/compliance/MaxBalanceCompliance.sol
contract MaxBalanceCompliance is ICompliance, Ownable {
    uint256 public maxBalance;
    address public tokenContract;
    
    event MaxBalanceUpdated(uint256 oldMaxBalance, uint256 newMaxBalance);
    event TokenContractUpdated(address oldTokenContract, address newTokenContract);
    
    constructor(address initialOwner, uint256 _maxBalance, address _tokenContract) 
        Ownable(initialOwner) {
        maxBalance = _maxBalance;
        tokenContract = _tokenContract;
    }
    
    function setMaxBalance(uint256 _maxBalance) external onlyOwner {
        uint256 oldMaxBalance = maxBalance;
        maxBalance = _maxBalance;
        emit MaxBalanceUpdated(oldMaxBalance, _maxBalance);
    }
    
    function setTokenContract(address _tokenContract) external onlyOwner {
        address oldTokenContract = tokenContract;
        tokenContract = _tokenContract;
        emit TokenContractUpdated(oldTokenContract, _tokenContract);
    }
    
    function canTransfer(address, address to, uint256 amount) 
        external view override returns (bool) {
        uint256 balance = ERC20(tokenContract).balanceOf(to);
        return (balance + amount) <= maxBalance;
    }
    
    function transferred(address, address, uint256) external override {
        // No hay estado que actualizar
    }
    
    function created(address, uint256) external override {
        // No hay estado que actualizar
    }
    
    function destroyed(address, uint256) external override {
        // No hay estado que actualizar
    }
}
```

### Checkpoint 2.2

- ✅ `MaxBalanceCompliance` implementado
- ✅ Tests pasando (casos positivos y negativos)
- ✅ Funciones `canTransfer`, `transferred`, `created`, `destroyed` funcionando
- ✅ Coverage >80%

---

## Paso 2.3: MaxHoldersCompliance

### Objetivo

Limitar el número máximo de holders (direcciones con balance > 0) que puede tener el token.

### Características

- **Complejidad:** Media
- **Estado:** Sí (rastrea holders)
- **Tiempo:** No requiere
- **Lógica:** Gestión de conjunto de holders

### Funcionalidad

```solidity
// Rastrea cuántos holders únicos hay
// Valida: númeroDeHoldersActual + (¿esNuevoHolder?) <= maxHolders

mapping(address => bool) private holders;  // Rastrea si es holder
uint256 private holdersCount;               // Contador de holders

function canTransfer(address from, address to, uint256 amount) 
    external view override returns (bool) {
    // Si 'to' ya es holder, no aumenta el contador
    if (holders[to]) {
        return true;
    }
    
    // Si 'to' no es holder y ya alcanzamos el límite, rechazar
    if (holdersCount >= maxHolders) {
        return false;
    }
    
    return true;
}

function transferred(address from, address to, uint256 amount) external override {
    // Actualizar estado después de la transferencia
    updateHolders(from, to, amount);
}
```

### Casos de Uso

1. **Transferencia a holder existente:**
   - user2 ya es holder
   - maxHolders = 100
   - holdersCount = 50
   - Transferencia → ✅ Permitida (no aumenta contador)

2. **Transferencia a nuevo holder (bajo límite):**
   - user2 NO es holder
   - maxHolders = 100
   - holdersCount = 50
   - Transferencia → ✅ Permitida (50 + 1 = 51 ≤ 100)

3. **Transferencia a nuevo holder (en límite):**
   - user2 NO es holder
   - maxHolders = 100
   - holdersCount = 100
   - Transferencia → ❌ Rechazada (100 + 1 = 101 > 100)

4. **Holder deja de serlo (balance = 0):**
   - user1 tiene 100 tokens
   - user1 transfiere todos sus tokens
   - user1 deja de ser holder
   - holdersCount disminuye

### Tests a Implementar

```solidity
// test/MaxHoldersCompliance.t.sol

function test_CanTransfer_ToExistingHolder() public {
    // Setup: user2 ya es holder
    compliance.transferred(address(0), user2, 100);
    
    // Transferencia a holder existente debe ser permitida
    bool canTransfer = compliance.canTransfer(user1, user2, 50);
    assertTrue(canTransfer);
}

function test_CannotExceedMaxHolders() public {
    // Setup: maxHolders = 10
    compliance.setMaxHolders(10);
    
    // Agregar 10 holders
    for (uint i = 0; i < 10; i++) {
        address holder = makeAddr(string(abi.encodePacked("holder", i)));
        compliance.transferred(address(0), holder, 1);
    }
    
    // Intentar agregar uno más debe fallar
    address newHolder = makeAddr("newHolder");
    bool canTransfer = compliance.canTransfer(address(0), newHolder, 1);
    assertFalse(canTransfer);
}

function test_CanTransfer_WhenUnderMaxHolders() public {
    // Setup: maxHolders = 10, holdersCount = 5
    compliance.setMaxHolders(10);
    for (uint i = 0; i < 5; i++) {
        compliance.transferred(address(0), makeAddr(string(abi.encodePacked("holder", i))), 1);
    }
    
    // Transferencia a nuevo holder debe ser permitida
    address newHolder = makeAddr("newHolder");
    bool canTransfer = compliance.canTransfer(address(0), newHolder, 1);
    assertTrue(canTransfer);
}

function test_Transferred_AddsNewHolder() public {
    // Verificar que transferred() agrega nuevo holder
    compliance.transferred(address(0), user1, 100);
    assertTrue(compliance.isHolder(user1));
    assertEq(compliance.getHoldersCount(), 1);
}

function test_Transferred_RemovesHolder_WhenBalanceZero() public {
    // Setup: user1 tiene 100 tokens
    compliance.transferred(address(0), user1, 100);
    assertTrue(compliance.isHolder(user1));
    
    // user1 transfiere todos sus tokens
    compliance.transferred(user1, user2, 100);
    
    // user1 ya no es holder
    assertFalse(compliance.isHolder(user1));
    assertEq(compliance.getHoldersCount(), 1); // Solo user2
}
```

### Estructura del Contrato

```solidity
// src/compliance/MaxHoldersCompliance.sol
contract MaxHoldersCompliance is ICompliance, Ownable {
    uint256 public maxHolders;
    mapping(address => bool) private holders;
    uint256 private holdersCount;
    
    event MaxHoldersUpdated(uint256 oldMaxHolders, uint256 newMaxHolders);
    event HolderAdded(address indexed holder);
    event HolderRemoved(address indexed holder);
    
    constructor(address initialOwner, uint256 _maxHolders) Ownable(initialOwner) {
        maxHolders = _maxHolders;
    }
    
    function setMaxHolders(uint256 _maxHolders) external onlyOwner {
        uint256 oldMaxHolders = maxHolders;
        maxHolders = _maxHolders;
        emit MaxHoldersUpdated(oldMaxHolders, _maxHolders);
    }
    
    function canTransfer(address from, address to, uint256 amount) 
        external view override returns (bool) {
        // Si 'to' ya es holder, no aumenta el contador
        if (holders[to]) {
            return true;
        }
        
        // Si 'to' no es holder y ya alcanzamos el límite, rechazar
        if (holdersCount >= maxHolders) {
            return false;
        }
        
        return true;
    }
    
    function transferred(address from, address to, uint256 amount) external override {
        // Actualizar holders después de la transferencia
        // Esto requiere acceso al balance del token
        // Se implementará con referencia al token contract
    }
    
    // ... otras funciones
}
```

### Desafío Técnico

**Problema:** `transferred()` necesita saber si un holder dejó de serlo (balance = 0), pero no tiene acceso directo al balance.

**Solución:** 
- Opción 1: Pasar el balance como parámetro (no ideal)
- Opción 2: Tener referencia al token contract y verificar balance
- Opción 3: El Token llama a `transferred()` con información adicional

**Implementación recomendada:** Opción 2 - tener referencia al token contract.

### Checkpoint 2.3

- ✅ `MaxHoldersCompliance` implementado
- ✅ Tests pasando (casos positivos, negativos, edge cases)
- ✅ Gestión de estado de holders funcionando
- ✅ Coverage >80%

---

## Paso 2.4: TransferLockCompliance

### Objetivo

Bloquear transferencias de tokens durante un período de tiempo después de recibirlos.

### Características

- **Complejidad:** Alta
- **Estado:** Sí (rastrea timestamps de recepción)
- **Tiempo:** Sí (requiere `block.timestamp`)
- **Lógica:** Gestión de tiempo y estado por wallet

### Funcionalidad

```solidity
// Bloquea transferencias por lockPeriod días después de recibir tokens
// Valida: block.timestamp >= timestampRecepción + lockPeriod

mapping(address => uint256) private lockUntil;  // Timestamp hasta cuando está bloqueado
uint256 public lockPeriod;                      // Período de bloqueo en segundos

function canTransfer(address from, address to, uint256 amount) 
    external view override returns (bool) {
    // Verificar si 'from' está bloqueado
    if (block.timestamp < lockUntil[from]) {
        return false;  // Aún está en período de bloqueo
    }
    
    return true;
}

function transferred(address from, address to, uint256 amount) external override {
    // Si 'to' recibe tokens, actualizar su lockUntil
    if (to != address(0)) {
        lockUntil[to] = block.timestamp + lockPeriod;
    }
}
```

### Casos de Uso

1. **Transferencia bloqueada (dentro del período):**
   - user1 recibió tokens hace 1 día
   - lockPeriod = 30 días
   - Intento de transferencia → ❌ Bloqueada (1 < 30)

2. **Transferencia permitida (después del período):**
   - user1 recibió tokens hace 31 días
   - lockPeriod = 30 días
   - Intento de transferencia → ✅ Permitida (31 ≥ 30)

3. **Recepción de tokens:**
   - user2 recibe tokens
   - Se actualiza `lockUntil[user2] = block.timestamp + 30 días`
   - user2 no puede transferir por 30 días

### Tests a Implementar

```solidity
// test/TransferLockCompliance.t.sol

function test_CannotTransferDuringLockPeriod() public {
    // Setup: lockPeriod = 30 días
    compliance.setLockPeriod(30 days);
    
    // user1 recibe tokens
    compliance.transferred(address(0), user1, 100);
    
    // Intentar transferir inmediatamente (debe fallar)
    vm.warp(block.timestamp + 1 days);
    bool canTransfer = compliance.canTransfer(user1, user2, 50);
    assertFalse(canTransfer);
}

function test_CanTransfer_AfterLockPeriod() public {
    // Setup: lockPeriod = 30 días
    compliance.setLockPeriod(30 days);
    
    // user1 recibe tokens
    compliance.transferred(address(0), user1, 100);
    
    // Después del lock period (debe pasar)
    vm.warp(block.timestamp + 31 days);
    bool canTransfer = compliance.canTransfer(user1, user2, 50);
    assertTrue(canTransfer);
}

function test_CanTransfer_ExactlyAtLockPeriod() public {
    // Setup: lockPeriod = 30 días
    compliance.setLockPeriod(30 days);
    
    // user1 recibe tokens
    compliance.transferred(address(0), user1, 100);
    
    // Exactamente en el lock period (debe pasar)
    vm.warp(block.timestamp + 30 days);
    bool canTransfer = compliance.canTransfer(user1, user2, 50);
    assertTrue(canTransfer);
}

function test_Transferred_UpdatesLockUntil() public {
    // Setup: lockPeriod = 30 días
    compliance.setLockPeriod(30 days);
    
    // user1 recibe tokens
    uint256 timestampBefore = block.timestamp;
    compliance.transferred(address(0), user1, 100);
    
    // Verificar que lockUntil se actualizó
    assertEq(compliance.getLockUntil(user1), timestampBefore + 30 days);
}

function test_MultipleTransfers_ExtendLockPeriod() public {
    // Setup: lockPeriod = 30 días
    compliance.setLockPeriod(30 days);
    
    // user1 recibe tokens en día 0
    compliance.transferred(address(0), user1, 100);
    uint256 firstLockUntil = compliance.getLockUntil(user1);
    
    // user1 recibe más tokens en día 10
    vm.warp(block.timestamp + 10 days);
    compliance.transferred(address(0), user1, 50);
    uint256 secondLockUntil = compliance.getLockUntil(user1);
    
    // El lock period se extiende
    assertGt(secondLockUntil, firstLockUntil);
}
```

### Estructura del Contrato

```solidity
// src/compliance/TransferLockCompliance.sol
contract TransferLockCompliance is ICompliance, Ownable {
    uint256 public lockPeriod;  // Período de bloqueo en segundos
    mapping(address => uint256) private lockUntil;  // Timestamp hasta cuando está bloqueado
    
    event LockPeriodUpdated(uint256 oldLockPeriod, uint256 newLockPeriod);
    event LockUpdated(address indexed account, uint256 lockUntil);
    
    constructor(address initialOwner, uint256 _lockPeriod) Ownable(initialOwner) {
        lockPeriod = _lockPeriod;
    }
    
    function setLockPeriod(uint256 _lockPeriod) external onlyOwner {
        uint256 oldLockPeriod = lockPeriod;
        lockPeriod = _lockPeriod;
        emit LockPeriodUpdated(oldLockPeriod, _lockPeriod);
    }
    
    function canTransfer(address from, address to, uint256 amount) 
        external view override returns (bool) {
        // Verificar si 'from' está bloqueado
        if (block.timestamp < lockUntil[from]) {
            return false;
        }
        
        return true;
    }
    
    function transferred(address from, address to, uint256 amount) external override {
        // Si 'to' recibe tokens, actualizar su lockUntil
        if (to != address(0)) {
            lockUntil[to] = block.timestamp + lockPeriod;
            emit LockUpdated(to, lockUntil[to]);
        }
    }
    
    function created(address to, uint256 amount) external override {
        // Mint también bloquea
        if (to != address(0)) {
            lockUntil[to] = block.timestamp + lockPeriod;
            emit LockUpdated(to, lockUntil[to]);
        }
    }
    
    function destroyed(address from, uint256 amount) external override {
        // Burn no afecta el lock
    }
    
    function getLockUntil(address account) external view returns (uint256) {
        return lockUntil[account];
    }
    
    function isLocked(address account) external view returns (bool) {
        return block.timestamp < lockUntil[account];
    }
}
```

### Desafíos Técnicos

1. **Gestión de tiempo:**
   - Usar `block.timestamp` para obtener tiempo actual
   - En tests, usar `vm.warp()` para avanzar el tiempo

2. **Extensión del lock period:**
   - Si un usuario recibe tokens múltiples veces, ¿se extiende el lock?
   - Decisión: Sí, cada recepción resetea el lock period

3. **Mint vs Transfer:**
   - ¿El mint también bloquea?
   - Decisión: Sí, `created()` también actualiza `lockUntil`

### Checkpoint 2.4

- ✅ `TransferLockCompliance` implementado
- ✅ Tests pasando (casos con tiempo, edge cases)
- ✅ Gestión de tiempo y estado funcionando
- ✅ Coverage >80%

---

## Resumen y Checkpoints

### Checklist Completo de Fase 2

```
[ ] Paso 2.1: ICompliance Interface
    [ ] Interface definida
    [ ] Test de interface pasando
    [ ] Mock implementation funcionando

[ ] Paso 2.2: MaxBalanceCompliance
    [ ] Contrato implementado
    [ ] Tests pasando (casos positivos y negativos)
    [ ] Funciones canTransfer, transferred, created, destroyed funcionando
    [ ] Coverage >80%

[ ] Paso 2.3: MaxHoldersCompliance
    [ ] Contrato implementado
    [ ] Tests pasando (gestión de estado)
    [ ] Rastreo de holders funcionando
    [ ] Coverage >80%

[ ] Paso 2.4: TransferLockCompliance
    [ ] Contrato implementado
    [ ] Tests pasando (casos con tiempo)
    [ ] Gestión de tiempo y estado funcionando
    [ ] Coverage >80%

[ ] Tests de Integración
    [ ] Múltiples módulos trabajando juntos
    [ ] Todos los tests pasando
    [ ] Coverage total >80%
```

### Progresión de Complejidad

```
Complejidad
    ▲
    │
Alta│                    [2.4] TransferLockCompliance
    │                    (Estado + Tiempo)
    │
Media│        [2.3] MaxHoldersCompliance
    │        (Estado)
    │
Baja│ [2.1] Interface  [2.2] MaxBalance
    │                   (Sin estado)
    │
    └───────────────────────────────────>
        Interface  Balance  Holders  Lock
```

### Próximos Pasos

Una vez completada la Fase 2:

- ✅ **Fase 3:** Token Principal
  - Integrar Identity System
  - Integrar Compliance Modules
  - Funcionalidades avanzadas

---

**✅ Checkpoint Fase 2:** Todos los módulos de compliance implementados, testeados y funcionando.

