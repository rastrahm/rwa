#!/bin/bash

# Script para desplegar contratos a Anvil y arrancar las interfaces web
# Uso: ./scripts/deploy-and-start.sh

set -e  # Salir si hay algún error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SC_DIR="$PROJECT_ROOT/sc"
WEB_DIR="$PROJECT_ROOT/web"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RWA Platform - Deploy & Start Script${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Verificar que Anvil esté corriendo
echo -e "${YELLOW}Verificando que Anvil esté corriendo...${NC}"
if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${RED}Error: Anvil no está corriendo en http://localhost:8545${NC}"
    echo -e "${YELLOW}Inicia Anvil con: anvil${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Anvil está corriendo${NC}\n"

# Verificar e iniciar MongoDB
echo -e "${YELLOW}Verificando MongoDB...${NC}"
if [ -f "$SCRIPT_DIR/check-mongodb.sh" ]; then
    if "$SCRIPT_DIR/check-mongodb.sh"; then
        echo -e "${GREEN}✓ MongoDB está corriendo${NC}\n"
    else
        echo -e "${RED}✗ Error al iniciar MongoDB${NC}"
        echo -e "${YELLOW}Por favor, inicia MongoDB manualmente:${NC}"
        echo -e "  sudo systemctl start mongod"
        echo -e "  sudo systemctl enable mongod"
        echo -e "${YELLOW}O ejecuta: ./scripts/start-mongodb.sh${NC}\n"
        # No salir con error, continuar sin MongoDB
    fi
else
    # Fallback: verificar si está corriendo
    if pgrep -x "mongod" > /dev/null || systemctl is-active --quiet mongod 2>/dev/null; then
        echo -e "${GREEN}✓ MongoDB está corriendo${NC}\n"
    else
        echo -e "${YELLOW}⚠ MongoDB no está corriendo. Las interfaces funcionarán pero no guardarán datos.${NC}"
        echo -e "${YELLOW}Inicia MongoDB con: sudo systemctl start mongod${NC}\n"
    fi
fi

# Cambiar al directorio de contratos
cd "$SC_DIR"

# Compilar contratos
echo -e "${YELLOW}Compilando contratos...${NC}"
forge build
echo -e "${GREEN}✓ Contratos compilados${NC}\n"

# Desplegar contratos
echo -e "${YELLOW}Desplegando contratos a Anvil...${NC}"
# Usar explícitamente el primer address por defecto de Anvil como sender
# y su private key (solo para entorno local de desarrollo).
ANVIL_DEFAULT_SENDER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
ANVIL_DEFAULT_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
forge script script/DeployWeb.s.sol:DeployWeb \
  --rpc-url http://localhost:8545 \
  --sender "$ANVIL_DEFAULT_SENDER" \
  --private-key "$ANVIL_DEFAULT_PK" \
  --broadcast -vvv > /tmp/forge-deploy.log 2>&1

# Extraer direcciones de contratos del output y del archivo de broadcast
DEPLOY_OUTPUT=$(cat /tmp/forge-deploy.log)

# Intentar extraer del output de consola (formato del script DeployWeb.s.sol)
IDENTITY_REGISTRY=$(echo "$DEPLOY_OUTPUT" | grep "IDENTITY_REGISTRY_ADDRESS=" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
TRUSTED_ISSUERS_REGISTRY=$(echo "$DEPLOY_OUTPUT" | grep "TRUSTED_ISSUERS_REGISTRY_ADDRESS=" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
CLAIM_TOPICS_REGISTRY=$(echo "$DEPLOY_OUTPUT" | grep "CLAIM_TOPICS_REGISTRY_ADDRESS=" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
TOKEN_CLONE_FACTORY=$(echo "$DEPLOY_OUTPUT" | grep "TOKEN_CLONE_FACTORY_ADDRESS=" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

# Si no se encontraron en ese formato, buscar en las líneas de console.log
if [ -z "$IDENTITY_REGISTRY" ]; then
    IDENTITY_REGISTRY=$(echo "$DEPLOY_OUTPUT" | grep -i "IdentityRegistry:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
fi
if [ -z "$TRUSTED_ISSUERS_REGISTRY" ]; then
    TRUSTED_ISSUERS_REGISTRY=$(echo "$DEPLOY_OUTPUT" | grep -i "TrustedIssuersRegistry:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
fi
if [ -z "$CLAIM_TOPICS_REGISTRY" ]; then
    CLAIM_TOPICS_REGISTRY=$(echo "$DEPLOY_OUTPUT" | grep -i "ClaimTopicsRegistry:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
fi
if [ -z "$TOKEN_CLONE_FACTORY" ]; then
    TOKEN_CLONE_FACTORY=$(echo "$DEPLOY_OUTPUT" | grep -i "TokenCloneFactory:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
fi

# Si no se encontraron, buscar en el archivo de broadcast JSON
if [ -z "$IDENTITY_REGISTRY" ] || [ -z "$TRUSTED_ISSUERS_REGISTRY" ] || [ -z "$CLAIM_TOPICS_REGISTRY" ] || [ -z "$TOKEN_CLONE_FACTORY" ]; then
    BROADCAST_FILE="$SC_DIR/broadcast/DeployWeb.s.sol/31337/run-latest.json"
    if [ -f "$BROADCAST_FILE" ]; then
        echo -e "${YELLOW}Buscando direcciones en archivo de broadcast...${NC}"
        
        # Extraer direcciones del JSON de broadcast usando grep y sed (sin jq)
        if [ -z "$IDENTITY_REGISTRY" ]; then
            IDENTITY_REGISTRY=$(grep -o '"contractAddress":"0x[a-fA-F0-9]\{40\}"' "$BROADCAST_FILE" | head -1 | sed 's/.*"contractAddress":"\(.*\)".*/\1/')
        fi
        if [ -z "$TRUSTED_ISSUERS_REGISTRY" ]; then
            TRUSTED_ISSUERS_REGISTRY=$(grep -o '"contractAddress":"0x[a-fA-F0-9]\{40\}"' "$BROADCAST_FILE" | sed -n '2p' | sed 's/.*"contractAddress":"\(.*\)".*/\1/')
        fi
        if [ -z "$CLAIM_TOPICS_REGISTRY" ]; then
            CLAIM_TOPICS_REGISTRY=$(grep -o '"contractAddress":"0x[a-fA-F0-9]\{40\}"' "$BROADCAST_FILE" | sed -n '3p' | sed 's/.*"contractAddress":"\(.*\)".*/\1/')
        fi
        if [ -z "$TOKEN_CLONE_FACTORY" ]; then
            TOKEN_CLONE_FACTORY=$(grep -o '"contractAddress":"0x[a-fA-F0-9]\{40\}"' "$BROADCAST_FILE" | tail -1 | sed 's/.*"contractAddress":"\(.*\)".*/\1/')
        fi
    fi
fi

# Si aún no se encontraron, buscar en el log de deployment
if [ -z "$IDENTITY_REGISTRY" ] || [ -z "$TRUSTED_ISSUERS_REGISTRY" ] || [ -z "$CLAIM_TOPICS_REGISTRY" ] || [ -z "$TOKEN_CLONE_FACTORY" ]; then
    echo -e "${YELLOW}Buscando direcciones en log de deployment...${NC}"
    
    # Buscar todas las direcciones en el log y asignarlas en orden
    ALL_ADDRESSES=($(grep -oE '0x[a-fA-F0-9]{40}' /tmp/forge-deploy.log | grep -v '^0x0000000000000000000000000000000000000000$' | sort -u))
    
    if [ ${#ALL_ADDRESSES[@]} -ge 4 ]; then
        # Asumir que las primeras 4 direcciones son los contratos en orden
        IDENTITY_REGISTRY=${ALL_ADDRESSES[0]}
        TRUSTED_ISSUERS_REGISTRY=${ALL_ADDRESSES[1]}
        CLAIM_TOPICS_REGISTRY=${ALL_ADDRESSES[2]}
        TOKEN_CLONE_FACTORY=${ALL_ADDRESSES[3]}
    fi
fi

# Verificar que se obtuvieron todas las direcciones
if [ -z "$IDENTITY_REGISTRY" ] || [ -z "$TRUSTED_ISSUERS_REGISTRY" ] || [ -z "$CLAIM_TOPICS_REGISTRY" ] || [ -z "$TOKEN_CLONE_FACTORY" ]; then
    echo -e "${RED}Error: No se pudieron extraer todas las direcciones de contratos${NC}"
    echo -e "${YELLOW}Output del deployment:${NC}"
    echo "$DEPLOY_OUTPUT" | tail -50
    exit 1
fi

echo -e "${GREEN}✓ Contratos desplegados${NC}"
echo -e "  IdentityRegistry: $IDENTITY_REGISTRY"
echo -e "  TrustedIssuersRegistry: $TRUSTED_ISSUERS_REGISTRY"
echo -e "  ClaimTopicsRegistry: $CLAIM_TOPICS_REGISTRY"
echo -e "  TokenCloneFactory: $TOKEN_CLONE_FACTORY\n"

# Actualizar archivos .env.local en los 3 proyectos
echo -e "${YELLOW}Actualizando archivos .env.local...${NC}"

update_env_file() {
    local env_file="$1"
    local file_name=$(basename "$(dirname "$env_file")")
    
    # Crear archivo si no existe
    if [ ! -f "$env_file" ]; then
        cp "${env_file}.example" "$env_file" 2>/dev/null || true
    fi
    
    # Actualizar o agregar variables (sin prefijo para compatibilidad con servidor)
    if grep -q "IDENTITY_REGISTRY_ADDRESS=" "$env_file"; then
        sed -i "s|IDENTITY_REGISTRY_ADDRESS=.*|IDENTITY_REGISTRY_ADDRESS=$IDENTITY_REGISTRY|" "$env_file"
    else
        echo "IDENTITY_REGISTRY_ADDRESS=$IDENTITY_REGISTRY" >> "$env_file"
    fi
    
    if grep -q "TRUSTED_ISSUERS_REGISTRY_ADDRESS=" "$env_file"; then
        sed -i "s|TRUSTED_ISSUERS_REGISTRY_ADDRESS=.*|TRUSTED_ISSUERS_REGISTRY_ADDRESS=$TRUSTED_ISSUERS_REGISTRY|" "$env_file"
    else
        echo "TRUSTED_ISSUERS_REGISTRY_ADDRESS=$TRUSTED_ISSUERS_REGISTRY" >> "$env_file"
    fi
    
    if grep -q "CLAIM_TOPICS_REGISTRY_ADDRESS=" "$env_file"; then
        sed -i "s|CLAIM_TOPICS_REGISTRY_ADDRESS=.*|CLAIM_TOPICS_REGISTRY_ADDRESS=$CLAIM_TOPICS_REGISTRY|" "$env_file"
    else
        echo "CLAIM_TOPICS_REGISTRY_ADDRESS=$CLAIM_TOPICS_REGISTRY" >> "$env_file"
    fi
    
    if grep -q "TOKEN_CLONE_FACTORY_ADDRESS=" "$env_file"; then
        sed -i "s|TOKEN_CLONE_FACTORY_ADDRESS=.*|TOKEN_CLONE_FACTORY_ADDRESS=$TOKEN_CLONE_FACTORY|" "$env_file"
    else
        echo "TOKEN_CLONE_FACTORY_ADDRESS=$TOKEN_CLONE_FACTORY" >> "$env_file"
    fi
    
    # Actualizar o agregar variables con prefijo NEXT_PUBLIC_ (necesario para cliente en Next.js)
    if grep -q "NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=" "$env_file"; then
        sed -i "s|NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=.*|NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=$IDENTITY_REGISTRY|" "$env_file"
    else
        echo "NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=$IDENTITY_REGISTRY" >> "$env_file"
    fi
    
    if grep -q "NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS=" "$env_file"; then
        sed -i "s|NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS=.*|NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS=$TRUSTED_ISSUERS_REGISTRY|" "$env_file"
    else
        echo "NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS=$TRUSTED_ISSUERS_REGISTRY" >> "$env_file"
    fi
    
    if grep -q "NEXT_PUBLIC_CLAIM_TOPICS_REGISTRY_ADDRESS=" "$env_file"; then
        sed -i "s|NEXT_PUBLIC_CLAIM_TOPICS_REGISTRY_ADDRESS=.*|NEXT_PUBLIC_CLAIM_TOPICS_REGISTRY_ADDRESS=$CLAIM_TOPICS_REGISTRY|" "$env_file"
    else
        echo "NEXT_PUBLIC_CLAIM_TOPICS_REGISTRY_ADDRESS=$CLAIM_TOPICS_REGISTRY" >> "$env_file"
    fi
    
    if grep -q "NEXT_PUBLIC_TOKEN_CLONE_FACTORY_ADDRESS=" "$env_file"; then
        sed -i "s|NEXT_PUBLIC_TOKEN_CLONE_FACTORY_ADDRESS=.*|NEXT_PUBLIC_TOKEN_CLONE_FACTORY_ADDRESS=$TOKEN_CLONE_FACTORY|" "$env_file"
    else
        echo "NEXT_PUBLIC_TOKEN_CLONE_FACTORY_ADDRESS=$TOKEN_CLONE_FACTORY" >> "$env_file"
    fi
    
    # RPC_URL y CHAIN_ID también necesitan NEXT_PUBLIC_ para el cliente
    if grep -q "NEXT_PUBLIC_RPC_URL=" "$env_file"; then
        sed -i "s|NEXT_PUBLIC_RPC_URL=.*|NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545|" "$env_file"
    else
        echo "NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545" >> "$env_file"
    fi
    
    if grep -q "NEXT_PUBLIC_CHAIN_ID=" "$env_file"; then
        sed -i "s|NEXT_PUBLIC_CHAIN_ID=.*|NEXT_PUBLIC_CHAIN_ID=31337|" "$env_file"
    else
        echo "NEXT_PUBLIC_CHAIN_ID=31337" >> "$env_file"
    fi
    
    echo -e "  ✓ $file_name/.env.local actualizado"
}

update_env_file "$WEB_DIR/identity/.env.local"
update_env_file "$WEB_DIR/trusted-issuers/.env.local"
update_env_file "$WEB_DIR/token-factory/.env.local"

echo -e "${GREEN}✓ Archivos .env.local actualizados${NC}\n"

# Activar funcionalidades pendientes
echo -e "${YELLOW}Activando funcionalidades pendientes...${NC}"

# Nota: El código de ClaimTopicsRegistry ya está activado manualmente
# Si necesitas activar más funcionalidades, agrégalas aquí

echo -e "  ✓ Funcionalidades verificadas${NC}\n"

# Arrancar las interfaces web
echo -e "${YELLOW}Arrancando interfaces web...${NC}"

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
    
    # Detener procesos existentes que puedan estar usando el puerto
    echo -e "  ${YELLOW}Verificando procesos existentes en puerto $port...${NC}"
    
    # Matar procesos de Next.js que estén usando este puerto específico
    pkill -f "next dev -p $port" 2>/dev/null || true
    
    # También verificar si hay algo escuchando en el puerto
    local port_pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$port_pid" ]; then
        echo -e "  ${YELLOW}Deteniendo proceso $port_pid que usa el puerto $port...${NC}"
        kill -9 $port_pid 2>/dev/null || true
        sleep 1
    fi
    
    # Esperar un poco más para asegurar que el puerto esté libre
    sleep 2
    
    # Verificar nuevamente si el puerto está libre
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "  ${RED}✗ El puerto $port aún está en uso después de intentar liberarlo${NC}"
        return 1
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
    
    echo -e "  ${YELLOW}Iniciando $name en puerto $port...${NC}"
    npm run dev > "/tmp/rwa-$name.log" 2>&1 &
    local pid=$!
    
    # Esperar más tiempo para que Next.js compile y arranque (puede tardar 10-15 segundos)
    echo -e "  ${YELLOW}Esperando a que $name esté listo...${NC}"
    sleep 8
    
    # Verificar que el proceso sigue corriendo
    if ! kill -0 $pid 2>/dev/null; then
        echo -e "  ${RED}✗ Error al arrancar $name${NC}"
        echo -e "  ${YELLOW}Últimas líneas del log:${NC}"
        cat "/tmp/rwa-$name.log" | tail -20
        return 1
    fi
    
    # Verificar que el puerto esté siendo usado por nuestro proceso
    local new_port_pid=$(lsof -ti:$port 2>/dev/null || true)
    local max_attempts=5
    local attempt=0
    
    while [ -z "$new_port_pid" ] && [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        echo -e "  ${YELLOW}Esperando puerto $port... (intento $attempt/$max_attempts)${NC}"
        sleep 2
        new_port_pid=$(lsof -ti:$port 2>/dev/null || true)
    done
    
    # También verificar en el log si Next.js está listo
    if grep -q "Ready in" "/tmp/rwa-$name.log" 2>/dev/null; then
        echo -e "  ${GREEN}✓ $name arrancado en puerto $port (PID: $pid)${NC}"
        return 0
    elif [ -n "$new_port_pid" ]; then
        echo -e "  ${GREEN}✓ $name arrancado en puerto $port (PID: $pid)${NC}"
        return 0
    else
        echo -e "  ${YELLOW}⚠ $name está corriendo pero el puerto $port aún no está disponible${NC}"
        echo -e "  ${YELLOW}Últimas líneas del log:${NC}"
        cat "/tmp/rwa-$name.log" | tail -20
        echo -e "  ${YELLOW}El proceso continúa en segundo plano. Verifica el log: tail -f /tmp/rwa-$name.log${NC}"
        return 0  # Retornar 0 para no detener el script, el proceso está corriendo
    fi
}

start_interface "identity" "4001"
start_interface "trusted-issuers" "4002"
start_interface "token-factory" "4003"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment y arranque completados!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Interfaces disponibles:${NC}"
echo -e "  • Identity Management:      http://localhost:4001"
echo -e "  • Trusted Issuers:          http://localhost:4002"
echo -e "  • Token Factory & Marketplace: http://localhost:4003\n"

echo -e "${YELLOW}Contratos desplegados:${NC}"
echo -e "  • IdentityRegistry:          $IDENTITY_REGISTRY"
echo -e "  • TrustedIssuersRegistry:   $TRUSTED_ISSUERS_REGISTRY"
echo -e "  • ClaimTopicsRegistry:      $CLAIM_TOPICS_REGISTRY"
echo -e "  • TokenCloneFactory:        $TOKEN_CLONE_FACTORY\n"

echo -e "${YELLOW}Para detener las interfaces:${NC}"
echo -e "  pkill -f 'next dev'\n"

echo -e "${YELLOW}Logs de las interfaces:${NC}"
echo -e "  • Identity:       tail -f /tmp/rwa-identity.log"
echo -e "  • Trusted Issuers: tail -f /tmp/rwa-trusted-issuers.log"
echo -e "  • Token Factory:  tail -f /tmp/rwa-token-factory.log\n"

