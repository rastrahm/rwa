# Códigos de País para NationalityCompliance

## ⚠️ IMPORTANTE: La Wallet NO Identifica el País

**Una dirección de wallet NO contiene información sobre el país del usuario.** 

La blockchain es **pseudónima** y no tiene forma de determinar automáticamente la nacionalidad de un usuario. Una wallet es simplemente una dirección hexadecimal como `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5` - **no contiene información personal**.

### ¿Cómo se Obtiene la Nacionalidad entonces?

El país debe ser **verificado off-chain** y luego **agregado como un CLAIM** en el sistema de identidad:

1. ✅ **Verificación Off-Chain**: El usuario proporciona documentos (pasaporte, DNI) a un servicio de KYC
2. ✅ **Issuer Confiable**: Un servicio verificado (emisor confiable) valida la nacionalidad del documento
3. ✅ **Claim On-Chain**: El issuer emite un claim con el código de país que se almacena en el Identity contract
4. ✅ **Verificación On-Chain**: NationalityCompliance lee el claim para verificar la nacionalidad

---

## Flujo Completo: Cómo Funciona

### Proceso Step-by-Step

```
┌─────────────────────────────────────────────────────────────┐
│  1. VERIFICACIÓN OFF-CHAIN (Fuera de Blockchain)           │
├─────────────────────────────────────────────────────────────┤
│  Usuario envía a servicio KYC:                             │
│    • Pasaporte o DNI                                       │
│    • Foto de identificación                                │
│    • Selfie para verificación                              │
│                                                             │
│  Servicio KYC verifica:                                    │
│    ✓ Documento es auténtico                                │
│    ✓ Foto coincide con documento                           │
│    ✓ Extrae nacionalidad del documento                     │
│      Ejemplo: Pasaporte dice "USA" → código "US"           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. EMISIÓN DE CLAIM (On-Chain)                            │
├─────────────────────────────────────────────────────────────┤
│  El servicio KYC (issuer confiable) emite un claim:        │
│                                                             │
│  identity.addClaim(                                        │
│    topic: 11,                    // NATIONALITY_TOPIC      │
│    issuer: kycServiceAddress,    // Servicio KYC           │
│    data: hex"5553",              // "US" en bytes          │
│    signature: ...,                // Firma del issuer       │
│    uri: "https://kyc.com/..."    // Evidencia del claim    │
│  )                                                          │
│                                                             │
│  El claim se almacena en el Identity contract del usuario  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. VERIFICACIÓN ON-CHAIN (Cuando se usa el token)         │
├─────────────────────────────────────────────────────────────┤
│  Usuario intenta transferir tokens:                        │
│    token.transfer(bob, 100)                                │
│                                                             │
│  NationalityCompliance verifica:                           │
│    1. Lee el Identity contract del usuario                 │
│    2. Busca claim de nacionalidad (topic 11)               │
│    3. Verifica que el issuer es confiable                  │
│    4. Extrae código de país del claim (ej: "US")           │
│    5. Verifica si el país está permitido                   │
│    6. Aprobar o rechazar la transferencia                  │
└─────────────────────────────────────────────────────────────┘
```

### Ejemplo Práctico Completo

```solidity
// ============ CONFIGURACIÓN INICIAL ============

// 1. El admin configura el sistema
claimTopicsRegistry.addClaimTopic(11); // NATIONALITY_TOPIC

// 2. Registrar servicio KYC como issuer confiable
uint256[] memory kycTopics = new uint256[](1);
kycTopics[0] = 11; // Puede emitir claims de nacionalidad
trustedIssuersRegistry.addTrustedIssuer(kycServiceAddress, kycTopics);

// 3. Configurar NationalityCompliance
NationalityCompliance nationality = new NationalityCompliance(...);
nationality.addCountry(0x5553); // "US" permitido
nationality.addCountry(0x4D58); // "MX" permitido

// ============ VERIFICACIÓN DE USUARIO ============

// OFFLINE: Usuario envía pasaporte a servicio KYC
// OFFLINE: Servicio KYC verifica pasaporte y extrae "US"

// ONLINE: Servicio KYC emite claim (después de verificar off-chain)
Identity aliceIdentity = Identity(identityRegistry.getIdentity(alice));
aliceIdentity.addClaim(
    11,                        // NATIONALITY_TOPIC
    1,                         // scheme
    kycServiceAddress,         // issuer confiable
    signature,                 // firma del servicio KYC
    hex"5553",                 // "US" - obtenido del pasaporte
    "https://kyc-service.com/alice-passport-verification"
);

// ============ USO DEL TOKEN ============

// Usuario intenta transferir
token.transfer(bob, 100);

// NationalityCompliance verifica automáticamente:
bytes2 aliceCountry = nationality.getNationality(alice); // 0x5553 ("US")
bool isAllowed = nationality.isCountryAllowed(aliceCountry); // true

// Transferencia aprobada ✅
```

