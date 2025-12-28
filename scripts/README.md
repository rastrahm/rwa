# Scripts de Despliegue y Configuración

Este directorio contiene scripts útiles para desplegar y gestionar la plataforma RWA.

## Scripts Disponibles

### `deploy-and-start.sh`
Script principal que despliega los contratos a Anvil y arranca todas las interfaces web.

**Uso:**
```bash
./scripts/deploy-and-start.sh
```

**Funcionalidades:**
- Verifica que Anvil esté corriendo
- Verifica e inicia MongoDB si es necesario
- Compila los contratos Solidity
- Despliega los contratos a Anvil
- Extrae las direcciones de los contratos
- Actualiza los archivos `.env.local` de cada proyecto
- Inicia las interfaces web (identity, trusted-issuers, token-factory)

### `start-mongodb.sh`
Script para iniciar MongoDB manualmente.

**Uso:**
```bash
./scripts/start-mongodb.sh
```

**Funcionalidades:**
- Verifica si MongoDB ya está corriendo
- Inicia el servicio MongoDB
- Habilita el arranque automático
- Verifica que MongoDB responda correctamente

**Nota:** Requiere permisos sudo.

### `start-anvil.sh`
Script para iniciar Anvil con configuración optimizada para desarrollo.

**Uso:**
```bash
./scripts/start-anvil.sh
```

**Funcionalidades:**
- Inicia Anvil en el puerto 8545
- Configura chain ID 31337 (Anvil por defecto)
- Block time de 1 segundo para desarrollo rápido
- Gas limit alto para permitir transacciones complejas

**Nota sobre errores de `decimals()`:**
Si ves errores como `0x313ce567` o `decimals()` en los logs de Anvil, **es normal y no afecta la funcionalidad**. Estos errores son causados por MetaMask u otras extensiones del navegador que intentan detectar automáticamente si una dirección es un token ERC20. Puedes ignorarlos de forma segura.

### `check-mongodb.sh`
Script para verificar el estado de MongoDB e intentar iniciarlo si es necesario.

**Uso:**
```bash
./scripts/check-mongodb.sh
```

**Funcionalidades:**
- Verifica si MongoDB está corriendo
- Intenta iniciar MongoDB si no está corriendo
- Habilita el arranque automático si es posible

**Nota:** Requiere permisos sudo para iniciar MongoDB.

### `clean-mongodb.sh`
Script para limpiar todas las colecciones de la base de datos MongoDB.

**Uso:**
```bash
./scripts/clean-mongodb.sh
```

**Funcionalidades:**
- Lista todas las colecciones existentes y su cantidad de documentos
- Elimina todos los documentos de todas las colecciones (excepto colecciones del sistema)
- Muestra un resumen de documentos eliminados

**⚠️ ADVERTENCIA:** Este script elimina TODOS los datos de la base de datos. Úsalo con precaución.

**Nota:** Requiere que MongoDB esté corriendo y que `mongosh` o `mongo` estén instalados.

### `start-web.sh`
Script para iniciar solo las interfaces web (sin desplegar contratos).

**Uso:**
```bash
./scripts/start-web.sh
```

**Funcionalidades:**
- Verifica que Anvil esté corriendo
- Inicia las interfaces web (identity, trusted-issuers, token-factory)
- Usa Node.js v22 (a través de nvm)

### `update-env.sh`
Script auxiliar para actualizar manualmente los archivos `.env.local`.

**Uso:**
```bash
./scripts/update-env.sh
```

## Configuración de MongoDB

### Iniciar MongoDB Manualmente

Si MongoDB no está corriendo, puedes iniciarlo de varias formas:

1. **Usando el script:**
   ```bash
   ./scripts/start-mongodb.sh
   ```

2. **Usando systemctl:**
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod  # Para arranque automático
   ```

3. **Verificar estado:**
   ```bash
   systemctl status mongod
   ```

### Verificar Conexión

Para verificar que MongoDB esté funcionando correctamente:

```bash
mongosh --eval "db.adminCommand('ping')"
```

### Configuración de Conexión

La URI de conexión a MongoDB se configura en:
- `web/shared/lib/env.ts` (valor por defecto: `mongodb://localhost:27017/rwa-platform`)
- Archivos `.env.local` de cada proyecto (variable `MONGODB_URI`)

## Requisitos

- **Anvil**: Debe estar corriendo en `http://localhost:8545`
- **MongoDB**: Debe estar instalado y corriendo (opcional, pero recomendado)
- **Node.js**: Versión 22 (se usa automáticamente a través de nvm)
- **Foundry**: Para compilar y desplegar contratos

## Solución de Problemas

### MongoDB no inicia

1. Verifica que MongoDB esté instalado:
   ```bash
   which mongod
   ```

2. Revisa los logs:
   ```bash
   sudo journalctl -u mongod -n 50
   ```

3. Verifica permisos del directorio de datos:
   ```bash
   ls -la /var/lib/mongodb
   ```

### Error de conexión a MongoDB

1. Verifica que MongoDB esté corriendo:
   ```bash
   systemctl status mongod
   ```

2. Verifica que el puerto 27017 esté abierto:
   ```bash
   netstat -tuln | grep 27017
   ```

3. Verifica la URI de conexión en los archivos `.env.local`
