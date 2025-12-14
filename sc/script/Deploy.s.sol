// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";
import {Token} from "../src/Token.sol";
import {TokenCloneFactory} from "../src/TokenCloneFactory.sol";
import {MaxBalanceCompliance} from "../src/compliance/MaxBalanceCompliance.sol";
import {MaxHoldersCompliance} from "../src/compliance/MaxHoldersCompliance.sol";
import {TransferLockCompliance} from "../src/compliance/TransferLockCompliance.sol";
import {ComplianceAggregator} from "../src/compliance/ComplianceAggregator.sol";

/**
 * @title DeployScript
 * @dev Script de deployment para el sistema completo RWA Token Platform
 * 
 * Este script despliega todos los contratos necesarios para el sistema:
 * 1. Identity System (Registries)
 * 2. Compliance Modules
 * 3. Token Principal
 * 4. Token Clone Factory (opcional)
 * 
 * USO:
 * forge script script/Deploy.s.sol:DeployScript --rpc-url <RPC_URL> --broadcast --verify
 */
contract DeployScript is Script {
    // ============ Deployment Addresses ============
    
    address public deployer;
    
    // Identity System
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    // Compliance Modules
    MaxBalanceCompliance public maxBalanceCompliance;
    MaxHoldersCompliance public maxHoldersCompliance;
    TransferLockCompliance public transferLockCompliance;
    ComplianceAggregator public complianceAggregator;
    
    // Token
    Token public token;
    
    // Factory (opcional)
    TokenCloneFactory public factory;
    
    // ============ Configuration ============
    
    // Token configuration
    string public constant TOKEN_NAME = "RWA Token";
    string public constant TOKEN_SYMBOL = "RWA";
    uint8 public constant TOKEN_DECIMALS = 18;
    
    // Compliance configuration
    uint256 public constant MAX_BALANCE = 1000000 * 10**18; // 1M tokens
    uint256 public constant MAX_HOLDERS = 1000;
    uint256 public constant TRANSFER_LOCK_PERIOD = 7 days;
    
    function setUp() public {
        deployer = msg.sender;
    }
    
    function run() external {
        vm.startBroadcast(deployer);
        
        // ============ 1. Deploy Identity System ============
        console.log("Deploying Identity System...");
        
        identityRegistry = new IdentityRegistry(deployer);
        console.log("IdentityRegistry deployed at:", address(identityRegistry));
        
        trustedIssuersRegistry = new TrustedIssuersRegistry(deployer);
        console.log("TrustedIssuersRegistry deployed at:", address(trustedIssuersRegistry));
        
        claimTopicsRegistry = new ClaimTopicsRegistry(deployer);
        console.log("ClaimTopicsRegistry deployed at:", address(claimTopicsRegistry));
        
        // ============ 2. Deploy Compliance Modules ============
        console.log("\nDeploying Compliance Modules...");
        
        // Nota: MaxBalanceCompliance y MaxHoldersCompliance necesitan la dirección del token
        // Los desplegaremos después del token, o usaremos direcciones temporales
        
        transferLockCompliance = new TransferLockCompliance(deployer, TRANSFER_LOCK_PERIOD);
        console.log("TransferLockCompliance deployed at:", address(transferLockCompliance));
        
        complianceAggregator = new ComplianceAggregator(deployer);
        console.log("ComplianceAggregator deployed at:", address(complianceAggregator));
        
        // ============ 3. Deploy Token ============
        console.log("\nDeploying Token...");
        
        token = new Token(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            deployer,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        console.log("Token deployed at:", address(token));
        
        // ============ 4. Deploy Compliance Modules que requieren token ============
        console.log("\nDeploying Token-dependent Compliance Modules...");
        
        maxBalanceCompliance = new MaxBalanceCompliance(
            deployer,
            MAX_BALANCE,
            address(token)
        );
        console.log("MaxBalanceCompliance deployed at:", address(maxBalanceCompliance));
        
        maxHoldersCompliance = new MaxHoldersCompliance(
            deployer,
            MAX_HOLDERS,
            address(token)
        );
        console.log("MaxHoldersCompliance deployed at:", address(maxHoldersCompliance));
        
        // ============ 5. Configurar Compliance Aggregator ============
        console.log("\nConfiguring Compliance Aggregator...");
        
        complianceAggregator.addModule(address(token), address(maxBalanceCompliance));
        complianceAggregator.addModule(address(token), address(maxHoldersCompliance));
        complianceAggregator.addModule(address(token), address(transferLockCompliance));
        complianceAggregator.setCurrentToken(address(token));
        
        console.log("Compliance modules added to aggregator");
        
        // ============ 6. Configurar Token con Compliance ============
        console.log("\nConfiguring Token with Compliance...");
        
        // Opción 1: Usar ComplianceAggregator como módulo único
        token.addComplianceModule(address(complianceAggregator));
        
        // Opción 2: Agregar módulos individuales directamente
        // token.addComplianceModule(address(maxBalanceCompliance));
        // token.addComplianceModule(address(maxHoldersCompliance));
        // token.addComplianceModule(address(transferLockCompliance));
        
        console.log("Compliance modules added to token");
        
        // ============ 7. Deploy Factory (opcional) ============
        console.log("\nDeploying Token Clone Factory...");
        
        factory = new TokenCloneFactory(deployer);
        console.log("TokenCloneFactory deployed at:", address(factory));
        console.log("Factory implementation at:", factory.implementation());
        
        // ============ 8. Verificar Deployment ============
        console.log("\n=== Deployment Summary ===");
        console.log("Deployer:", deployer);
        console.log("IdentityRegistry:", address(identityRegistry));
        console.log("TrustedIssuersRegistry:", address(trustedIssuersRegistry));
        console.log("ClaimTopicsRegistry:", address(claimTopicsRegistry));
        console.log("Token:", address(token));
        console.log("MaxBalanceCompliance:", address(maxBalanceCompliance));
        console.log("MaxHoldersCompliance:", address(maxHoldersCompliance));
        console.log("TransferLockCompliance:", address(transferLockCompliance));
        console.log("ComplianceAggregator:", address(complianceAggregator));
        console.log("TokenCloneFactory:", address(factory));
        
        // Verificaciones básicas
        require(address(token) != address(0), "Token deployment failed");
        require(address(identityRegistry) != address(0), "IdentityRegistry deployment failed");
        require(address(trustedIssuersRegistry) != address(0), "TrustedIssuersRegistry deployment failed");
        require(address(claimTopicsRegistry) != address(0), "ClaimTopicsRegistry deployment failed");
        
        console.log("\nDeployment completed successfully!");
        
        vm.stopBroadcast();
    }
}

// Importar console para logging
import {console} from "forge-std/console.sol";

