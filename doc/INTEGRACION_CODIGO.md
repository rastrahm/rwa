# Integración a Nivel de Código - Sistema de Identity

## 📋 Índice

1. [Tipos de Integración](#tipos-de-integración)
2. [Imports y Dependencias](#imports-y-dependencias)
3. [Composición vs Herencia](#composición-vs-herencia)
4. [Referencias Externas](#referencias-externas)
5. [Ejemplo Práctico: Token Contract](#ejemplo-práctico-token-contract)
6. [Verificación de Dependencias](#verificación-de-dependencias)

---

## Tipos de Integración

En Solidity, hay **dos formas principales** de integrar contratos:

### 1. Integración por **Composición** (Referencias Externas)
- Los contratos se despliegan **independientemente**
- Se comunican mediante **direcciones** (address)
- Se usa **casting** para llamar funciones: `Identity(address).claimExists()`
- **Ventaja:** Flexibilidad, pueden actualizarse independientemente
- **Desventaja:** Más gas, requiere validación de direcciones

### 2. Integración por **Herencia**
- Un contrato **hereda** de otro usando `is`
- El código se incluye directamente en el contrato hijo
- **Ventaja:** Menos gas, acceso directo
- **Desventaja:** Acoplamiento fuerte, no se pueden actualizar independientemente

### 3. Integración por **Import** (Solo para Tipos)
- Se importa para usar **tipos** (structs, interfaces)
- No crea dependencia de deployment
- Se usa para **casting** y **type checking**

---

## Imports y Dependencias

### Estado Actual de los Contratos

#### Identity.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Identity is Ownable {
    // No importa otros contratos del sistema
    // Es independiente
}
```

**Dependencias:**
- ✅ `Ownable` de OpenZeppelin (herencia)
- ❌ No depende de otros contratos del sistema

#### IdentityRegistry.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Identity} from "./Identity.sol";  // ← IMPORT para tipo

contract IdentityRegistry is Ownable {
    mapping(address => Identity) private identities;  // ← Usa el tipo Identity
    
    function registerIdentity(address _wallet, address _identity) external {
        identities[_wallet] = Identity(_identity);  // ← Casting de address a Identity
    }
}
```

**Dependencias:**
- ✅ `Ownable` de OpenZeppelin (herencia)
- ✅ `Identity` (import para tipo, NO para deployment)

**Tipo de Integración:** 
- **Composición externa** - Recibe `address` y hace casting a `Identity`

#### TrustedIssuersRegistry.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TrustedIssuersRegistry is Ownable {
    // No importa otros contratos del sistema
    // Es independiente
}
```

**Dependencias:**
- ✅ `Ownable` de OpenZeppelin (herencia)
- ❌ No depende de otros contratos del sistema

#### ClaimTopicsRegistry.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ClaimTopicsRegistry is Ownable {
    // No importa otros contratos del sistema
    // Es independiente
}
```

**Dependencias:**
- ✅ `Ownable` de OpenZeppelin (herencia)
- ❌ No depende de otros contratos del sistema

---

## Composición vs Herencia

### Diagrama de Dependencias

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenZeppelin Ownable                     │
│                    (Biblioteca Externa)                     │
└─────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
         │ (is)               │ (is)               │ (is)
         │                    │                    │
┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐
│   Identity      │  │ IdentityRegistry│  │TrustedIssuers   │
│                 │  │                 │  │Registry         │
│ (Independiente) │  │ (Import Identity)│  │(Independiente)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              │ (usa tipo Identity)
                              │
                              ▼
                    ┌──────────────────┐
                    │ Identity Contract│
                    │ (address)        │
                    └──────────────────┘
```

### Análisis de Dependencias

| Contrato | Tipo de Dependencia | Método de Integración |
|----------|---------------------|----------------------|
| `Identity` | Ninguna (independiente) | - |
| `IdentityRegistry` | Import de tipo `Identity` | Composición externa (address → Identity) |
| `TrustedIssuersRegistry` | Ninguna (independiente) | - |
| `ClaimTopicsRegistry` | Ninguna (independiente) | - |

**Conclusión:** Los contratos son **independientes** y se comunican mediante **direcciones** (addresses).

---

## Referencias Externas

### Cómo Funciona la Integración

Los contratos se integran mediante **referencias externas** (addresses), no mediante herencia directa:

```solidity
// ❌ NO se hace así (herencia):
contract IdentityRegistry is Identity {
    // Esto incluiría todo el código de Identity
}

// ✅ Se hace así (composición):
contract IdentityRegistry is Ownable {
    mapping(address => Identity) private identities;  // Referencia externa
    
    function registerIdentity(address _wallet, address _identity) external {
        identities[_wallet] = Identity(_identity);  // Casting de address
    }
}
```

### Flujo de Integración

```
1. DEPLOYMENT (Independiente)
   ├─ Deploy IdentityRegistry → address: 0xAAA
   ├─ Deploy TrustedIssuersRegistry → address: 0xBBB
   ├─ Deploy ClaimTopicsRegistry → address: 0xCCC
   └─ Deploy Identity (para cada usuario) → address: 0xDDD

2. CONFIGURACIÓN (Referencias)
   ├─ Token.setIdentityRegistry(0xAAA)
   ├─ Token.setTrustedIssuersRegistry(0xBBB)
   └─ Token.setClaimTopicsRegistry(0xCCC)

3. USO (Llamadas Externas)
   └─ Token.isVerified(user)
      ├─ identityRegistry.isRegistered(user)  // Llamada externa
      ├─ identityRegistry.getIdentity(user)   // Llamada externa
      ├─ claimTopicsRegistry.getClaimTopics()  // Llamada externa
      └─ Identity(address).claimExists(...)   // Llamada externa con casting
```

---

## Ejemplo Práctico: Token Contract

### Cómo el Token Integrará los Registries

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IdentityRegistry} from "./IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "./TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "./ClaimTopicsRegistry.sol";
import {Identity} from "./Identity.sol";

/**
 * @title Token
 * @dev Token ERC-3643 que usa el sistema de Identity
 */
contract Token is ERC20, Ownable {
    // ============ REFERENCIAS EXTERNAS ============
    
    // Los registries se almacenan como addresses
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    // ============ CONSTRUCTOR ============
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        address _identityRegistry,
        address _trustedIssuersRegistry,
        address _claimTopicsRegistry
    ) ERC20(name, symbol) Ownable(initialOwner) {
        // Validar que las direcciones no sean cero
        require(_identityRegistry != address(0), "Invalid identity registry");
        require(_trustedIssuersRegistry != address(0), "Invalid trusted issuers registry");
        require(_claimTopicsRegistry != address(0), "Invalid claim topics registry");
        
        // Asignar referencias externas
        identityRegistry = IdentityRegistry(_identityRegistry);
        trustedIssuersRegistry = TrustedIssuersRegistry(_trustedIssuersRegistry);
        claimTopicsRegistry = ClaimTopicsRegistry(_claimTopicsRegistry);
    }
    
    // ============ FUNCIONES DE CONFIGURACIÓN ============
    
    /**
     * @dev Actualizar IdentityRegistry (solo owner)
     */
    function setIdentityRegistry(address _identityRegistry) external onlyOwner {
        require(_identityRegistry != address(0), "Invalid address");
        identityRegistry = IdentityRegistry(_identityRegistry);
    }
    
    /**
     * @dev Actualizar TrustedIssuersRegistry (solo owner)
     */
    function setTrustedIssuersRegistry(address _trustedIssuersRegistry) external onlyOwner {
        require(_trustedIssuersRegistry != address(0), "Invalid address");
        trustedIssuersRegistry = TrustedIssuersRegistry(_trustedIssuersRegistry);
    }
    
    /**
     * @dev Actualizar ClaimTopicsRegistry (solo owner)
     */
    function setClaimTopicsRegistry(address _claimTopicsRegistry) external onlyOwner {
        require(_claimTopicsRegistry != address(0), "Invalid address");
        claimTopicsRegistry = ClaimTopicsRegistry(_claimTopicsRegistry);
    }
    
    // ============ VERIFICACIÓN DE IDENTITY ============
    
    /**
     * @dev Verificar si un usuario está completamente verificado
     * @param account Dirección del usuario
     * @return true si el usuario está verificado
     */
    function isVerified(address account) public view returns (bool) {
        // 1. Verificar que IdentityRegistry está configurado
        if (address(identityRegistry) == address(0)) {
            return false;
        }
        
        // 2. Verificar que está registrado
        if (!identityRegistry.isRegistered(account)) {
            return false;
        }
        
        // 3. Obtener Identity contract
        address identityAddress = identityRegistry.getIdentity(account);
        if (identityAddress == address(0)) {
            return false;
        }
        
        // 4. Obtener topics requeridos
        uint256[] memory requiredTopics = claimTopicsRegistry.getClaimTopics();
        
        // Si no hay topics requeridos, cualquier usuario registrado está OK
        if (requiredTopics.length == 0) {
            return true;
        }
        
        // 5. Para cada topic requerido, verificar que existe claim válido
        for (uint256 i = 0; i < requiredTopics.length; i++) {
            bool hasValidClaim = false;
            
            // Obtener todos los issuers confiables
            address[] memory trustedIssuers = trustedIssuersRegistry.getTrustedIssuers();
            
            for (uint256 j = 0; j < trustedIssuers.length; j++) {
                // Verificar que el issuer puede emitir este topic
                if (trustedIssuersRegistry.hasClaimTopic(trustedIssuers[j], requiredTopics[i])) {
                    // Verificar que el claim existe en el Identity
                    // ← AQUÍ SE HACE EL CASTING DE ADDRESS A IDENTITY
                    Identity identity = Identity(identityAddress);
                    if (identity.claimExists(requiredTopics[i], trustedIssuers[j])) {
                        hasValidClaim = true;
                        break;
                    }
                }
            }
            
            // Si no se encontró un claim válido para este topic, falla
            if (!hasValidClaim) {
                return false;
            }
        }
        
        return true;
    }
    
    // ============ OVERRIDE DE TRANSFER ============
    
    /**
     * @dev Override de transfer para verificar identidad
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(isVerified(msg.sender), "Sender not verified");
        require(isVerified(to), "Recipient not verified");
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override de transferFrom para verificar identidad
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(isVerified(from), "Sender not verified");
        require(isVerified(to), "Recipient not verified");
        return super.transferFrom(from, to, amount);
    }
}
```

### Análisis del Código

#### 1. Imports
```solidity
import {IdentityRegistry} from "./IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "./TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "./ClaimTopicsRegistry.sol";
import {Identity} from "./Identity.sol";
```

**Propósito:** 
- Importar los **tipos** de los contratos
- NO se despliegan junto con Token
- Se usan para **type checking** y **casting**

#### 2. Referencias Externas
```solidity
IdentityRegistry public identityRegistry;
TrustedIssuersRegistry public trustedIssuersRegistry;
ClaimTopicsRegistry public claimTopicsRegistry;
```

**Tipo:** Variables de estado que almacenan **direcciones** de contratos ya desplegados.

#### 3. Constructor
```solidity
constructor(
    ...
    address _identityRegistry,
    address _trustedIssuersRegistry,
    address _claimTopicsRegistry
) {
    identityRegistry = IdentityRegistry(_identityRegistry);  // ← Casting
    trustedIssuersRegistry = TrustedIssuersRegistry(_trustedIssuersRegistry);
    claimTopicsRegistry = ClaimTopicsRegistry(_claimTopicsRegistry);
}
```

**Tipo de Integración:** 
- **Composición externa** - Recibe addresses y hace casting a tipos

#### 4. Llamadas Externas
```solidity
if (!identityRegistry.isRegistered(account)) {  // ← Llamada externa
    return false;
}

address identityAddress = identityRegistry.getIdentity(account);  // ← Llamada externa
uint256[] memory requiredTopics = claimTopicsRegistry.getClaimTopics();  // ← Llamada externa
```

**Tipo:** Llamadas a contratos externos mediante la referencia almacenada.

#### 5. Casting de Address a Identity
```solidity
Identity identity = Identity(identityAddress);  // ← Casting
if (identity.claimExists(...)) {  // ← Llamada externa
    ...
}
```

**Tipo:** 
- Se obtiene un `address` del registry
- Se hace **casting** a tipo `Identity`
- Se llama a la función del contrato externo

---

## Verificación de Dependencias

### Cómo Verificar las Dependencias

#### 1. Usando Foundry

```bash
# Ver dependencias de un contrato
forge tree

# Ver dependencias específicas
forge tree --contracts IdentityRegistry
```

**Salida esperada:**
```
IdentityRegistry
├── Ownable (OpenZeppelin)
└── Identity (local)
```

#### 2. Usando Solidity Compiler

```bash
# Compilar y ver dependencias
forge build --sizes
```

#### 3. Análisis Manual

**IdentityRegistry.sol:**
```solidity
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";  // ← Dependencia externa
import {Identity} from "./Identity.sol";  // ← Dependencia local (solo tipo)
```

**Verificación:**
- ✅ `Ownable`: Dependencia de **deployment** (herencia)
- ✅ `Identity`: Dependencia de **tipo** (no de deployment)

### Diagrama de Dependencias Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenZeppelin                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Ownable  │  │  ERC20   │  │  ...     │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
         ▲                    ▲
         │                    │
         │ (is)               │ (is)
         │                    │
┌────────┴────────┐  ┌────────┴────────┐
│   Identity      │  │      Token      │
│                 │  │                 │
│ (Independiente) │  │ (Depende de)    │
└─────────────────┘  │ • IdentityReg.  │
                     │ • TrustedIssuers│
                     │ • ClaimTopics   │
                     └────────┬────────┘
                              │
                              │ (usa tipos)
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ IdentityRegistry│  │TrustedIssuers   │  │ClaimTopics      │
│                 │  │Registry         │  │Registry         │
│ (usa tipo       │  │(Independiente)  │  │(Independiente)  │
│  Identity)      │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Resumen: Tipo de Integración

### ✅ Integración por **Composición Externa**

**Características:**
1. **Contratos independientes:** Cada contrato se despliega por separado
2. **Comunicación por addresses:** Se pasan direcciones entre contratos
3. **Casting de tipos:** Se hace casting de `address` a tipos específicos
4. **Llamadas externas:** Se llaman funciones de contratos externos
5. **Imports solo para tipos:** Los imports son para type checking, no para deployment

**Ventajas:**
- ✅ Flexibilidad: Pueden actualizarse independientemente
- ✅ Modularidad: Cada componente es independiente
- ✅ Reutilización: Un registry puede usarse por múltiples tokens
- ✅ Actualización: Se pueden cambiar registries sin redeployar Token

**Desventajas:**
- ❌ Más gas: Llamadas externas consumen más gas
- ❌ Validación necesaria: Hay que validar que las direcciones no sean cero
- ❌ Complejidad: Más complejo de gestionar

### ❌ NO es Integración por Herencia

**No se hace así:**
```solidity
// ❌ Esto NO se hace
contract Token is IdentityRegistry, TrustedIssuersRegistry {
    // Esto incluiría todo el código de ambos contratos
}
```

**Razón:** Los registries son **independientes** y pueden usarse por múltiples tokens.

---

## Ejemplo de Deployment

### Script de Deployment

```solidity
// deploy.s.sol
contract DeployScript is Script {
    function run() external {
        address owner = msg.sender;
        
        // 1. Desplegar registries (independientes)
        IdentityRegistry identityRegistry = new IdentityRegistry(owner);
        TrustedIssuersRegistry trustedIssuersRegistry = new TrustedIssuersRegistry(owner);
        ClaimTopicsRegistry claimTopicsRegistry = new ClaimTopicsRegistry(owner);
        
        // 2. Desplegar Token (con referencias)
        Token token = new Token(
            "MyToken",
            "MTK",
            owner,
            address(identityRegistry),        // ← Pasa address
            address(trustedIssuersRegistry),   // ← Pasa address
            address(claimTopicsRegistry)       // ← Pasa address
        );
        
        // 3. Configurar registries
        claimTopicsRegistry.addClaimTopic(1);  // KYC requerido
        
        uint256[] memory topics = new uint256[](1);
        topics[0] = 1;
        trustedIssuersRegistry.addTrustedIssuer(issuer, topics);
        
        // 4. Registrar usuario
        Identity identity = new Identity(user);
        identityRegistry.registerIdentity(user, address(identity));
    }
}
```

### Flujo de Deployment

```
1. Deploy IdentityRegistry → 0xAAA
2. Deploy TrustedIssuersRegistry → 0xBBB
3. Deploy ClaimTopicsRegistry → 0xCCC
4. Deploy Token(..., 0xAAA, 0xBBB, 0xCCC)
   └─ Token almacena las direcciones
   └─ Token puede llamar a los registries
```

---

## Puntos Clave

### 1. Imports son para Tipos
```solidity
import {Identity} from "./Identity.sol";  // ← Solo para tipo
```

**No significa:**
- ❌ Que Identity se despliega con el contrato
- ❌ Que hay dependencia de deployment

**Significa:**
- ✅ Que se puede usar el tipo `Identity`
- ✅ Que se puede hacer casting: `Identity(address)`

### 2. Referencias son Addresses
```solidity
IdentityRegistry public identityRegistry;  // ← Almacena address
```

**En el constructor:**
```solidity
identityRegistry = IdentityRegistry(_address);  // ← Casting de address
```

### 3. Llamadas son Externas
```solidity
identityRegistry.isRegistered(user);  // ← Llamada externa (consume gas)
```

**Cada llamada:**
- Consume gas adicional
- Es una transacción externa
- Puede fallar si el contrato no existe

### 4. Validación Necesaria
```solidity
require(address(identityRegistry) != address(0), "Invalid registry");
```

**Siempre validar:**
- Que las direcciones no sean cero
- Que los contratos existan
- Que los contratos tengan las funciones esperadas

---

## Conclusión

El sistema de Identity usa **integración por composición externa**:

1. ✅ **Contratos independientes** - Cada uno se despliega por separado
2. ✅ **Comunicación por addresses** - Se pasan direcciones entre contratos
3. ✅ **Casting de tipos** - Se hace casting de `address` a tipos específicos
4. ✅ **Llamadas externas** - Se llaman funciones de contratos externos
5. ✅ **Imports para tipos** - Los imports son solo para type checking

**Ventaja principal:** Flexibilidad y modularidad - cada componente puede actualizarse independientemente.

