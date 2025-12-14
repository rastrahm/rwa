#!/bin/bash
# deploy-manhattan-apartment.sh
# Script para desplegar el token "Manhattan Apartment 301"

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deploying Manhattan Apartment 301 Token${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "foundry.toml" ]; then
    echo -e "${YELLOW}Error: foundry.toml no encontrado. Asegúrate de estar en el directorio sc/${NC}"
    exit 1
fi

# Configuración (puedes modificar estas variables)
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
BROADCAST="${BROADCAST:-false}"
VERIFY="${VERIFY:-false}"
INTERACTIVE="${INTERACTIVE:-false}"

# Cargar variables de entorno desde .env si existe
if [ -f ".env" ]; then
    echo -e "${BLUE}Cargando variables desde .env...${NC}"
    export $(grep -v '^#' .env | xargs)
fi

# Obtener PRIVATE_KEY de diferentes fuentes (en orden de prioridad)
# 1. Variable de entorno PRIVATE_KEY
# 2. Archivo .env
# 3. Variable de entorno desde shell
PRIVATE_KEY="${PRIVATE_KEY:-}"

# Verificar si se proporcionó private key cuando se necesita broadcast
if [ "$BROADCAST" = "true" ] && [ "$INTERACTIVE" = "false" ]; then
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${YELLOW}Advertencia: PRIVATE_KEY no está configurado${NC}"
        echo -e "${YELLOW}Opciones para configurar PRIVATE_KEY:${NC}"
        echo -e "${YELLOW}  1. Exportar variable: export PRIVATE_KEY=tu_private_key${NC}"
        echo -e "${YELLOW}  2. Crear archivo .env con: PRIVATE_KEY=tu_private_key${NC}"
        echo -e "${YELLOW}  3. Usar modo interactivo: INTERACTIVE=true ./deploy-manhattan-apartment.sh${NC}"
        echo ""
        echo -e "${YELLOW}¿Deseas continuar en modo interactivo? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            INTERACTIVE=true
        else
            echo -e "${YELLOW}Deployment cancelado.${NC}"
            exit 1
        fi
    fi
fi

# Construir comando forge script
CMD="forge script script/DeployManhattanApartment.s.sol:DeployManhattanApartment --rpc-url $RPC_URL"

# Agregar flags opcionales
if [ "$BROADCAST" = "true" ]; then
    CMD="$CMD --broadcast"
    if [ "$INTERACTIVE" = "true" ]; then
        CMD="$CMD --interactive"
        echo -e "${GREEN}Usando modo interactivo para ingresar la clave privada${NC}"
    elif [ ! -z "$PRIVATE_KEY" ]; then
        CMD="$CMD --private-key $PRIVATE_KEY"
    fi
fi

if [ "$VERIFY" = "true" ]; then
    CMD="$CMD --verify"
fi

# Ejecutar comando
echo -e "${GREEN}Ejecutando deployment...${NC}"
echo ""
echo "Comando: $CMD"
echo ""

eval $CMD

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completado${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}NOTAS:${NC}"
echo "1. Configura el Identity System (agrega trusted issuers, claim topics)"
echo "2. Registra y verifica identidades de inversores"
echo "3. Otorga AGENT_ROLE al deployer si aún no lo tiene"
echo "4. Mintea tokens a inversores verificados usando: token.mint(investor, amount)"
echo "5. Prueba transfers entre inversores verificados"
echo ""
echo -e "${BLUE}RECORDATORIOS:${NC}"
echo "- Max Balance por wallet: 100 tokens (1 token = 1% de la propiedad)"
echo "- Max Holders: 10 inversores"
echo "- Transfer Lock: 365 días después de recibir tokens"
echo ""
echo -e "${BLUE}CONFIGURACIÓN DE PRIVATE_KEY:${NC}"
echo "Para hacer broadcast, puedes configurar PRIVATE_KEY de estas formas:"
echo "  1. Variable de entorno: export PRIVATE_KEY=0x..."
echo "  2. Archivo .env: crear .env con PRIVATE_KEY=0x..."
echo "  3. Modo interactivo: INTERACTIVE=true ./deploy-manhattan-apartment.sh"
echo ""
echo -e "${YELLOW}IMPORTANTE:${NC} Nunca commitees tu archivo .env al repositorio!"
echo ""

