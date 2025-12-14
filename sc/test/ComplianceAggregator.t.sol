// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ComplianceAggregator} from "../src/compliance/ComplianceAggregator.sol";
import {ICompliance} from "../src/ICompliance.sol";
import {MaxBalanceCompliance} from "../src/compliance/MaxBalanceCompliance.sol";
import {MaxHoldersCompliance} from "../src/compliance/MaxHoldersCompliance.sol";
import {TransferLockCompliance} from "../src/compliance/TransferLockCompliance.sol";
import {Token} from "../src/Token.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ComplianceAggregatorTest
 * @dev Tests para ComplianceAggregator
 */
contract ComplianceAggregatorTest is Test {
    ComplianceAggregator public aggregator;
    Token public token;
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    MaxBalanceCompliance public maxBalanceModule;
    MaxHoldersCompliance public maxHoldersModule;
    TransferLockCompliance public transferLockModule;
    
    address public owner;
    address public user1;
    address public user2;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        // Desplegar registries
        identityRegistry = new IdentityRegistry(owner);
        trustedIssuersRegistry = new TrustedIssuersRegistry(owner);
        claimTopicsRegistry = new ClaimTopicsRegistry(owner);
        
        // Desplegar token
        token = new Token(
            "TestToken",
            "TTK",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Desplegar compliance modules
        maxBalanceModule = new MaxBalanceCompliance(owner, 1000 * 10**18, address(token));
        maxHoldersModule = new MaxHoldersCompliance(owner, 10, address(token));
        transferLockModule = new TransferLockCompliance(owner, 7 days);
        
        // Desplegar aggregator
        aggregator = new ComplianceAggregator(owner);
    }
    
    // ============ Paso 5.1: ComplianceAggregator Básico ============
    
    /**
     * @dev Test: agregar módulo a token
     */
    function test_AddModule() public {
        aggregator.addModule(address(token), address(maxBalanceModule));
        
        assertTrue(aggregator.isModuleActiveForToken(address(token), address(maxBalanceModule)));
        assertEq(aggregator.getModulesCountForToken(address(token)), 1);
    }
    
    /**
     * @dev Test: agregar múltiples módulos
     */
    function test_AddMultipleModules() public {
        aggregator.addModule(address(token), address(maxBalanceModule));
        aggregator.addModule(address(token), address(maxHoldersModule));
        aggregator.addModule(address(token), address(transferLockModule));
        
        assertEq(aggregator.getModulesCountForToken(address(token)), 3);
        assertTrue(aggregator.isModuleActiveForToken(address(token), address(maxBalanceModule)));
        assertTrue(aggregator.isModuleActiveForToken(address(token), address(maxHoldersModule)));
        assertTrue(aggregator.isModuleActiveForToken(address(token), address(transferLockModule)));
    }
    
    /**
     * @dev Test: remover módulo
     */
    function test_RemoveModule() public {
        aggregator.addModule(address(token), address(maxBalanceModule));
        aggregator.addModule(address(token), address(maxHoldersModule));
        
        assertEq(aggregator.getModulesCountForToken(address(token)), 2);
        
        aggregator.removeModule(address(token), address(maxBalanceModule));
        
        assertEq(aggregator.getModulesCountForToken(address(token)), 1);
        assertFalse(aggregator.isModuleActiveForToken(address(token), address(maxBalanceModule)));
        assertTrue(aggregator.isModuleActiveForToken(address(token), address(maxHoldersModule)));
    }
    
    /**
     * @dev Test: canTransfer permite cuando todos los módulos pasan
     */
    function test_CanTransfer_AllowsWhenAllModulesPass() public {
        // Configurar módulos
        aggregator.addModule(address(token), address(maxBalanceModule));
        aggregator.addModule(address(token), address(maxHoldersModule));
        
        // Configurar usuarios verificados
        setupVerifiedUsers();
        
        // Mint tokens (dentro del límite)
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 500 * 10**18);
        
        // canTransfer debe permitir
        assertTrue(aggregator.canTransfer(address(token), user1, user2, 100 * 10**18));
    }
    
    /**
     * @dev Test: canTransfer rechaza cuando un módulo falla
     */
    function test_CanTransfer_RejectsWhenOneModuleFails() public {
        // Configurar módulos
        aggregator.addModule(address(token), address(maxBalanceModule));
        aggregator.addModule(address(token), address(maxHoldersModule));
        
        // Configurar usuarios verificados
        setupVerifiedUsers();
        
        // Mint tokens (dentro del límite de balance)
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 500 * 10**18);
        
        // Notificar a los módulos sobre el mint
        aggregator.created(address(token), user1, 500 * 10**18);
        
        // Llenar el límite de holders (maxHoldersModule tiene límite de 10)
        // Crear 10 holders
        for (uint256 i = 0; i < 10; i++) {
            address holder = makeAddr(string(abi.encodePacked("holder", i)));
            setupVerifiedUser(holder);
            token.mint(holder, 1 * 10**18);
            // Notificar a los módulos sobre cada mint
            aggregator.created(address(token), holder, 1 * 10**18);
        }
        
        // Ahora intentar transferir a user2 (que sería el holder 11)
        // maxHoldersModule debe rechazar porque ya hay 10 holders
        assertFalse(aggregator.canTransfer(address(token), user1, user2, 100 * 10**18));
    }
    
    /**
     * @dev Test: canTransfer permite cuando no hay módulos
     */
    function test_CanTransfer_AllowsWhenNoModules() public {
        // Sin módulos agregados, canTransfer debe permitir
        assertTrue(aggregator.canTransfer(address(token), user1, user2, 100 * 10**18));
    }
    
    /**
     * @dev Test: canTransfer con ICompliance interface (sin token explícito)
     */
    function test_CanTransfer_IComplianceInterface() public {
        // Configurar token actual
        aggregator.setCurrentToken(address(token));
        
        // Agregar módulo
        aggregator.addModule(address(token), address(maxBalanceModule));
        
        setupVerifiedUsers();
        
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 500 * 10**18);
        
        // canTransfer sin token explícito debe usar currentToken
        assertTrue(aggregator.canTransfer(user1, user2, 100 * 10**18));
    }
    
    /**
     * @dev Test: transferred notifica a todos los módulos
     */
    function test_Transferred_NotifiesAllModules() public {
        aggregator.addModule(address(token), address(maxBalanceModule));
        aggregator.addModule(address(token), address(maxHoldersModule));
        
        setupVerifiedUsers();
        
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 100 * 10**18);
        
        // Notificar a los módulos sobre el mint inicial
        aggregator.created(address(token), user1, 100 * 10**18);
        
        // Hacer transferencia real en el token
        vm.prank(user1);
        token.transfer(user2, 50 * 10**18);
        
        // Notificar a los módulos sobre la transferencia
        // (En producción, esto se haría automáticamente en _update del Token)
        aggregator.transferred(address(token), user1, user2, 50 * 10**18);
        
        // Verificar que los módulos fueron notificados
        // (maxHoldersModule debe haber actualizado su contador porque user2 ahora tiene balance)
        assertTrue(maxHoldersModule.isHolder(user2));
    }
    
    /**
     * @dev Test: created notifica a todos los módulos
     */
    function test_Created_NotifiesAllModules() public {
        aggregator.addModule(address(token), address(maxBalanceModule));
        aggregator.addModule(address(token), address(maxHoldersModule));
        
        setupVerifiedUser(user1);
        
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 100 * 10**18);
        
        // created debe notificar a todos los módulos
        aggregator.created(address(token), user1, 100 * 10**18);
        
        // Verificar que los módulos fueron notificados
        assertTrue(maxHoldersModule.isHolder(user1));
    }
    
    /**
     * @dev Test: destroyed notifica a todos los módulos
     */
    function test_Destroyed_NotifiesAllModules() public {
        aggregator.addModule(address(token), address(maxBalanceModule));
        aggregator.addModule(address(token), address(maxHoldersModule));
        
        setupVerifiedUser(user1);
        
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 100 * 10**18);
        
        // Notificar a los módulos sobre el mint inicial
        aggregator.created(address(token), user1, 100 * 10**18);
        
        // Verificar que user1 es holder
        assertTrue(maxHoldersModule.isHolder(user1));
        
        // Quemar todos los tokens (desde user1)
        vm.prank(user1);
        token.burn(100 * 10**18);
        
        // destroyed debe notificar a todos los módulos
        aggregator.destroyed(address(token), user1, 100 * 10**18);
        
        // Verificar que los módulos fueron notificados
        // (maxHoldersModule debe haber removido user1 porque balance es 0)
        assertFalse(maxHoldersModule.isHolder(user1));
    }
    
    /**
     * @dev Test: agregar módulo duplicado debe fallar
     */
    function test_RevertWhen_AddDuplicateModule() public {
        aggregator.addModule(address(token), address(maxBalanceModule));
        
        vm.expectRevert("Module already added");
        aggregator.addModule(address(token), address(maxBalanceModule));
    }
    
    /**
     * @dev Test: remover módulo inexistente debe fallar
     */
    function test_RevertWhen_RemoveNonExistentModule() public {
        vm.expectRevert("Module not found");
        aggregator.removeModule(address(token), address(maxBalanceModule));
    }
    
    /**
     * @dev Test: solo owner puede agregar/remover módulos
     */
    function test_RevertWhen_NotOwner_AddModule() public {
        vm.prank(user1);
        vm.expectRevert();
        aggregator.addModule(address(token), address(maxBalanceModule));
    }
    
    /**
     * @dev Test: getModulesForToken retorna todos los módulos
     */
    function test_GetModulesForToken() public {
        aggregator.addModule(address(token), address(maxBalanceModule));
        aggregator.addModule(address(token), address(maxHoldersModule));
        
        address[] memory modules = aggregator.getModulesForToken(address(token));
        
        assertEq(modules.length, 2);
        assertEq(modules[0], address(maxBalanceModule));
        assertEq(modules[1], address(maxHoldersModule));
    }
    
    // ============ Helper Functions ============
    
    function setupVerifiedUsers() internal {
        setupVerifiedUser(user1);
        setupVerifiedUser(user2);
    }
    
    function setupVerifiedUser(address user) internal {
        // Crear identity
        Identity identity = new Identity(user);
        
        // Registrar identity
        identityRegistry.registerIdentity(user, address(identity));
        
        // No agregar topics requeridos, así que cualquier usuario registrado está OK
    }
}

// Mock Identity para tests
import {Identity} from "../src/Identity.sol";