---

## Estándar: ISO 3166-1 alpha-2

**NO hay un estándar específico de blockchain** para códigos de país como los claim topics. En su lugar, se usa el **estándar internacional ISO 3166-1 alpha-2**, que es ampliamente aceptado y utilizado.

### ¿Qué es ISO 3166-1 alpha-2?

Es un estándar publicado por la **Organización Internacional de Normalización (ISO)** que define códigos de dos letras para representar países y territorios.

**Características:**
- ✅ 2 letras (A-Z, mayúsculas)
- ✅ Ejemplos: "US" (Estados Unidos), "MX" (México), "BR" (Brasil)
- ✅ 249 códigos únicos
- ✅ Estándar internacional reconocido

---

## Lista de Códigos de País Comunes

### América del Norte
| País | Código | bytes2 (hex) | Descripción |
|------|--------|--------------|-------------|
| Estados Unidos | `US` | `0x5553` | United States |
| Canadá | `CA` | `0x4341` | Canada |
| México | `MX` | `0x4D58` | Mexico |

### América Central y Caribe
| País | Código | bytes2 (hex) | Descripción |
|------|--------|--------------|-------------|
| Guatemala | `GT` | `0x4754` | Guatemala |
| Costa Rica | `CR` | `0x4352` | Costa Rica |
| Panamá | `PA` | `0x5041` | Panama |
| República Dominicana | `DO` | `0x444F` | Dominican Republic |
| Puerto Rico | `PR` | `0x5052` | Puerto Rico |

### América del Sur
| País | Código | bytes2 (hex) | Descripción |
|------|--------|--------------|-------------|
| Argentina | `AR` | `0x4152` | Argentina |
| Brasil | `BR` | `0x4252` | Brazil |
| Chile | `CL` | `0x434C` | Chile |
| Colombia | `CO` | `0x434F` | Colombia |
| Perú | `PE` | `0x5045` | Peru |
| Venezuela | `VE` | `0x5645` | Venezuela |
| Uruguay | `UY` | `0x5559` | Uruguay |
| Paraguay | `PY` | `0x5059` | Paraguay |
| Ecuador | `EC` | `0x4543` | Ecuador |
| Bolivia | `BO` | `0x424F` | Bolivia |

### Europa
| País | Código | bytes2 (hex) | Descripción |
|------|--------|--------------|-------------|
| Reino Unido | `GB` | `0x4742` | United Kingdom |
| España | `ES` | `0x4553` | Spain |
| Francia | `FR` | `0x4652` | France |
| Alemania | `DE` | `0x4445` | Germany |
| Italia | `IT` | `0x4954` | Italy |
| Portugal | `PT` | `0x5054` | Portugal |
| Suiza | `CH` | `0x4348` | Switzerland |
| Países Bajos | `NL` | `0x4E4C` | Netherlands |
| Bélgica | `BE` | `0x4245` | Belgium |
| Suecia | `SE` | `0x5345` | Sweden |
| Noruega | `NO` | `0x4E4F` | Norway |
| Polonia | `PL` | `0x504C` | Poland |

### Asia
| País | Código | bytes2 (hex) | Descripción |
|------|--------|--------------|-------------|
| China | `CN` | `0x434E` | China |
| Japón | `JP` | `0x4A50` | Japan |
| India | `IN` | `0x494E` | India |
| Corea del Sur | `KR` | `0x4B52` | South Korea |
| Singapur | `SG` | `0x5347` | Singapore |
| Hong Kong | `HK` | `0x484B` | Hong Kong |
| Taiwán | `TW` | `0x5457` | Taiwan |
| Tailandia | `TH` | `0x5448` | Thailand |
| Filipinas | `PH` | `0x5048` | Philippines |
| Indonesia | `ID` | `0x4944` | Indonesia |
| Malasia | `MY` | `0x4D59` | Malaysia |
| Vietnam | `VN` | `0x564E` | Vietnam |

### Medio Oriente
| País | Código | bytes2 (hex) | Descripción |
|------|--------|--------------|-------------|
| Emiratos Árabes Unidos | `AE` | `0x4145` | United Arab Emirates |
| Arabia Saudí | `SA` | `0x5341` | Saudi Arabia |
| Israel | `IL` | `0x494C` | Israel |
| Turquía | `TR` | `0x5452` | Turkey |

### África
| País | Código | bytes2 (hex) | Descripción |
|------|--------|--------------|-------------|
| Sudáfrica | `ZA` | `0x5A41` | South Africa |
| Egipto | `EG` | `0x4547` | Egypt |
| Nigeria | `NG` | `0x4E47` | Nigeria |
| Kenia | `KE` | `0x4B45` | Kenya |

### Oceanía
| País | Código | bytes2 (hex) | Descripción |
|------|--------|--------------|-------------|
| Australia | `AU` | `0x4155` | Australia |
| Nueva Zelanda | `NZ` | `0x4E5A` | New Zealand |

