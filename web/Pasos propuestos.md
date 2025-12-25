Pasos propuestos
PASO 1: Estructura base y configuración inicial
    Crear directorio web/ con 3 subdirectorios para cada interfaz
    Configurar Next.js + TypeScript en cada una
    Configurar tema claro/oscuro (context/provider)
    Configurar estructura de componentes en directorios separados
    Configurar ethers.js y conexión con MetaMask (con selección de wallet)
PASO 2: Configuración de MongoDB y modelos de datos
    Configurar conexión a MongoDB
    Crear modelos/schemas para:
    Archivos adjuntos a tokens
    Archivos adjuntos a solicitudes de trusted issuers
    Transacciones realizadas
    Otros datos necesarios
PASO 3: Interfaz 1 - Identity Management (puerto 4001)
    Componentes para gestionar identidades
    Conexión con IdentityRegistry.sol
    Gestión de clones de Identity.sol
    Visualización y gestión de claims
PASO 4: Interfaz 2 - Trusted Issuers Management (puerto 4002)
    Componentes para gestionar Trusted Issuers
    Conexión con TrustedIssuersRegistry.sol
    Listado de claim topics (líneas 1022-1033 de MI_CUADERNO.md)
    Gestión de solicitudes de trusted issuers con archivos adjuntos
PASO 5: Interfaz 3 - Token Factory & Marketplace (puerto 4003)
    Componentes para crear tokens usando TokenCloneFactory.sol
    Configuración de tipos de trusted requeridos
    Marketplace para comprar tokens (con verificación de identidad)
PASO 6: Script de despliegue y arranque
    Script para desplegar contratos a Anvil
    Script para arrancar las 3 interfaces web
    Configuración de variables de entorno