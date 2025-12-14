// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Token} from "../src/Token.sol";
import {Identity} from "../src/Identity.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";
import {ICompliance} from "../src/ICompliance.sol";
import {MaxBalanceCompliance} from "../src/compliance/MaxBalanceCompliance.sol";
import {MaxHoldersCompliance} from "../src/compliance/MaxHoldersCompliance.sol";
import {TransferLockCompliance} from "../src/compliance/TransferLockCompliance.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TokenComplianceIntegrationTest
 * @dev Tests para la integración del Token con Compliance Modules
 */
contract TokenComplianceIntegrationTest is Test {
    Token public token;
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    Identity public identity1;
    Identity public identity2;
    
    MaxBalanceCompliance public maxBalanceCompliance;
    MaxHoldersCompliance public maxHoldersCompliance;
    TransferLockCompliance public transferLockCompliance;
    
    address public admin;
    address public agent;
    address public user1;
    address public user2;
    address public issuer1;
    
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    
    bytes public signature1;
    bytes public data1;
    string public uri1;
    
    function setUp() public {
        admin = address(this);
        agent = makeAddr("agent");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        issuer1 = makeAddr("issuer1");
        
        // Desplegar registries
        identityRegistry = new IdentityRegistry(admin);
        trustedIssuersRegistry = new TrustedIssuersRegistry(admin);
        claimTopicsRegistry = new ClaimTopicsRegistry(admin);
        
        // Desplegar token
        token = new Token(
            "TestToken",
            "TTK",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Otorgar rol AGENT_ROLE
        token.grantRole(AGENT_ROLE, agent);
        
        // Desplegar identities
        identity1 = new Identity(user1);
        identity2 = new Identity(user2);
        
        // Desplegar compliance modules
        maxBalanceCompliance = new MaxBalanceCompliance(
            admin,
            1000 * 10**18, // maxBalance
            address(token)
        );
        
        maxHoldersCompliance = new MaxHoldersCompliance(
            admin,
            10, // maxHolders
            address(token)
        );
        
        transferLockCompliance = new TransferLockCompliance(
            admin,
            30 days // lockPeriod
        );
        
        // Datos de ejemplo
        signature1 = "0x1234567890abcdef";
        data1 = "0xabcdef1234567890";
        uri1 = "https://example.com/kyc/user1";
    }
    
    // ============ Helper Functions ============
    
    /**
     * @dev Configurar usuarios verificados
     */
    function setupVerifiedUsers() internal {
        // Registrar usuarios (sin topics requeridos, están verificados)
        identityRegistry.registerIdentity(user1, address(identity1));
        identityRegistry.registerIdentity(user2, address(identity2));
    }
    
    // ============ Paso 3.3: Integración con Compliance Modules ============
    
    /**
     * @dev Test: transferencia rechazada cuando MaxBalanceCompliance falla
     */
    function test_CannotTransfer_WhenMaxBalanceComplianceFails() public {
        setupVerifiedUsers();
        
        // Agregar módulo de compliance
        token.addComplianceModule(address(maxBalanceCompliance));
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Mint tokens a user2 (ya tiene 500, maxBalance = 1000)
        vm.prank(agent);
        token.mint(user2, 500 * 10**18);
        
        // user1 intenta transferir 600 tokens a user2 (excedería maxBalance)
        vm.prank(user1);
        vm.expectRevert("Transfer not compliant");
        token.transfer(user2, 600 * 10**18);
    }
    
    /**
     * @dev Test: transferencia permitida cuando MaxBalanceCompliance pasa
     */
    function test_CanTransfer_WhenMaxBalanceCompliancePasses() public {
        setupVerifiedUsers();
        
        // Agregar módulo de compliance
        token.addComplianceModule(address(maxBalanceCompliance));
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Mint tokens a user2 (tiene 500, maxBalance = 1000)
        vm.prank(agent);
        token.mint(user2, 500 * 10**18);
        
        // user1 transfiere 400 tokens a user2 (500 + 400 = 900 <= 1000)
        vm.prank(user1);
        token.transfer(user2, 400 * 10**18);
        
        assertEq(token.balanceOf(user2), 900 * 10**18);
    }
    
    /**
     * @dev Test: transferencia rechazada cuando MaxHoldersCompliance falla
     */
    function test_CannotTransfer_WhenMaxHoldersComplianceFails() public {
        setupVerifiedUsers();
        
        // Agregar módulo de compliance
        token.addComplianceModule(address(maxHoldersCompliance));
        
        // Mintear a user1 primero (dentro del límite)
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Agregar 9 holders más (total 10, el máximo)
        for (uint i = 0; i < 9; i++) {
            address holder = makeAddr(string(abi.encodePacked("holder", i)));
            Identity identity = new Identity(holder);
            identityRegistry.registerIdentity(holder, address(identity));
            
            vm.prank(agent);
            token.mint(holder, 1);
        }
        
        // Intentar transferir a nuevo holder (debe fallar porque user2 sería el holder 11)
        vm.prank(user1);
        vm.expectRevert("Transfer not compliant");
        token.transfer(user2, 1); // user2 sería el holder 11
    }
    
    /**
     * @dev Test: transferencia permitida cuando MaxHoldersCompliance pasa
     */
    function test_CanTransfer_WhenMaxHoldersCompliancePasses() public {
        setupVerifiedUsers();
        
        // Agregar módulo de compliance
        token.addComplianceModule(address(maxHoldersCompliance));
        
        // Agregar solo 5 holders (bajo el límite de 10)
        for (uint i = 0; i < 5; i++) {
            address holder = makeAddr(string(abi.encodePacked("holder", i)));
            Identity identity = new Identity(holder);
            identityRegistry.registerIdentity(holder, address(identity));
            
            vm.prank(agent);
            token.mint(holder, 1);
        }
        
        // Transferir a nuevo holder debe pasar (5 + 1 = 6 <= 10)
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        vm.prank(user1);
        token.transfer(user2, 1);
        
        assertEq(token.balanceOf(user2), 1);
    }
    
    /**
     * @dev Test: transferencia rechazada cuando TransferLockCompliance falla
     */
    function test_CannotTransfer_WhenTransferLockComplianceFails() public {
        setupVerifiedUsers();
        
        // Agregar módulo de compliance
        token.addComplianceModule(address(transferLockCompliance));
        
        // Mint tokens a user1 (esto bloquea user1 por 30 días)
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Intentar transferir inmediatamente (debe fallar)
        vm.warp(block.timestamp + 1 days);
        vm.prank(user1);
        vm.expectRevert("Transfer not compliant");
        token.transfer(user2, 500 * 10**18);
    }
    
    /**
     * @dev Test: transferencia permitida cuando TransferLockCompliance pasa
     */
    function test_CanTransfer_WhenTransferLockCompliancePasses() public {
        setupVerifiedUsers();
        
        // Agregar módulo de compliance
        token.addComplianceModule(address(transferLockCompliance));
        
        // Mint tokens a user1 (esto bloquea user1 por 30 días)
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Después del lock period (debe pasar)
        vm.warp(block.timestamp + 31 days);
        vm.prank(user1);
        token.transfer(user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: múltiples módulos trabajando juntos
     */
    function test_MultipleComplianceModules_WorkingTogether() public {
        setupVerifiedUsers();
        
        // Agregar todos los módulos
        token.addComplianceModule(address(maxBalanceCompliance));
        token.addComplianceModule(address(maxHoldersCompliance));
        token.addComplianceModule(address(transferLockCompliance));
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Avanzar tiempo para pasar TransferLock
        vm.warp(block.timestamp + 31 days);
        
        // Transferir debe pasar (todos los módulos aprueban)
        vm.prank(user1);
        token.transfer(user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: transferencia rechazada cuando un módulo falla
     */
    function test_CannotTransfer_WhenOneModuleFails() public {
        setupVerifiedUsers();
        
        // Agregar todos los módulos
        token.addComplianceModule(address(maxBalanceCompliance));
        token.addComplianceModule(address(maxHoldersCompliance));
        token.addComplianceModule(address(transferLockCompliance));
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Mint tokens a user2 (tiene 500, maxBalance = 1000)
        vm.prank(agent);
        token.mint(user2, 500 * 10**18);
        
        // Avanzar tiempo para pasar TransferLock
        vm.warp(block.timestamp + 31 days);
        
        // Intentar transferir 600 tokens (excedería maxBalance)
        vm.prank(user1);
        vm.expectRevert("Transfer not compliant");
        token.transfer(user2, 600 * 10**18);
    }
    
    /**
     * @dev Test: addComplianceModule agrega módulo
     */
    function test_AddComplianceModule() public {
        token.addComplianceModule(address(maxBalanceCompliance));
        
        assertTrue(token.isComplianceModule(address(maxBalanceCompliance)));
        assertEq(token.getComplianceModulesCount(), 1);
    }
    
    /**
     * @dev Test: removeComplianceModule remueve módulo
     */
    function test_RemoveComplianceModule() public {
        token.addComplianceModule(address(maxBalanceCompliance));
        assertEq(token.getComplianceModulesCount(), 1);
        
        token.removeComplianceModule(address(maxBalanceCompliance));
        assertFalse(token.isComplianceModule(address(maxBalanceCompliance)));
        assertEq(token.getComplianceModulesCount(), 0);
    }
    
    /**
     * @dev Test: addComplianceModule solo puede ser llamado por COMPLIANCE_ROLE
     */
    function test_RevertWhen_AddComplianceModule_NotAdmin() public {
        vm.prank(user1);
        vm.expectRevert();
        token.addComplianceModule(address(maxBalanceCompliance));
    }
    
    /**
     * @dev Test: removeComplianceModule solo puede ser llamado por COMPLIANCE_ROLE
     */
    function test_RevertWhen_RemoveComplianceModule_NotAdmin() public {
        token.addComplianceModule(address(maxBalanceCompliance));
        
        vm.prank(user1);
        vm.expectRevert();
        token.removeComplianceModule(address(maxBalanceCompliance));
    }
    
    /**
     * @dev Test: canTransfer valida todos los módulos
     */
    function test_CanTransfer_ValidatesAllModules() public {
        setupVerifiedUsers();
        
        // Agregar módulos
        token.addComplianceModule(address(maxBalanceCompliance));
        token.addComplianceModule(address(transferLockCompliance));
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // canTransfer debe retornar false (TransferLock bloquea)
        assertFalse(token.canTransfer(user1, user2, 500 * 10**18));
        
        // Avanzar tiempo
        vm.warp(block.timestamp + 31 days);
        
        // canTransfer debe retornar true (todos los módulos aprueban)
        assertTrue(token.canTransfer(user1, user2, 500 * 10**18));
    }
}

