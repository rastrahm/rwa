// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TokenCloneable} from "../src/TokenCloneable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Identity} from "../src/Identity.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TokenCloneableTest
 * @dev Tests para TokenCloneable (versión clonable del Token)
 */
contract TokenCloneableTest is Test {
    TokenCloneable public implementation;
    TokenCloneable public clone;
    
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    address public admin;
    address public agent;
    address public user1;
    address public user2;
    
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    
    function setUp() public {
        admin = address(this);
        agent = makeAddr("agent");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        // Desplegar registries
        identityRegistry = new IdentityRegistry(admin);
        trustedIssuersRegistry = new TrustedIssuersRegistry(admin);
        claimTopicsRegistry = new ClaimTopicsRegistry(admin);
        
        // Desplegar implementación (se usa para clonar)
        implementation = new TokenCloneable();
    }
    
    // ============ Paso 4.1: TokenCloneable ============
    
    /**
     * @dev Test: crear clone e inicializar
     */
    function test_Initialize() public {
        // Crear clone
        address cloneAddress = Clones.clone(address(implementation));
        clone = TokenCloneable(cloneAddress);
        
        // Inicializar clone
        clone.initialize(
            "TestToken",
            "TTK",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Verificar inicialización
        assertEq(clone.name(), "TestToken");
        assertEq(clone.symbol(), "TTK");
        assertEq(clone.decimals(), 18);
        assertTrue(clone.hasRole(clone.DEFAULT_ADMIN_ROLE(), admin));
        assertEq(address(clone.identityRegistry()), address(identityRegistry));
    }
    
    /**
     * @dev Test: no se puede inicializar dos veces
     */
    function test_CannotInitializeTwice() public {
        // Crear e inicializar clone
        address cloneAddress = Clones.clone(address(implementation));
        clone = TokenCloneable(cloneAddress);
        
        clone.initialize(
            "TestToken",
            "TTK",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Intentar inicializar de nuevo debe fallar
        vm.expectRevert();
        clone.initialize(
            "TestToken2",
            "TTK2",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
    }
    
    /**
     * @dev Test: mint funciona después de inicializar
     */
    function test_Mint_AfterInitialize() public {
        // Crear e inicializar clone
        address cloneAddress = Clones.clone(address(implementation));
        clone = TokenCloneable(cloneAddress);
        
        clone.initialize(
            "TestToken",
            "TTK",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Configurar usuario verificado (sin topics requeridos, solo registro)
        Identity identity1 = new Identity(user1);
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // Otorgar rol AGENT_ROLE
        clone.grantRole(AGENT_ROLE, agent);
        
        // Mint debe funcionar
        vm.prank(agent);
        clone.mint(user1, 1000 * 10**18);
        
        assertEq(clone.balanceOf(user1), 1000 * 10**18);
        assertEq(clone.totalSupply(), 1000 * 10**18);
    }
    
    /**
     * @dev Test: transfer funciona después de inicializar
     */
    function test_Transfer_AfterInitialize() public {
        // Crear e inicializar clone
        address cloneAddress = Clones.clone(address(implementation));
        clone = TokenCloneable(cloneAddress);
        
        clone.initialize(
            "TestToken",
            "TTK",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Registrar usuarios (sin topics requeridos)
        Identity identity1 = new Identity(user1);
        Identity identity2 = new Identity(user2);
        identityRegistry.registerIdentity(user1, address(identity1));
        identityRegistry.registerIdentity(user2, address(identity2));
        
        // Otorgar rol AGENT_ROLE
        clone.grantRole(AGENT_ROLE, agent);
        
        // Mint tokens
        vm.prank(agent);
        clone.mint(user1, 1000 * 10**18);
        
        // Transfer debe funcionar
        vm.prank(user1);
        clone.transfer(user2, 500 * 10**18);
        
        assertEq(clone.balanceOf(user1), 500 * 10**18);
        assertEq(clone.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: múltiples clones tienen estado independiente
     */
    function test_MultipleClones_IndependentState() public {
        // Crear primer clone
        address clone1Address = Clones.clone(address(implementation));
        TokenCloneable clone1 = TokenCloneable(clone1Address);
        clone1.initialize(
            "Token1",
            "TK1",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Crear segundo clone
        address clone2Address = Clones.clone(address(implementation));
        TokenCloneable clone2 = TokenCloneable(clone2Address);
        clone2.initialize(
            "Token2",
            "TK2",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Verificar que son independientes
        assertEq(clone1.name(), "Token1");
        assertEq(clone2.name(), "Token2");
        assertEq(clone1.totalSupply(), 0);
        assertEq(clone2.totalSupply(), 0);
        
        // Configurar usuario verificado
        Identity identity1 = new Identity(user1);
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // Mint en clone1 no afecta clone2
        clone1.grantRole(AGENT_ROLE, agent);
        vm.prank(agent);
        clone1.mint(user1, 1000 * 10**18);
        
        assertEq(clone1.totalSupply(), 1000 * 10**18);
        assertEq(clone2.totalSupply(), 0);
    }
    
    /**
     * @dev Test: constructor deshabilita initializers
     */
    function test_Constructor_DisablesInitializers() public {
        // El constructor debe deshabilitar initializers
        // Si intentamos llamar initialize() en la implementación, debe fallar
        vm.expectRevert();
        implementation.initialize(
            "TestToken",
            "TTK",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
    }
    
    /**
     * @dev Test: todas las funcionalidades funcionan en clone
     */
    function test_AllFeatures_WorkInClone() public {
        // Crear e inicializar clone
        address cloneAddress = Clones.clone(address(implementation));
        clone = TokenCloneable(cloneAddress);
        
        clone.initialize(
            "TestToken",
            "TTK",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Registrar usuarios
        Identity identity1 = new Identity(user1);
        Identity identity2 = new Identity(user2);
        identityRegistry.registerIdentity(user1, address(identity1));
        identityRegistry.registerIdentity(user2, address(identity2));
        
        // Otorgar rol AGENT_ROLE
        clone.grantRole(AGENT_ROLE, agent);
        
        // Test mint
        vm.prank(agent);
        clone.mint(user1, 1000 * 10**18);
        assertEq(clone.balanceOf(user1), 1000 * 10**18);
        
        // Test transfer
        vm.prank(user1);
        clone.transfer(user2, 500 * 10**18);
        assertEq(clone.balanceOf(user2), 500 * 10**18);
        
        // Test burn
        vm.prank(user1);
        clone.burn(300 * 10**18);
        assertEq(clone.balanceOf(user1), 200 * 10**18);
        
        // Test pause
        clone.pause();
        assertTrue(clone.paused());
        
        // Test unpause
        clone.unpause();
        assertFalse(clone.paused());
        
        // Test freeze
        clone.freezeAccount(user1);
        assertTrue(clone.isFrozen(user1));
        
        // Test unfreeze
        clone.unfreezeAccount(user1);
        assertFalse(clone.isFrozen(user1));
    }
}

