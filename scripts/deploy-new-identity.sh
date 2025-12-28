#!/bin/bash

# Script para desplegar un nuevo contrato Identity con la función setTrustedIssuersRegistry
# y actualizarlo en el IdentityRegistry existente

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deploy New Identity Contract${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Cargar variables de entorno desde .env.local si existe
if [ -f .env.local ]; then
    echo -e "${YELLOW}📋 Cargando variables de entorno desde .env.local...${NC}"
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Configuración por defecto (Anvil local)
RPC_URL=${RPC_URL:-"http://localhost:8545"}
WALLET_ADDRESS=${WALLET_ADDRESS:-"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
DEPLOYER_ADDRESS=${DEPLOYER_ADDRESS:-"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}

# Verificar que las direcciones de contratos estén configuradas
if [ -z "$NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS" ] && [ -z "$IDENTITY_REGISTRY_ADDRESS" ]; then
    echo -e "${RED}❌ Error: IDENTITY_REGISTRY_ADDRESS no está configurado${NC}"
    echo -e "${YELLOW}   Configura NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS o IDENTITY_REGISTRY_ADDRESS en .env.local${NC}"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS" ] && [ -z "$TRUSTED_ISSUERS_REGISTRY_ADDRESS" ]; then
    echo -e "${RED}❌ Error: TRUSTED_ISSUERS_REGISTRY_ADDRESS no está configurado${NC}"
    echo -e "${YELLOW}   Configura NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS o TRUSTED_ISSUERS_REGISTRY_ADDRESS en .env.local${NC}"
    exit 1
fi

# Usar NEXT_PUBLIC_ si está disponible, sino usar sin prefijo
IDENTITY_REGISTRY=${NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS:-$IDENTITY_REGISTRY_ADDRESS}
TRUSTED_ISSUERS_REGISTRY=${NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS:-$TRUSTED_ISSUERS_REGISTRY_ADDRESS}

echo -e "${GREEN}✅ Configuración:${NC}"
echo -e "   RPC URL: ${RPC_URL}"
echo -e "   Wallet Address (owner): ${WALLET_ADDRESS}"
echo -e "   Deployer Address: ${DEPLOYER_ADDRESS}"
echo -e "   IdentityRegistry: ${IDENTITY_REGISTRY}"
echo -e "   TrustedIssuersRegistry: ${TRUSTED_ISSUERS_REGISTRY}"
echo ""

# Verificar que Foundry esté instalado
if ! command -v forge &> /dev/null; then
    echo -e "${RED}❌ Error: Foundry no está instalado${NC}"
    echo -e "${YELLOW}   Instala Foundry desde: https://book.getfoundry.sh/getting-started/installation${NC}"
    exit 1
fi

# Verificar que el directorio sc existe
if [ ! -d "sc" ]; then
    echo -e "${RED}❌ Error: Directorio 'sc' no encontrado${NC}"
    echo -e "${YELLOW}   Ejecuta este script desde la raíz del proyecto${NC}"
    exit 1
fi

# Compilar contratos
echo -e "${BLUE}🔨 Compilando contratos...${NC}"
cd sc
forge build --force > /dev/null 2>&1 || {
    echo -e "${RED}❌ Error al compilar contratos${NC}"
    exit 1
}
echo -e "${GREEN}✅ Contratos compilados${NC}"
echo ""

# Ejecutar script de deployment
echo -e "${BLUE}🚀 Desplegando nuevo contrato Identity...${NC}"
echo ""

forge script script/DeployNewIdentity.s.sol:DeployNewIdentity \
    --rpc-url "$RPC_URL" \
    --broadcast \
    --sig "run(address,address,address,address)" \
    "$WALLET_ADDRESS" \
    "$IDENTITY_REGISTRY" \
    "$TRUSTED_ISSUERS_REGISTRY" \
    "$DEPLOYER_ADDRESS"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Deployment completado exitosamente!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}📝 Próximos pasos:${NC}"
    if [ "$DEPLOYER_ADDRESS" != "$WALLET_ADDRESS" ]; then
        echo -e "   1. Conecta el wallet ${WALLET_ADDRESS} en la aplicación"
        echo -e "   2. Ve a la página de Identity Management"
        echo -e "   3. Usa 'Configure TrustedIssuersRegistry' para configurar:"
        echo -e "      ${TRUSTED_ISSUERS_REGISTRY}"
    else
        echo -e "   ✓ Todo está configurado correctamente!"
        echo -e "   Puedes usar el nuevo contrato Identity ahora."
    fi
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ Error en el deployment${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi

