#!/bin/bash

# Script para verificar e iniciar MongoDB
# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Verificando estado de MongoDB...${NC}"

# Verificar si MongoDB está corriendo
if systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "${GREEN}✓ MongoDB está corriendo${NC}"
    exit 0
fi

# Verificar si el servicio existe
if ! systemctl list-unit-files | grep -q mongod.service; then
    echo -e "${RED}✗ Servicio MongoDB no encontrado${NC}"
    echo -e "${YELLOW}Por favor, instala MongoDB:${NC}"
    echo -e "  sudo apt update"
    echo -e "  sudo apt install -y mongodb"
    exit 1
fi

# Intentar iniciar MongoDB
echo -e "${YELLOW}Intentando iniciar MongoDB...${NC}"
if sudo systemctl start mongod 2>/dev/null; then
    echo -e "${GREEN}✓ MongoDB iniciado exitosamente${NC}"
    
    # Esperar un momento para que MongoDB esté listo
    sleep 2
    
    # Verificar que esté corriendo
    if systemctl is-active --quiet mongod; then
        echo -e "${GREEN}✓ MongoDB está activo y corriendo${NC}"
        
        # Habilitar para que arranque automáticamente
        if sudo systemctl enable mongod 2>/dev/null; then
            echo -e "${GREEN}✓ MongoDB habilitado para arranque automático${NC}"
        else
            echo -e "${YELLOW}⚠ No se pudo habilitar el arranque automático (requiere sudo)${NC}"
        fi
        
        exit 0
    else
        echo -e "${RED}✗ MongoDB no se pudo iniciar correctamente${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Error al iniciar MongoDB${NC}"
    echo -e "${YELLOW}Por favor, inicia MongoDB manualmente:${NC}"
    echo -e "  sudo systemctl start mongod"
    echo -e "  sudo systemctl enable mongod"
    exit 1
fi

