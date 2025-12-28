# Deploy New Identity Contract

Este script despliega un nuevo contrato Identity con la función `setTrustedIssuersRegistry` y lo actualiza en el IdentityRegistry existente.

## Problema Resuelto

El contrato Identity desplegado anteriormente no tiene la función `setTrustedIssuersRegistry`, lo que causa errores al intentar configurar el TrustedIssuersRegistry. Este script resuelve el problema desplegando un nuevo contrato Identity con todas las funciones necesarias.

## Requisitos Previos

1. **Foundry instalado**: `forge --version`
2. **Anvil corriendo** (o red configurada): `anvil` o tu RPC URL
3. **Variables de entorno configuradas** en `.env.local`:
   - `NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS` o `IDENTITY_REGISTRY_ADDRESS`
   - `NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS` o `TRUSTED_ISSUERS_REGISTRY_ADDRESS`

## Uso

### Opción 1: Usar el script bash (Recomendado)

```bash
# Desde la raíz del proyecto
./scripts/deploy-new-identity.sh
```

El script:
- Carga las variables de entorno desde `.env.local`
- Compila los contratos
- Despliega el nuevo Identity
- Lo registra/actualiza en el IdentityRegistry
- Configura el TrustedIssuersRegistry (si el deployer es el owner)

### Opción 2: Usar Forge directamente

```bash
cd sc

# Con parámetros explícitos
forge script script/DeployNewIdentity.s.sol:DeployNewIdentity \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --sig "run(address,address,address,address)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \  # Wallet address (owner)
  0x... \  # IdentityRegistry address
  0x... \  # TrustedIssuersRegistry address
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266   # Deployer address
```

### Opción 3: Usar variables de entorno

```bash
cd sc

export WALLET_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
export IDENTITY_REGISTRY=0x...
export TRUSTED_ISSUERS_REGISTRY=0x...
export DEPLOYER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

forge script script/DeployNewIdentity.s.sol:DeployNewIdentity \
  --rpc-url http://localhost:8545 \
  --broadcast
```

## Parámetros

- **walletAddress**: Dirección del wallet que será el owner del nuevo contrato Identity
- **identityRegistryAddress**: Dirección del contrato IdentityRegistry existente
- **trustedIssuersRegistryAddress**: Dirección del contrato TrustedIssuersRegistry a configurar
- **deployerAddress**: Dirección que ejecutará el deployment (debe tener permisos en IdentityRegistry)

## Qué Hace el Script

1. **Despliega nuevo Identity**: Crea un nuevo contrato Identity con el wallet especificado como owner
2. **Registra/Actualiza en IdentityRegistry**: 
   - Si el wallet ya está registrado, actualiza el Identity
   - Si no está registrado, lo registra
3. **Configura TrustedIssuersRegistry**: 
   - Si el deployer es el mismo que el wallet owner, configura automáticamente
   - Si no, muestra instrucciones para configurarlo manualmente

## Verificación

Después del deployment, verifica que:

1. El nuevo Identity está registrado en IdentityRegistry:
   ```bash
   # En la aplicación web, ve a Identity Management
   # Deberías ver el nuevo contrato Identity
   ```

2. El TrustedIssuersRegistry está configurado:
   ```bash
   # Si el deployer no era el owner, ve a Identity Management
   # Usa "Configure TrustedIssuersRegistry" para configurarlo
   ```

## Notas Importantes

- **Claims existentes**: Si el wallet tenía claims en el Identity anterior, estos NO se migran automáticamente. Necesitarás agregarlos nuevamente al nuevo contrato.
- **Owner del IdentityRegistry**: El deployer debe ser el owner del IdentityRegistry para poder registrar/actualizar identidades.
- **Gas**: Asegúrate de tener suficiente ETH en el deployer address para pagar el gas.

## Solución de Problemas

### Error: "Invalid wallet address"
- Verifica que la dirección del wallet sea válida (no address(0))

### Error: "Invalid IdentityRegistry address"
- Verifica que el IdentityRegistry esté desplegado y la dirección sea correcta
- Verifica que el deployer sea el owner del IdentityRegistry

### Error: "Identity verification failed"
- Esto no debería ocurrir, pero si ocurre, verifica que el IdentityRegistry se actualizó correctamente

### El TrustedIssuersRegistry no se configuró automáticamente
- Esto es normal si el deployer no es el wallet owner
- Ve a Identity Management en la aplicación web y usa "Configure TrustedIssuersRegistry"

