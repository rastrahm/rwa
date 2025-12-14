# Guía de Desarrollo TDD - RWA Token Platform

## 📋 Índice

1. [Introducción a TDD](#introducción-a-tdd)
2. [Setup Inicial](#setup-inicial)
3. [Fase 1: Identity System](#fase-1-identity-system)
4. [Fase 2: Compliance Modules](#fase-2-compliance-modules)
5. [Fase 3: Token Principal](#fase-3-token-principal)
6. [Fase 4: Clone Factory](#fase-4-clone-factory)
7. [Fase 5: Compliance Aggregator](#fase-5-compliance-aggregator)
8. [Fase 6: Integración y Deployment](#fase-6-integración-y-deployment)
9. [Checkpoints y Validaciones](#checkpoints-y-validaciones)

---

## Introducción a TDD

### ¿Qué es TDD?

**Test-Driven Development (TDD)** es una metodología de desarrollo que sigue el ciclo **Red-Green-Refactor**:

```
┌─────────────────────────────────────────┐
│  1. 🔴 RED: Escribir test que falle     │
│     └─ Define qué quieres construir     │
│                                          │
│  2. 🟢 GREEN: Escribir código mínimo    │
│     └─ Hacer que el test pase          │
│                                          │
│  3. 🔵 REFACTOR: Mejorar el código      │
│     └─ Optimizar sin romper tests       │
│                                          │
│  4. 🔄 REPETIR                          │
└─────────────────────────────────────────┘
```

### Reglas de TDD

1. ✅ **Nunca escribas código sin un test que falle primero**
2. ✅ **Nunca escribas más código del necesario para pasar el test**
3. ✅ **Refactoriza solo cuando todos los tests pasan**
4. ✅ **Mantén todos los tests pasando en todo momento**

### Ventajas de TDD

- ✅ **Cobertura de tests garantizada** (>80%)
- ✅ **Diseño mejorado** (código testeable = código bien diseñado)
- ✅ **Documentación viva** (los tests documentan el comportamiento)
- ✅ **Refactoring seguro** (tests detectan regresiones)
- ✅ **Confianza** (sabes que todo funciona)

---

## Setup Inicial

### Paso 0.1: Configurar el Proyecto

```bash
# Crear estructura de directorios
mkdir -p sc/{src,test,script}
cd sc

# Inicializar Foundry
forge init --force

# Instalar dependencias
forge install OpenZeppelin/openzeppelin-contracts
forge install OpenZeppelin/openzeppelin-contracts-upgradeable

# Configurar foundry.toml
```

### Paso 0.2: Configurar foundry.toml

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
remappings = [
    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
    "@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/"
]
```

### Paso 0.3: Verificar Setup

```bash
# Compilar (debe pasar sin errores)
forge build

# Ejecutar tests (debe pasar, aunque estén vacíos)
forge test

# Verificar estructura
tree -L 2
```

**✅ Checkpoint 0:** Proyecto configurado y compilando correctamente

---

## Fase 1: Identity System

### Orden de Desarrollo

1. Identity Contract (básico)
2. IdentityRegistry
3. TrustedIssuersRegistry
4. ClaimTopicsRegistry
5. Integración del sistema completo

---

### Paso 1.1: Identity Contract - Estructura Básica

#### 🔴 RED: Test de Estructura

```solidity
// test/Identity.t.sol
contract IdentityTest is Test {
    Identity public identity;
    address public owner;
    
    function setUp() public {
        owner = address(this);
        identity = new Identity(owner);
    }
    
    function test_Constructor() public {
        assertEq(identity.owner(), owner);
    }
}
```

**Ejecutar:** `forge test --match-contract IdentityTest -vv`

**Resultado esperado:** ❌ Falla porque `Identity.sol` no existe

#### 🟢 GREEN: Implementación Mínima

```solidity
// src/Identity.sol
contract Identity is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}
}
```

**Ejecutar:** `forge test --match-contract IdentityTest -vv`

**Resultado esperado:** ✅ Pasa

#### 🔵 REFACTOR: (N/A en este paso)

---

### Paso 1.2: Identity Contract - Agregar Claims

#### 🔴 RED: Test de Claims

```solidity
function test_AddClaim() public {
    uint256 topic = 1;
    uint256 scheme = 1;
    address issuer = makeAddr("issuer");
    bytes memory signature = "0x1234";
    bytes memory data = "0x5678";
    string memory uri = "https://example.com";
    
    identity.addClaim(topic, scheme, issuer, signature, data, uri);
    
    (uint256 t, uint256 s, address i, bytes memory sig, bytes memory d, string memory u) = 
        identity.getClaim(topic, issuer);
    
    assertEq(t, topic);
    assertEq(i, issuer);
}
```

**Ejecutar:** `forge test --match-test test_AddClaim -vv`

**Resultado esperado:** ❌ Falla

#### 🟢 GREEN: Implementar addClaim y getClaim

```solidity
// src/Identity.sol
mapping(uint256 => mapping(address => Claim)) private claims;

struct Claim {
    uint256 topic;
    uint256 scheme;
    address issuer;
    bytes signature;
    bytes data;
    string uri;
}

function addClaim(...) external onlyOwner returns (bytes32) {
    claims[_topic][_issuer] = Claim({...});
    emit ClaimAdded(...);
    return claimId;
}

function getClaim(...) external view returns (...) {
    Claim memory claim = claims[_topic][_issuer];
    return (...);
}
```

**Ejecutar:** `forge test --match-test test_AddClaim -vv`

**Resultado esperado:** ✅ Pasa

#### 🔵 REFACTOR: Optimizar si es necesario

---

### Paso 1.3: IdentityRegistry - Registro Básico

#### 🔴 RED: Test de Registro

```solidity
// test/IdentityRegistry.t.sol
function test_RegisterIdentity() public {
    Identity identity = new Identity(user1);
    registry.registerIdentity(user1, address(identity));
    
    assertTrue(registry.isRegistered(user1));
    assertEq(registry.getIdentity(user1), address(identity));
}
```

#### 🟢 GREEN: Implementar IdentityRegistry

```solidity
// src/IdentityRegistry.sol
mapping(address => Identity) private identities;
mapping(address => bool) private registered;

function registerIdentity(address _wallet, address _identity) external onlyOwner {
    identities[_wallet] = Identity(_identity);
    registered[_wallet] = true;
    emit IdentityRegistered(_wallet, _identity);
}
```

**✅ Checkpoint 1.3:** IdentityRegistry básico funcionando

---

### Paso 1.4: TrustedIssuersRegistry

#### 🔴 RED: Test de Trusted Issuers

```solidity
function test_AddTrustedIssuer() public {
    uint256[] memory topics = new uint256[](2);
    topics[0] = 1; // KYC
    topics[1] = 2; // AML
    
    registry.addTrustedIssuer(issuer, topics);
    
    assertTrue(registry.isTrustedIssuer(issuer));
    assertTrue(registry.hasClaimTopic(issuer, 1));
}
```

#### 🟢 GREEN: Implementar TrustedIssuersRegistry

**✅ Checkpoint 1.4:** TrustedIssuersRegistry funcionando

---

### Paso 1.5: ClaimTopicsRegistry

#### 🔴 RED: Test de Claim Topics

```solidity
function test_AddClaimTopic() public {
    registry.addClaimTopic(1); // KYC required
    
    uint256[] memory topics = registry.getClaimTopics();
    assertEq(topics.length, 1);
    assertEq(topics[0], 1);
}
```

#### 🟢 GREEN: Implementar ClaimTopicsRegistry

**✅ Checkpoint 1.5:** ClaimTopicsRegistry funcionando

---

### Paso 1.6: Integración - Verificación Completa

#### 🔴 RED: Test de Integración

```solidity
function test_CompleteIdentityVerification() public {
    // 1. Crear identity
    Identity identity = new Identity(user1);
    
    // 2. Registrar identity
    identityRegistry.registerIdentity(user1, address(identity));
    
    // 3. Agregar trusted issuer
    uint256[] memory topics = new uint256[](1);
    topics[0] = 1;
    trustedIssuersRegistry.addTrustedIssuer(issuer, topics);
    
    // 4. Agregar claim topic requerido
    claimTopicsRegistry.addClaimTopic(1);
    
    // 5. Agregar claim al identity
    identity.addClaim(1, 1, issuer, signature, data, uri);
    
    // 6. Verificar (esto se hará en Token.sol)
    // assertTrue(token.isVerified(user1));
}
```

**✅ Checkpoint 1:** Sistema de Identity completo y testeado

---

## Fase 2: Compliance Modules

### Orden de Desarrollo

1. ICompliance Interface
2. MaxBalanceCompliance (más simple)
3. MaxHoldersCompliance (con estado)
4. TransferLockCompliance (con tiempo)

---

### Paso 2.1: ICompliance Interface

#### 🔴 RED: Test de Interface

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

#### 🟢 GREEN: Crear Interface

```solidity
// src/ICompliance.sol
interface ICompliance {
    function canTransfer(address from, address to, uint256 amount) 
        external view returns (bool);
    function transferred(address from, address to, uint256 amount) external;
    function created(address to, uint256 amount) external;
    function destroyed(address from, uint256 amount) external;
}
```

**✅ Checkpoint 2.1:** Interface definida

---

### Paso 2.2: MaxBalanceCompliance

#### 🔴 RED: Test Completo

```solidity
// test/MaxBalanceCompliance.t.sol
function test_CanTransfer_WhenUnderMaxBalance() public {
    token.setBalance(user2, 500 * 10**18);
    bool canTransfer = compliance.canTransfer(user1, user2, 400 * 10**18);
    assertTrue(canTransfer);
}

function test_CannotTransfer_WhenExceedsMaxBalance() public {
    token.setBalance(user2, 500 * 10**18);
    bool canTransfer = compliance.canTransfer(user1, user2, 600 * 10**18);
    assertFalse(canTransfer);
}
```

#### 🟢 GREEN: Implementar MaxBalanceCompliance

```solidity
// src/compliance/MaxBalanceCompliance.sol
contract MaxBalanceCompliance is ICompliance, Ownable {
    uint256 public maxBalance;
    address public tokenContract;
    
    function canTransfer(address, address to, uint256 amount) 
        external view override returns (bool) {
        uint256 balance = ERC20(tokenContract).balanceOf(to);
        return (balance + amount) <= maxBalance;
    }
    // ... otras funciones
}
```

**✅ Checkpoint 2.2:** MaxBalanceCompliance funcionando

---

### Paso 2.3: MaxHoldersCompliance

#### 🔴 RED: Test con Estado

```solidity
function test_CannotExceedMaxHolders() public {
    // Agregar holders hasta el límite
    for (uint i = 0; i < maxHolders; i++) {
        compliance.transferred(address(0), makeAddr(string(i)), 1);
    }
    
    // Intentar agregar uno más debe fallar
    bool canTransfer = compliance.canTransfer(
        address(0), 
        makeAddr("newHolder"), 
        1
    );
    assertFalse(canTransfer);
}
```

#### 🟢 GREEN: Implementar MaxHoldersCompliance

**✅ Checkpoint 2.3:** MaxHoldersCompliance funcionando

---

### Paso 2.4: TransferLockCompliance

#### 🔴 RED: Test con Tiempo

```solidity
function test_CannotTransferDuringLockPeriod() public {
    // Recibir tokens
    compliance.transferred(address(0), user1, 100);
    
    // Intentar transferir inmediatamente (debe fallar)
    vm.warp(block.timestamp + 1 days);
    bool canTransfer = compliance.canTransfer(user1, user2, 50);
    assertFalse(canTransfer);
    
    // Después del lock period (debe pasar)
    vm.warp(block.timestamp + 30 days);
    canTransfer = compliance.canTransfer(user1, user2, 50);
    assertTrue(canTransfer);
}
```

#### 🟢 GREEN: Implementar TransferLockCompliance

**✅ Checkpoint 2:** Todos los módulos de compliance funcionando

---

## Fase 3: Token Principal

### Orden de Desarrollo

1. Token básico (ERC-20)
2. Integración con Identity System
3. Integración con Compliance Modules
4. Funcionalidades avanzadas (pause, freeze, forced transfer)

---

### Paso 3.1: Token Básico - ERC-20

#### 🔴 RED: Test de ERC-20

```solidity
// test/Token.t.sol
function test_Mint() public {
    token.mint(user1, 1000);
    assertEq(token.balanceOf(user1), 1000);
    assertEq(token.totalSupply(), 1000);
}

function test_Transfer() public {
    token.mint(user1, 1000);
    vm.prank(user1);
    token.transfer(user2, 500);
    assertEq(token.balanceOf(user1), 500);
    assertEq(token.balanceOf(user2), 500);
}
```

#### 🟢 GREEN: Implementar Token Básico

```solidity
// src/Token.sol
contract Token is ERC20, AccessControl, Pausable {
    constructor(...) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AGENT_ROLE, admin);
    }
    
    function mint(address to, uint256 amount) external onlyRole(AGENT_ROLE) {
        _mint(to, amount);
    }
}
```

**✅ Checkpoint 3.1:** Token ERC-20 básico funcionando

---

### Paso 3.2: Integración con Identity System

#### 🔴 RED: Test de Verificación

```solidity
function test_CannotTransfer_WhenNotVerified() public {
    // user1 no está verificado
    token.mint(user1, 1000);
    
    vm.prank(user1);
    vm.expectRevert("Transfer not compliant");
    token.transfer(user2, 500);
}

function test_CanTransfer_WhenVerified() public {
    // Setup completo de identity
    setupVerifiedUser(user1);
    setupVerifiedUser(user2);
    
    token.mint(user1, 1000);
    
    vm.prank(user1);
    token.transfer(user2, 500); // Debe pasar
    assertEq(token.balanceOf(user2), 500);
}
```

#### 🟢 GREEN: Implementar isVerified()

```solidity
function isVerified(address account) public view returns (bool) {
    if (!identityRegistry.isRegistered(account)) return false;
    
    address identityAddress = identityRegistry.getIdentity(account);
    uint256[] memory requiredTopics = claimTopicsRegistry.getClaimTopics();
    
    for (uint256 i = 0; i < requiredTopics.length; i++) {
        // Verificar que tiene claim válido
        // ...
    }
    return true;
}
```

**✅ Checkpoint 3.2:** Verificación de identidad funcionando

---

### Paso 3.3: Integración con Compliance

#### 🔴 RED: Test de Compliance

```solidity
function test_CannotTransfer_WhenComplianceFails() public {
    setupVerifiedUsers();
    
    // Configurar compliance que rechaza
    MaxBalanceCompliance compliance = new MaxBalanceCompliance(owner, 100);
    compliance.setTokenContract(address(token));
    token.addComplianceModule(address(compliance));
    
    token.mint(user1, 1000);
    
    vm.prank(user1);
    vm.expectRevert("Transfer not compliant");
    token.transfer(user2, 1000); // Excede max balance
}
```

#### 🟢 GREEN: Implementar canTransfer() y _update()

```solidity
function canTransfer(address from, address to, uint256 amount) 
    public view returns (bool) {
    if (paused()) return false;
    if (frozen[from] || frozen[to]) return false;
    if (!isVerified(from) || !isVerified(to)) return false;
    
    for (uint256 i = 0; i < complianceModules.length; i++) {
        if (!complianceModules[i].canTransfer(from, to, amount)) {
            return false;
        }
    }
    return true;
}

function _update(address from, address to, uint256 amount) 
    internal virtual override {
    if (from != address(0) && to != address(0) && !bypassCompliance) {
        require(canTransfer(from, to, amount), "Transfer not compliant");
    }
    
    super._update(from, to, amount);
    
    if (from != address(0) && to != address(0) && !bypassCompliance) {
        for (uint256 i = 0; i < complianceModules.length; i++) {
            complianceModules[i].transferred(from, to, amount);
        }
    }
}
```

**✅ Checkpoint 3.3:** Compliance integrado

---

### Paso 3.4: Funcionalidades Avanzadas

#### 🔴 RED: Tests de Pause, Freeze, Forced Transfer

```solidity
function test_Pause() public {
    token.pause();
    vm.expectRevert();
    token.transfer(user2, 100);
}

function test_FreezeAccount() public {
    token.freezeAccount(user1);
    vm.expectRevert();
    token.transfer(user2, 100);
}

function test_ForcedTransfer() public {
    setupVerifiedUsers();
    token.mint(user1, 1000);
    token.freezeAccount(user1);
    
    // Agent puede forzar transfer
    token.forcedTransfer(user1, user2, 500);
    assertEq(token.balanceOf(user2), 500);
}
```

#### 🟢 GREEN: Implementar funcionalidades

**✅ Checkpoint 3:** Token completo funcionando

---

## Fase 4: Clone Factory

### Orden de Desarrollo

1. TokenCloneable (versión inicializable)
2. TokenCloneFactory
3. Tests de gas savings

---

### Paso 4.1: TokenCloneable

#### 🔴 RED: Test de Cloneable

```solidity
function test_Initialize() public {
    TokenCloneable clone = TokenCloneable(implementation.clone());
    clone.initialize("Token", "TKN", 18, admin);
    
    assertEq(clone.name(), "Token");
    assertEq(clone.symbol(), "TKN");
    assertEq(clone.decimals(), 18);
}

function test_CannotInitializeTwice() public {
    TokenCloneable clone = TokenCloneable(implementation.clone());
    clone.initialize("Token", "TKN", 18, admin);
    
    vm.expectRevert();
    clone.initialize("Token2", "TK2", 18, admin);
}
```

#### 🟢 GREEN: Implementar TokenCloneable

```solidity
// src/TokenCloneable.sol
contract TokenCloneable is ERC20Upgradeable, AccessControlUpgradeable, PausableUpgradeable {
    constructor() {
        _disableInitializers();
    }
    
    function initialize(...) external initializer {
        __ERC20_init(name_, symbol_);
        __AccessControl_init();
        __Pausable_init();
        // ...
    }
}
```

**✅ Checkpoint 4.1:** TokenCloneable funcionando

---

### Paso 4.2: TokenCloneFactory

#### 🔴 RED: Test de Factory

```solidity
function test_CreateToken() public {
    address token = factory.createToken("Token", "TKN", 18, admin);
    
    assertTrue(token != address(0));
    assertEq(TokenCloneable(token).name(), "Token");
    assertEq(factory.getTotalTokens(), 1);
}

function test_GasSavings() public {
    uint256 gasBefore = gasleft();
    address token = factory.createToken("Token", "TKN", 18, admin);
    uint256 gasUsed = gasBefore - gasleft();
    
    // Clone debe usar mucho menos gas que deployment directo
    assertLt(gasUsed, 500000); // ~365k gas
}
```

#### 🟢 GREEN: Implementar Factory

```solidity
// src/TokenCloneFactory.sol
contract TokenCloneFactory is Ownable {
    using Clones for address;
    address public immutable implementation;
    
    constructor(address initialOwner) Ownable(initialOwner) {
        implementation = address(new TokenCloneable());
    }
    
    function createToken(...) external returns (address token) {
        token = implementation.clone();
        TokenCloneable(token).initialize(...);
        // Track token
        return token;
    }
}
```

**✅ Checkpoint 4:** Clone Factory funcionando con ahorro de gas

---

## Fase 5: Compliance Aggregator

### Orden de Desarrollo

1. ComplianceAggregator básico
2. Gestión de módulos
3. Integración con Token

---

### Paso 5.1: ComplianceAggregator Básico

#### 🔴 RED: Test de Aggregator

```solidity
function test_AddModule() public {
    aggregator.addModule(token, address(module1));
    assertTrue(aggregator.isModuleActiveForToken(token, address(module1)));
}

function test_CanTransfer_AllowsWhenAllModulesPass() public {
    aggregator.addModule(token, address(module1));
    aggregator.addModule(token, address(module2));
    
    // Ambos módulos permiten
    assertTrue(aggregator.canTransfer(token, from, to, amount));
}

function test_CanTransfer_RejectsWhenOneModuleFails() public {
    aggregator.addModule(token, address(module1));
    aggregator.addModule(token, address(module2));
    
    // module2 rechaza
    vm.mockCall(address(module2), ..., abi.encode(false));
    
    assertFalse(aggregator.canTransfer(token, from, to, amount));
}
```

#### 🟢 GREEN: Implementar ComplianceAggregator

```solidity
// src/compliance/ComplianceAggregator.sol
contract ComplianceAggregator is ICompliance, Ownable {
    mapping(address => address[]) public tokenModules;
    
    function canTransfer(address token, address from, address to, uint256 amount)
        external view returns (bool) {
        address[] memory modules = tokenModules[token];
        for (uint256 i = 0; i < modules.length; i++) {
            if (!ICompliance(modules[i]).canTransfer(from, to, amount)) {
                return false;
            }
        }
        return true;
    }
}
```

**✅ Checkpoint 5:** ComplianceAggregator funcionando

---

## Fase 6: Integración y Deployment

### Paso 6.1: Scripts de Deployment

#### 🔴 RED: Test de Deployment Script

```solidity
// script/Deploy.s.sol
contract DeployScript is Script {
    function run() external {
        // Deploy registries
        IdentityRegistry ir = new IdentityRegistry(msg.sender);
        TrustedIssuersRegistry tir = new TrustedIssuersRegistry(msg.sender);
        ClaimTopicsRegistry ctr = new ClaimTopicsRegistry(msg.sender);
        
        // Deploy compliance modules
        MaxBalanceCompliance mbc = new MaxBalanceCompliance(msg.sender, 1000);
        // ...
        
        // Deploy token
        Token token = new Token("RWA Token", "RWA", 18, msg.sender);
        token.setIdentityRegistry(address(ir));
        // ...
        
        // Verificar deployment
        assertTrue(address(token) != address(0));
    }
}
```

#### 🟢 GREEN: Implementar Scripts

**✅ Checkpoint 6.1:** Scripts de deployment funcionando

---

### Paso 6.2: Tests de Integración Completa

#### 🔴 RED: Test End-to-End

```solidity
function test_CompleteFlow() public {
    // 1. Setup identity system
    setupIdentitySystem();
    
    // 2. Setup compliance
    setupCompliance();
    
    // 3. Setup token
    setupToken();
    
    // 4. Verificar usuarios
    verifyUsers();
    
    // 5. Mint tokens
    token.mint(user1, 1000);
    
    // 6. Transfer tokens
    vm.prank(user1);
    token.transfer(user2, 500);
    
    // 7. Verificar estado final
    assertEq(token.balanceOf(user2), 500);
}
```

#### 🟢 GREEN: Implementar y verificar

**✅ Checkpoint 6:** Sistema completo funcionando

---

## Checkpoints y Validaciones

### Checklist de Fase 1: Identity System

```
[X] Identity.sol implementado y testeado
[X] IdentityRegistry.sol implementado y testeado
[X] TrustedIssuersRegistry.sol implementado y testeado
[X] ClaimTopicsRegistry.sol implementado y testeado
[X] Tests de integración pasando
[X] Coverage >80% para identity system
```

### Checklist de Fase 2: Compliance Modules

```
[X] ICompliance interface definida
[X] MaxBalanceCompliance implementado y testeado
[X] MaxHoldersCompliance implementado y testeado
[X] TransferLockCompliance implementado y testeado
[X] Todos los tests pasando
[X] Coverage >80% para compliance modules
```

### Checklist de Fase 3: Token Principal

```
[X] Token.sol básico (ERC-20) funcionando
[X] Integración con Identity System
[X] Integración con Compliance Modules
[X] Funcionalidades avanzadas (pause, freeze, forced transfer)
[X] Todos los tests pasando
[X] Coverage >80% para Token
```

### Checklist de Fase 4: Clone Factory

```
[X] TokenCloneable.sol implementado
[X] TokenCloneFactory.sol implementado
[X] Tests de clones pasando
[X] Gas savings medidos y documentados
[X] Coverage >80% para factory
```

### Checklist de Fase 5: Compliance Aggregator

```
[X] ComplianceAggregator.sol implementado
[X] Gestión de módulos funcionando
[X] Integración con Token
[X] Tests completos pasando
[X] Coverage >80% para aggregator
```

### Checklist de Fase 6: Integración

```
[X] Scripts de deployment funcionando
[X] Tests end-to-end pasando
[X] Documentación completa
[X] Gas profiling realizado
[X] Listo para deployment en testnet
```

---

## Comandos Útiles Durante el Desarrollo

### Ejecutar Tests

```bash
# Todos los tests
forge test

# Suite específica
forge test --match-contract TokenTest

# Test específico
forge test --match-test test_Transfer

# Con detalles
forge test -vvv

# Con gas report
forge test --gas-report
```

### Coverage

```bash
# Generar coverage report
forge coverage

# Ver coverage en navegador
forge coverage --report lcov
genhtml lcov.info -o coverage
open coverage/index.html
```

### Compilar

```bash
# Compilar
forge build

# Limpiar y compilar
forge clean && forge build

# Verificar tamaño de contrato
forge build --sizes
```

### Deployment Local

```bash
# Terminal 1: Anvil
anvil

# Terminal 2: Deploy
forge script script/Deploy.s.sol --rpc-url localhost --broadcast
```

---

## Métricas de Éxito

### Cobertura de Tests

- ✅ **Mínimo:** 80% coverage
- ✅ **Objetivo:** 90%+ coverage
- ✅ **Crítico:** 100% coverage en funciones de seguridad

### Tests por Contrato

- ✅ **Mínimo:** 10 tests por contrato principal
- ✅ **Objetivo:** 15+ tests por contrato
- ✅ **Incluir:** Tests positivos, negativos, edge cases

### Gas Optimization

- ✅ **Clone Factory:** >90% ahorro vs deployment directo
- ✅ **Compliance Aggregator:** >60% ahorro vs módulos separados
- ✅ **Funciones críticas:** <100k gas por operación

---

## Troubleshooting TDD

### Problema: Test no compila

**Solución:**
1. Verificar imports
2. Verificar que el contrato existe
3. Verificar sintaxis de Solidity

### Problema: Test pasa sin implementar

**Solución:**
1. Verificar que el test realmente valida el comportamiento
2. Agregar más assertions
3. Verificar edge cases

### Problema: Test intermitente

**Solución:**
1. Verificar dependencias de estado
2. Usar `setUp()` correctamente
3. Limpiar estado entre tests

### Problema: Refactoring rompe tests

**Solución:**
1. Refactorizar en pasos pequeños
2. Ejecutar tests después de cada cambio
3. Mantener comportamiento externo igual

---

## Recursos Adicionales

### Documentación del Proyecto

- `START_HERE.md` - Punto de inicio
- `GUIA_ESTUDIANTE.md` - Conceptos y arquitectura
- `REFERENCIA_TECNICA.md` - Templates y snippets

### Herramientas

- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/)
- [Solidity Docs](https://docs.soliditylang.org/)

### TDD Resources

- [Test-Driven Development by Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

## Resumen del Flujo TDD

```
┌─────────────────────────────────────────────────────────┐
│                    CICLO TDD                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. 🔴 RED                                              │
│     └─ Escribe test que falle                           │
│     └─ Define comportamiento esperado                   │
│                                                          │
│  2. 🟢 GREEN                                            │
│     └─ Escribe código mínimo para pasar                 │
│     └─ No optimices todavía                             │
│                                                          │
│  3. 🔵 REFACTOR                                         │
│     └─ Mejora código sin cambiar comportamiento         │
│     └─ Todos los tests deben seguir pasando             │
│                                                          │
│  4. 🔄 REPETIR                                          │
│     └─ Siguiente feature                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Próximos Pasos

1. ✅ **Setup Inicial** - Configurar proyecto
2. ✅ **Fase 1** - Identity System
3. ✅ **Fase 2** - Compliance Modules
4. ✅ **Fase 3** - Token Principal
5. ✅ **Fase 4** - Clone Factory
6. ✅ **Fase 5** - Compliance Aggregator
7. ✅ **Fase 6** - Integración y Deployment

**¡Comienza con el Paso 0.1 y sigue el ciclo TDD! 🚀**

---

**Última actualización:** 2024

