#!/bin/bash

# Script para actualizar archivos .env.local con direcciones de contratos
# Uso: ./scripts/update-env.sh <IDENTITY_REGISTRY> <TRUSTED_ISSUERS_REGISTRY> <CLAIM_TOPICS_REGISTRY> <TOKEN_CLONE_FACTORY>

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Directorios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="$PROJECT_ROOT/web"

# Verificar argumentos
if [ $# -lt 4 ]; then
    echo -e "${RED}Error: Faltan argumentos${NC}"
    echo -e "Uso: $0 <IDENTITY_REGISTRY> <TRUSTED_ISSUERS_REGISTRY> <CLAIM_TOPICS_REGISTRY> <TOKEN_CLONE_FACTORY>"
    exit 1
fi

IDENTITY_REGISTRY=$1
TRUSTED_ISSUERS_REGISTRY=$2
CLAIM_TOPICS_REGISTRY=$3
TOKEN_CLONE_FACTORY=$4

# Validar formato de direcciones
validate_address() {
    if [[ ! $1 =~ ^0x[a-fA-F0-9]{40}$ ]]; then
        echo -e "${RED}Error: Dirección inválida: $1${NC}"
        exit 1
    fi
}

validate_address "$IDENTITY_REGISTRY"
validate_address "$TRUSTED_ISSUERS_REGISTRY"
validate_address "$CLAIM_TOPICS_REGISTRY"
validate_address "$TOKEN_CLONE_FACTORY"

echo -e "${GREEN}Actualizando archivos .env.local...${NC}\n"

# Función para actualizar un archivo .env.local
update_env_file() {
    local env_file="$1"
    local file_name=$(basename "$(dirname "$env_file")")
    
    # Crear archivo si no existe
    if [ ! -f "$env_file" ]; then
        if [ -f "${env_file}.example" ]; then
            cp "${env_file}.example" "$env_file"
        else
            touch "$env_file"
        fi
    fi
    
    # Actualizar o agregar variables
    update_env_var "$env_file" "IDENTITY_REGISTRY_ADDRESS" "$IDENTITY_REGISTRY"
    update_env_var "$env_file" "TRUSTED_ISSUERS_REGISTRY_ADDRESS" "$TRUSTED_ISSUERS_REGISTRY"
    update_env_var "$env_file" "CLAIM_TOPICS_REGISTRY_ADDRESS" "$CLAIM_TOPICS_REGISTRY"
    update_env_var "$env_file" "TOKEN_CLONE_FACTORY_ADDRESS" "$TOKEN_CLONE_FACTORY"
    
    echo -e "  ${GREEN}✓${NC} $file_name/.env.local actualizado"
}

# Función para actualizar una variable en .env.local
update_env_var() {
    local file=$1
    local var_name=$2
    local var_value=$3
    
    if grep -q "^${var_name}=" "$file"; then
        # Actualizar variable existente
        sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" "$file"
    else
        # Agregar variable nueva
        echo "${var_name}=${var_value}" >> "$file"
    fi
}

update_env_file "$WEB_DIR/identity/.env.local"
update_env_file "$WEB_DIR/trusted-issuers/.env.local"
update_env_file "$WEB_DIR/token-factory/.env.local"

echo ""
echo -e "${GREEN}✓ Archivos .env.local actualizados${NC}\n"

echo -e "${YELLOW}Direcciones configuradas:${NC}"
echo -e "  IDENTITY_REGISTRY_ADDRESS=$IDENTITY_REGISTRY"
echo -e "  TRUSTED_ISSUERS_REGISTRY_ADDRESS=$TRUSTED_ISSUERS_REGISTRY"
echo -e "  CLAIM_TOPICS_REGISTRY_ADDRESS=$CLAIM_TOPICS_REGISTRY"
echo -e "  TOKEN_CLONE_FACTORY_ADDRESS=$TOKEN_CLONE_FACTORY\n"

