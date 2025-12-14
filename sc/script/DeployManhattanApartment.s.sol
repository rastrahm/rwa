// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";
import {TokenCloneFactory} from "../src/TokenCloneFactory.sol";
import {TokenCloneable} from "../src/TokenCloneable.sol";
import {MaxBalanceCompliance} from "../src/compliance/MaxBalanceCompliance.sol";
import {MaxHoldersCompliance} from "../src/compliance/MaxHoldersCompliance.sol";
import {TransferLockCompliance} from "../src/compliance/TransferLockCompliance.sol";
import {ComplianceAggregator} from "../src/compliance/ComplianceAggregator.sol";

/**
 * @title DeployManhattanApartment
 * @dev Script de deployment para el ejercicio "Manhattan Apartment 301"
 * 
 * Especificaciones del Token:
 * - Nombre: "Manhattan Apartment 301"
 * - Symbol: "MHT301"
 * - Decimals: 18
 * - Max Balance: 100 tokens (1 token = 1% de la propiedad)
 * - Max Holders: 10 (solo 10 inversores)
 * - Lock Period: 365 días (1 año)
 * 
 * Pasos de Deployment:
 * 1. Deploy TokenCloneFactory
 * 2. Deploy Identity System (Registries)
 * 3. Create token via factory
 * 4. Deploy ComplianceAggregator
 * 5. Deploy y configurar módulos de compliance
 * 6. Añadir compliance al token
 * 7. Mintear tokens de prueba
 * 8. Probar transfers
 * 
 * USO:
 * forge script script/DeployManhattanApartment.s.sol:DeployManhattanApartment --rpc-url <RPC_URL> --broadcast --verify
 */
