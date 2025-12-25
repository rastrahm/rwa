#!/bin/bash

# Script para iniciar MongoDB manualmente
# Uso: ./scripts/start-mongodb.sh

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando MongoDB...${NC}"

# Verificar si MongoDB ya está corriendo
if systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "${GREEN}✓ MongoDB ya está corriendo${NC}"
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

# Iniciar MongoDB
echo -e "${YELLOW}Iniciando servicio MongoDB...${NC}"
if sudo systemctl start mongod; then
    echo -e "${GREEN}✓ MongoDB iniciado exitosamente${NC}"
    
    # Esperar un momento para que MongoDB esté listo
    sleep 2
    
    # Verificar que esté corriendo
    if systemctl is-active --quiet mongod; then
        echo -e "${GREEN}✓ MongoDB está activo y corriendo${NC}"
        
        # Habilitar para que arranque automáticamente
        echo -e "${YELLOW}Habilitando arranque automático...${NC}"
        if sudo systemctl enable mongod; then
            echo -e "${GREEN}✓ MongoDB habilitado para arranque automático${NC}"
        else
            echo -e "${YELLOW}⚠ No se pudo habilitar el arranque automático${NC}"
        fi
        
        # Verificar conexión
        echo -e "${YELLOW}Verificando conexión...${NC}"
        if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
            echo -e "${GREEN}✓ MongoDB responde correctamente${NC}"
        else
            echo -e "${YELLOW}⚠ MongoDB iniciado pero no responde aún. Espera unos segundos.${NC}"
        fi
        
        exit 0
    else
        echo -e "${RED}✗ MongoDB no se pudo iniciar correctamente${NC}"
        echo -e "${YELLOW}Revisa los logs con: sudo journalctl -u mongod -n 50${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Error al iniciar MongoDB${NC}"
    echo -e "${YELLOW}Revisa los logs con: sudo journalctl -u mongod -n 50${NC}"
    exit 1
fi

