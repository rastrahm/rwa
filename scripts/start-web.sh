#!/bin/bash

# Script para arrancar solo las interfaces web (sin desplegar contratos)
# Uso: ./scripts/start-web.sh

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="$PROJECT_ROOT/web"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RWA Platform - Start Web Interfaces${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Función para arrancar una interfaz
start_interface() {
    local name=$1
    local port=$2
    local dir="$WEB_DIR/$name"
    
    if [ ! -d "$dir" ]; then
        echo -e "  ${RED}✗ Directorio $name no encontrado${NC}"
        return 1
    fi
    
    cd "$dir"
    
    # Verificar si ya está corriendo
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠ $name ya está corriendo en puerto $port${NC}"
        return 0
    fi
    
    # Cargar nvm y usar Node.js v22
    echo -e "  ${YELLOW}Configurando Node.js v22...${NC}"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 2>/dev/null || true
    nvm use v22 2>/dev/null || {
        echo -e "  ${RED}Error: No se pudo cambiar a Node.js v22${NC}"
        echo -e "  ${YELLOW}Verifica que nvm esté instalado y que Node.js v22 esté disponible${NC}"
        echo -e "  ${YELLOW}Instala con: nvm install 22 && nvm use 22${NC}"
        return 1
    }
    
    # Verificar versión de Node.js
    NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
    echo -e "  ${GREEN}Usando Node.js: $NODE_VERSION${NC}"
    
    npm run dev > "/tmp/rwa-$name.log" 2>&1 &
    local pid=$!
    
    # Esperar un poco para verificar que arrancó
    sleep 3
    if kill -0 $pid 2>/dev/null; then
        echo -e "  ${GREEN}✓ $name arrancado en puerto $port (PID: $pid)${NC}"
        return 0
    else
        echo -e "  ${RED}✗ Error al arrancar $name${NC}"
        cat "/tmp/rwa-$name.log" | tail -20
        return 1
    fi
}

echo -e "${YELLOW}Arrancando interfaces web...${NC}"

start_interface "identity" "4001"
start_interface "trusted-issuers" "4002"
start_interface "token-factory" "4003"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Interfaces arrancadas!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Interfaces disponibles:${NC}"
echo -e "  • Identity Management:      http://localhost:4001"
echo -e "  • Trusted Issuers:          http://localhost:4002"
echo -e "  • Token Factory & Marketplace: http://localhost:4003\n"

echo -e "${YELLOW}Para detener las interfaces:${NC}"
echo -e "  pkill -f 'next dev'\n"

echo -e "${YELLOW}Logs de las interfaces:${NC}"
echo -e "  • Identity:       tail -f /tmp/rwa-identity.log"
echo -e "  • Trusted Issuers: tail -f /tmp/rwa-trusted-issuers.log"
echo -e "  • Token Factory:  tail -f /tmp/rwa-token-factory.log\n"