---

## Cómo Convertir Códigos de País a bytes2

### Conversión Manual

Para convertir un código ISO 3166-1 alpha-2 a `bytes2`:

1. Toma las dos letras (ej: "US")
2. Conviértelas a valores hexadecimales ASCII:
   - 'U' = 0x55 (85 en decimal)
   - 'S' = 0x53 (83 en decimal)
3. Combínalos: `0x5553`

### Ejemplos de Conversión

```solidity
// "US" → bytes2
'U' = 0x55
'S' = 0x53
bytes2("US") = 0x5553

// "MX" → bytes2
'M' = 0x4D
'X' = 0x58
bytes2("MX") = 0x4D58

// "BR" → bytes2
'B' = 0x42
'R' = 0x52
bytes2("BR") = 0x4252
```

### Función Helper para Conversión

```solidity
/**
 * @dev Convierte un string de 2 caracteres a bytes2
 * @param countryCode String de 2 letras (ej: "US", "MX")
 * @return bytes2 Código de país en formato bytes2
 */
function stringToBytes2(string memory countryCode) public pure returns (bytes2) {
    bytes memory countryBytes = bytes(countryCode);
    require(countryBytes.length == 2, "Country code must be 2 characters");
    
    // Convertir a mayúsculas (si es necesario)
    bytes2 code = bytes2(uint16(uint8(countryBytes[0])) << 8 | uint8(countryBytes[1]));
    return code;
}
```

---

## Comparación: Claim Topics vs Códigos de País

### Claim Topics (Estándar ERC-3643)

Los **claim topics** son números arbitrarios definidos por el proyecto:

```solidity
// Ejemplos comunes (no estándar, varían por proyecto)
uint256 KYC_TOPIC = 1;
uint256 AML_TOPIC = 2;
uint256 ACCREDITED_INVESTOR_TOPIC = 3;
uint256 NATIONALITY_TOPIC = 11;  // Definido por nosotros
```

**Características:**
- ✅ Números arbitrarios (cada proyecto define los suyos)
- ✅ No hay estándar universal
- ✅ Se registran en `ClaimTopicsRegistry`
- ✅ Identifican el TIPO de claim (ej: KYC, nacionalidad)

### Códigos de País (ISO 3166-1 alpha-2)

Los **códigos de país** son estándar internacional y se almacenan EN el claim:

```solidity
// Estándar ISO 3166-1 alpha-2 (internacional)
bytes2 US = 0x5553;  // "US" - se almacena en claim.data
bytes2 MX = 0x4D58;  // "MX" - se almacena en claim.data
bytes2 BR = 0x4252;  // "BR" - se almacena en claim.data
```

**Características:**
- ✅ Estándar internacional (ISO)
- ✅ Códigos de 2 letras
- ✅ 249 códigos únicos
- ✅ Se almacenan en el campo `data` del claim
- ✅ Representan el VALOR del claim (ej: "US", "MX")

### Estructura del Claim de Nacionalidad

```solidity
struct Claim {
    uint256 topic;      // 11 = NATIONALITY_TOPIC (tipo de claim)
    uint256 scheme;     // 1 = ECDSA (esquema de firma)
    address issuer;     // 0x... = Servicio KYC (quién emitió)
    bytes signature;    // 0x... = Firma del issuer
    bytes data;         // 0x5553 = "US" (VALOR: código de país)
    string uri;         // "https://kyc-service.com/user-123"
}
```

---

## Resumen: Puntos Clave

### ❌ Lo que NO puede hacer la blockchain:
- ❌ Determinar automáticamente el país de una wallet
- ❌ Leer documentos de identidad directamente
- ❌ Verificar pasaportes o DNIs on-chain

### ✅ Lo que SÍ hace el sistema:
- ✅ **Off-chain**: Servicio KYC verifica documentos y extrae nacionalidad
- ✅ **On-chain**: Issuer confiable emite claim con código de país
- ✅ **On-chain**: NationalityCompliance lee el claim para validar transfers
- ✅ **On-chain**: Token verifica nacionalidad antes de permitir transfers

### 🔑 Conceptos Importantes:

1. **Wallet = Dirección**: Solo es una dirección hexadecimal, sin información personal
2. **Identity Contract**: Almacena claims verificados (incluyendo nacionalidad)
3. **Issuer Confiable**: Servicio que verifica off-chain y emite claims on-chain
4. **Claim de Nacionalidad**: Contiene el código ISO del país en el campo `data`
5. **NationalityCompliance**: Lee claims y valida que el país esté permitido

---

## Referencias

- **ISO 3166-1**: https://www.iso.org/iso-3166-country-codes.html
- **Wikipedia ISO 3166-1 alpha-2**: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
- **Lista completa en formato JSON**: Disponible en múltiples repositorios open source