contract DeployManhattanApartment is Script {
    // ============ Configuration Constants ============
    
    // Token specifications
    string public constant TOKEN_NAME = "Manhattan Apartment 301";
    string public constant TOKEN_SYMBOL = "MHT301";
    uint8 public constant TOKEN_DECIMALS = 18;
    
    // Compliance specifications
    uint256 public constant MAX_BALANCE = 100 * 10**18; // 100 tokens (1 token = 1% de la propiedad)
    uint256 public constant MAX_HOLDERS = 10; // Solo 10 inversores
    uint256 public constant TRANSFER_LOCK_PERIOD = 365 days; // 1 año
    
    // Test addresses (para pruebas)
    address[] private testUsers;
    
    // ============ Deployment Addresses ============
    
    address public deployer;
    
    // Identity System
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    // Factory
    TokenCloneFactory public factory;
    
    // Token
    TokenCloneable public token;
    
    // Compliance
    ComplianceAggregator public complianceAggregator;
    MaxBalanceCompliance public maxBalanceCompliance;
    MaxHoldersCompliance public maxHoldersCompliance;
    TransferLockCompliance public transferLockCompliance;
    
    // ============ Setup ============
    
    function setUp() public {
        deployer = msg.sender;
        
        // Generar direcciones de prueba (opcional, para testing)
        // En producción, estas serían direcciones reales de inversores
        testUsers.push(address(0x1111111111111111111111111111111111111111));
        testUsers.push(address(0x2222222222222222222222222222222222222222));
        testUsers.push(address(0x3333333333333333333333333333333333333333));
    }
    
    // ============ Main Deployment Function ============
    
    function run() external {
        vm.startBroadcast(deployer);
        
        console.log("\n========================================");
        console.log("Deploying Manhattan Apartment 301 Token");
        console.log("========================================\n");
        
        // ============ PASO 1: Deploy TokenCloneFactory ============
        console.log("PASO 1: Deploying TokenCloneFactory...");
        factory = new TokenCloneFactory(deployer);
        console.log("TokenCloneFactory deployed at:", address(factory));
        console.log("Implementation address:", factory.implementation());
        console.log("");
        
        // ============ PASO 2: Deploy Identity System ============
        console.log("PASO 2: Deploying Identity System...");
        
        identityRegistry = new IdentityRegistry(deployer);
        console.log("IdentityRegistry deployed at:", address(identityRegistry));
        
        trustedIssuersRegistry = new TrustedIssuersRegistry(deployer);
        console.log("TrustedIssuersRegistry deployed at:", address(trustedIssuersRegistry));
        
        claimTopicsRegistry = new ClaimTopicsRegistry(deployer);
        console.log("ClaimTopicsRegistry deployed at:", address(claimTopicsRegistry));
        console.log("");
        
        // ============ PASO 3: Create token via factory ============
        console.log("PASO 3: Creating token via factory...");
        console.log("Token Name:", TOKEN_NAME);
        console.log("Token Symbol:", TOKEN_SYMBOL);
        console.log("Token Decimals:", TOKEN_DECIMALS);
        
        address tokenAddress = factory.createToken(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            deployer, // admin
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        token = TokenCloneable(tokenAddress);
        console.log("Token created at:", address(token));
        console.log("");
        
        // ============ PASO 4: Deploy ComplianceAggregator ============
        console.log("PASO 4: Deploying ComplianceAggregator...");
        complianceAggregator = new ComplianceAggregator(deployer);
        console.log("ComplianceAggregator deployed at:", address(complianceAggregator));
        console.log("");
        
        // ============ PASO 5: Deploy y configurar módulos de compliance ============
        console.log("PASO 5: Deploying compliance modules...");
        console.log("Max Balance:", MAX_BALANCE / 10**18, "tokens");
        console.log("Max Holders:", MAX_HOLDERS);
        console.log("Transfer Lock Period:", TRANSFER_LOCK_PERIOD / 1 days, "days");
        
        // Deploy MaxBalanceCompliance
        maxBalanceCompliance = new MaxBalanceCompliance(
            deployer,
            MAX_BALANCE,
            address(token)
        );
        console.log("MaxBalanceCompliance deployed at:", address(maxBalanceCompliance));
        
        // Deploy MaxHoldersCompliance
        maxHoldersCompliance = new MaxHoldersCompliance(
            deployer,
            MAX_HOLDERS,
            address(token)
        );
        console.log("MaxHoldersCompliance deployed at:", address(maxHoldersCompliance));
        
        // Deploy TransferLockCompliance
        transferLockCompliance = new TransferLockCompliance(
            deployer,
            TRANSFER_LOCK_PERIOD
        );
        console.log("TransferLockCompliance deployed at:", address(transferLockCompliance));
        console.log("");
        
        // ============ PASO 6: Configurar ComplianceAggregator y añadir al token ============
        console.log("PASO 6: Configuring ComplianceAggregator...");
        
        // Agregar módulos al aggregator
        complianceAggregator.addModule(address(token), address(maxBalanceCompliance));
        console.log("Added MaxBalanceCompliance to aggregator");
        
        complianceAggregator.addModule(address(token), address(maxHoldersCompliance));
        console.log("Added MaxHoldersCompliance to aggregator");
        
        complianceAggregator.addModule(address(token), address(transferLockCompliance));
        console.log("Added TransferLockCompliance to aggregator");
        
        // Configurar token actual en aggregator (para uso con ICompliance)
        complianceAggregator.setCurrentToken(address(token));
        console.log("Set current token in aggregator");
        console.log("");
        
        // Añadir ComplianceAggregator como módulo en el token
        console.log("Adding ComplianceAggregator to token...");
        token.addComplianceModule(address(complianceAggregator));
        console.log("ComplianceAggregator added to token");
        console.log("");
        
        // ============ PASO 7: Verificar configuración ============
        console.log("PASO 7: Verifying configuration...");
        
        // Verificar que el token tiene el aggregator configurado
        uint256 moduleCount = token.getComplianceModulesCount();
        console.log("Compliance modules count in token:", moduleCount);
        require(moduleCount > 0, "No compliance modules configured");
        
        // Verificar que el aggregator tiene los módulos
        uint256 aggregatorModuleCount = complianceAggregator.getModulesCountForToken(address(token));
        console.log("Modules count in aggregator:", aggregatorModuleCount);
        require(aggregatorModuleCount == 3, "Aggregator should have 3 modules");
        
        console.log("");
        
        // ============ PASO 8: Deployment Summary ============
        console.log("========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("");
        console.log("Identity System:");
        console.log("  IdentityRegistry:", address(identityRegistry));
        console.log("  TrustedIssuersRegistry:", address(trustedIssuersRegistry));
        console.log("  ClaimTopicsRegistry:", address(claimTopicsRegistry));
        console.log("");
        console.log("Factory:");
        console.log("  TokenCloneFactory:", address(factory));
        console.log("");
        console.log("Token:");
        console.log("  Address:", address(token));
        console.log("  Name:", token.name());
        console.log("  Symbol:", token.symbol());
        console.log("  Decimals:", token.decimals());
        console.log("");
        console.log("Compliance:");
        console.log("  ComplianceAggregator:", address(complianceAggregator));
        console.log("  MaxBalanceCompliance:", address(maxBalanceCompliance));
        console.log("    Max Balance:", MAX_BALANCE / 10**18, "tokens");
        console.log("  MaxHoldersCompliance:", address(maxHoldersCompliance));
        console.log("    Max Holders:", MAX_HOLDERS);
        console.log("  TransferLockCompliance:", address(transferLockCompliance));
        console.log("    Lock Period:", TRANSFER_LOCK_PERIOD / 1 days, "days");
        console.log("");
        console.log("========================================");
        console.log("Deployment completed successfully!");
        console.log("========================================");
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Configure Identity System (add trusted issuers, claim topics)");
        console.log("2. Register and verify investor identities");
        console.log("3. Grant AGENT_ROLE to deployer (if not already granted)");
        console.log("4. Mint tokens to verified investors using: token.mint(investor, amount)");
        console.log("5. Test transfers between verified investors");
        console.log("");
        console.log("REMEMBER:");
        console.log("- Max Balance per wallet: 100 tokens");
        console.log("- Max Holders: 10 investors");
        console.log("- Transfer Lock: 365 days after receiving tokens");
        console.log("");
        
        vm.stopBroadcast();
    }
    
    // ============ Helper Functions (for testing) ============
    
    /**
     * @dev Función helper para mintear tokens de prueba
     * NOTA: Esta función requiere que los usuarios estén verificados en el Identity System
     * 
     * @param to Dirección que recibirá los tokens
     * @param amount Cantidad de tokens a mintear
     */
    function mintTestTokens(address to, uint256 amount) external {
        require(address(token) != address(0), "Token not deployed");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");
        
        // Grant AGENT_ROLE si no lo tiene
        if (!token.hasRole(token.AGENT_ROLE(), deployer)) {
            token.grantRole(token.AGENT_ROLE(), deployer);
        }
        
        // Mint tokens
        token.mint(to, amount);
        console.log("Minted", amount / 10**18, "tokens to", to);
    }
    
    /**
     * @dev Función helper para verificar el estado de compliance
     */
    function verifyComplianceState() external view {
        require(address(token) != address(0), "Token not deployed");
        
        console.log("\n=== COMPLIANCE STATE ===");
        console.log("Token:", address(token));
        console.log("Compliance Modules in Token:", token.getComplianceModulesCount());
        console.log("Compliance Modules in Aggregator:", 
        complianceAggregator.getModulesCountForToken(address(token)));
        console.log("");
        console.log("MaxBalanceCompliance:");
        console.log("  Max Balance:", maxBalanceCompliance.maxBalance() / 10**18, "tokens");
        console.log("  Token Contract:", address(maxBalanceCompliance.tokenContract()));
        console.log("");
        console.log("MaxHoldersCompliance:");
        console.log("  Max Holders:", maxHoldersCompliance.maxHolders());
        console.log("  Current Holders:", maxHoldersCompliance.getHoldersCount());
        console.log("");
        console.log("TransferLockCompliance:");
        console.log("  Lock Period:", transferLockCompliance.lockPeriod() / 1 days, "days");
        console.log("");
    }
}

