// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Identity} from "../src/Identity.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";

/**
 * @title DeployNewIdentity
 * @dev Script para desplegar un nuevo contrato Identity con la función setTrustedIssuersRegistry
 * y actualizarlo en el IdentityRegistry existente
 * 
 * Este script:
 * 1. Despliega un nuevo contrato Identity con el wallet especificado como owner
 * 2. Actualiza el IdentityRegistry para usar el nuevo contrato Identity
 * 3. Configura el TrustedIssuersRegistry en el nuevo contrato Identity
 * 
 * USO:
 * forge script script/DeployNewIdentity.s.sol:DeployNewIdentity \
 *   --rpc-url http://localhost:8545 \
 *   --broadcast \
 *   --sig "run(address,address,address,address)" \
 *   <WALLET_ADDRESS> <IDENTITY_REGISTRY_ADDRESS> <TRUSTED_ISSUERS_REGISTRY_ADDRESS> <DEPLOYER_ADDRESS>
 * 
 * O usar las variables de entorno:
 * WALLET_ADDRESS=0x... IDENTITY_REGISTRY=0x... TRUSTED_ISSUERS_REGISTRY=0x... \
 * forge script script/DeployNewIdentity.s.sol:DeployNewIdentity --rpc-url http://localhost:8545 --broadcast
 */
contract DeployNewIdentity is Script {
    function run(
        address walletAddress,
        address identityRegistryAddress,
        address trustedIssuersRegistryAddress,
        address deployerAddress
    ) external {
        // Validar parámetros
        require(walletAddress != address(0), "Invalid wallet address");
        require(identityRegistryAddress != address(0), "Invalid IdentityRegistry address");
        require(trustedIssuersRegistryAddress != address(0), "Invalid TrustedIssuersRegistry address");
        require(deployerAddress != address(0), "Invalid deployer address");

        vm.startBroadcast(deployerAddress);

        console.log("\n========================================");
        console.log("Deploying New Identity Contract");
        console.log("========================================\n");

        // ============ 1. Desplegar nuevo contrato Identity ============
        console.log("PASO 1: Deploying new Identity contract...");
        console.log("Wallet address (owner):", walletAddress);

        Identity newIdentity = new Identity(walletAddress);
        console.log("New Identity deployed at:", address(newIdentity));

        // ============ 2. Verificar IdentityRegistry ============
        console.log("\nPASO 2: Verifying IdentityRegistry...");
        console.log("IdentityRegistry address:", identityRegistryAddress);

        IdentityRegistry identityRegistry = IdentityRegistry(identityRegistryAddress);

        // Verificar si el wallet ya está registrado
        bool isRegistered = identityRegistry.isRegistered(walletAddress);
        address oldIdentityAddress = address(0);
        
        if (isRegistered) {
            oldIdentityAddress = identityRegistry.getIdentity(walletAddress);
            console.log("Wallet is already registered with Identity:", oldIdentityAddress);
            console.log("Will update to new Identity:", address(newIdentity));
        } else {
            console.log("Wallet is not registered. Will register new Identity.");
        }

        // ============ 3. Registrar o actualizar en IdentityRegistry ============
        console.log("\nPASO 3: Registering/Updating Identity in IdentityRegistry...");

        if (isRegistered) {
            identityRegistry.updateIdentity(walletAddress, address(newIdentity));
            console.log("Identity updated successfully!");
        } else {
            identityRegistry.registerIdentity(walletAddress, address(newIdentity));
            console.log("Identity registered successfully!");
        }

        // ============ 4. Configurar TrustedIssuersRegistry en el nuevo Identity ============
        console.log("\nPASO 4: Configuring TrustedIssuersRegistry in new Identity...");
        console.log("TrustedIssuersRegistry address:", trustedIssuersRegistryAddress);

        // Necesitamos usar el signer del wallet para configurar el TrustedIssuersRegistry
        // Nota: Esto requiere que el wallet sea el owner del Identity
        // Si el deployer es diferente del wallet, el wallet deberá hacer esta configuración manualmente
        if (deployerAddress == walletAddress) {
            newIdentity.setTrustedIssuersRegistry(trustedIssuersRegistryAddress);
            console.log("TrustedIssuersRegistry configured successfully!");
        } else {
            console.log("WARNING: Deployer is not the wallet owner.");
            console.log("The wallet owner must configure TrustedIssuersRegistry manually using:");
            console.log("  identity.setTrustedIssuersRegistry(", trustedIssuersRegistryAddress, ")");
        }

        // ============ 5. Verificación ============
        console.log("\nPASO 5: Verifying deployment...");

        address verifiedIdentity = identityRegistry.getIdentity(walletAddress);
        require(verifiedIdentity == address(newIdentity), "Identity verification failed");
        console.log("[OK] Identity verified in IdentityRegistry");

        address configuredRegistry = newIdentity.trustedIssuersRegistry();
        if (configuredRegistry == trustedIssuersRegistryAddress) {
            console.log("[OK] TrustedIssuersRegistry configured correctly");
        } else {
            console.log("[WARN] TrustedIssuersRegistry not configured (will need manual configuration)");
        }

        // ============ 6. Resumen ============
        console.log("\n========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Wallet address:", walletAddress);
        console.log("New Identity address:", address(newIdentity));
        if (oldIdentityAddress != address(0)) {
            console.log("Old Identity address:", oldIdentityAddress);
        }
        console.log("IdentityRegistry address:", identityRegistryAddress);
        console.log("TrustedIssuersRegistry address:", trustedIssuersRegistryAddress);
        console.log("");
        console.log("Next steps:");
        if (deployerAddress != walletAddress) {
            console.log("1. Connect wallet", walletAddress, "to the application");
            console.log("2. Go to Identity Management page");
            console.log("3. Use 'Configure TrustedIssuersRegistry' to set:", trustedIssuersRegistryAddress);
        } else {
            console.log("[OK] All configuration completed!");
        }
        console.log("\n========================================\n");

        vm.stopBroadcast();
    }

    /**
     * @dev Versión simplificada que usa variables de entorno
     */
    function run() external {
        address walletAddress = vm.envAddress("WALLET_ADDRESS");
        address identityRegistryAddress = vm.envAddress("IDENTITY_REGISTRY");
        address trustedIssuersRegistryAddress = vm.envAddress("TRUSTED_ISSUERS_REGISTRY");
        address deployerAddress = vm.envAddress("DEPLOYER_ADDRESS");

        this.run(
            walletAddress,
            identityRegistryAddress,
            trustedIssuersRegistryAddress,
            deployerAddress
        );
    }
}

