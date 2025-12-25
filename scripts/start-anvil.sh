#!/bin/bash

# Script para iniciar Anvil con configuración optimizada para desarrollo
# Uso: ./scripts/start-anvil.sh

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Iniciando Anvil...${NC}"
echo -e "${YELLOW}Nota: Los errores de 'decimals()' (0x313ce567) son normales.${NC}"
echo -e "${YELLOW}Son causados por MetaMask intentando detectar tokens ERC20 automáticamente.${NC}"
echo -e "${YELLOW}Estos errores NO afectan la funcionalidad de la aplicación.${NC}\n"

# Iniciar Anvil con configuración optimizada
# - Usar el puerto 8545 (por defecto)
# - Configurar chain ID 31337 (Anvil por defecto)
# - Block time de 1 segundo para desarrollo rápido
# - Gas limit alto para permitir transacciones complejas
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --chain-id 31337 \
  --block-time 1 \
  --gas-limit 12000000 \
  --gas-price 0 \
  --base-fee 0 \
  --timestamp 0

