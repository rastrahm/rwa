// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";
import {TokenCloneFactory} from "../src/TokenCloneFactory.sol";

/**
 * @title DeployWeb
 * @dev Script de deployment simplificado para las interfaces web
 * 
 * Despliega solo los contratos necesarios para las 3 interfaces web:
 * - IdentityRegistry
 * - TrustedIssuersRegistry
 * - ClaimTopicsRegistry
 * - TokenCloneFactory
 * 
 * USO:
 * forge script script/DeployWeb.s.sol:DeployWeb --rpc-url http://localhost:8545 --broadcast
 */
contract DeployWeb is Script {
    // ============ Deployment Addresses ============
    
    address public deployer;
    
    // Identity System
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    // Factory
    TokenCloneFactory public tokenCloneFactory;
    
    function setUp() public {
        deployer = msg.sender;
    }
    
    function run() external {
        vm.startBroadcast(deployer);
        
        console.log("\n========================================");
        console.log("Deploying Contracts for Web Interfaces");
        console.log("========================================\n");
        
        // ============ 1. Deploy Identity System ============
        console.log("PASO 1: Deploying Identity System...");
        
        identityRegistry = new IdentityRegistry(deployer);
        console.log("IdentityRegistry:", address(identityRegistry));
        
        trustedIssuersRegistry = new TrustedIssuersRegistry(deployer);
        console.log("TrustedIssuersRegistry:", address(trustedIssuersRegistry));
        
        claimTopicsRegistry = new ClaimTopicsRegistry(deployer);
        console.log("ClaimTopicsRegistry:", address(claimTopicsRegistry));
        
        console.log("");
        
        // ============ 2. Deploy Token Clone Factory ============
        console.log("PASO 2: Deploying Token Clone Factory...");
        
        tokenCloneFactory = new TokenCloneFactory(deployer);
        console.log("TokenCloneFactory:", address(tokenCloneFactory));
        console.log("Implementation:", tokenCloneFactory.implementation());
        
        console.log("");
        
        // ============ 3. Deployment Summary ============
        console.log("========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("");
        console.log("Contract Addresses:");
        console.log("IDENTITY_REGISTRY_ADDRESS=", address(identityRegistry));
        console.log("TRUSTED_ISSUERS_REGISTRY_ADDRESS=", address(trustedIssuersRegistry));
        console.log("CLAIM_TOPICS_REGISTRY_ADDRESS=", address(claimTopicsRegistry));
        console.log("TOKEN_CLONE_FACTORY_ADDRESS=", address(tokenCloneFactory));
        console.log("");
        console.log("========================================");
        console.log("Deployment completed successfully!");
        console.log("========================================\n");
        
        // Verificaciones
        require(address(identityRegistry) != address(0), "IdentityRegistry deployment failed");
        require(address(trustedIssuersRegistry) != address(0), "TrustedIssuersRegistry deployment failed");
        require(address(claimTopicsRegistry) != address(0), "ClaimTopicsRegistry deployment failed");
        require(address(tokenCloneFactory) != address(0), "TokenCloneFactory deployment failed");
        
        vm.stopBroadcast();
    }
}

