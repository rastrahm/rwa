// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Token} from "../src/Token.sol";
import {Identity} from "../src/Identity.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";

/**
 * @title TokenAdvancedFeaturesTest
 * @dev Tests para funcionalidades avanzadas del Token (pause, freeze, forced transfer)
 */
contract TokenAdvancedFeaturesTest is Test {
    Token public token;
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    Identity public identity1;
    Identity public identity2;
    
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
        
        // Desplegar identities y registrar usuarios
        identity1 = new Identity(user1);
        identity2 = new Identity(user2);
        identityRegistry.registerIdentity(user1, address(identity1));
        identityRegistry.registerIdentity(user2, address(identity2));
    }
    
    // ============ Paso 3.4: Funcionalidades Avanzadas ============
    
    /**
     * @dev Test: pausar el token
     */
    function test_Pause() public {
        // Mint tokens
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Pausar token
        token.pause();
        assertTrue(token.paused());
        
        // Transferencia debe fallar
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, 500 * 10**18);
    }
    
    /**
     * @dev Test: despausar el token
     */
    function test_Unpause() public {
        // Pausar token
        token.pause();
        assertTrue(token.paused());
        
        // Despausar token
        token.unpause();
        assertFalse(token.paused());
        
        // Transferencia debe pasar
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        vm.prank(user1);
        token.transfer(user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: pause solo puede ser llamado por admin
     */
    function test_RevertWhen_Pause_NotAdmin() public {
        vm.prank(user1);
        vm.expectRevert();
        token.pause();
    }
    
    /**
     * @dev Test: congelar cuenta
     */
    function test_FreezeAccount() public {
        // Mint tokens
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Congelar cuenta
        token.freezeAccount(user1);
        assertTrue(token.isFrozen(user1));
        
        // Transferencia desde cuenta congelada debe fallar
        vm.prank(user1);
        vm.expectRevert("Account is frozen");
        token.transfer(user2, 500 * 10**18);
        
        // Transferencia a cuenta congelada debe fallar
        vm.prank(user2);
        vm.expectRevert("Account is frozen");
        token.transfer(user1, 100 * 10**18);
    }
    
    /**
     * @dev Test: descongelar cuenta
     */
    function test_UnfreezeAccount() public {
        // Mint tokens
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Congelar cuenta
        token.freezeAccount(user1);
        assertTrue(token.isFrozen(user1));
        
        // Descongelar cuenta
        token.unfreezeAccount(user1);
        assertFalse(token.isFrozen(user1));
        
        // Transferencia debe pasar
        vm.prank(user1);
        token.transfer(user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: freezeAccount solo puede ser llamado por admin
     */
    function test_RevertWhen_FreezeAccount_NotAdmin() public {
        vm.prank(user1);
        vm.expectRevert();
        token.freezeAccount(user2);
    }
    
    /**
     * @dev Test: forcedTransfer (transferencia forzada)
     */
    function test_ForcedTransfer() public {
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Congelar user1
        token.freezeAccount(user1);
        
        // Agent puede hacer transferencia forzada
        vm.prank(agent);
        token.forcedTransfer(user1, user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: forcedTransfer solo puede ser llamado por AGENT_ROLE
     */
    function test_RevertWhen_ForcedTransfer_NotAgent() public {
        // Mint tokens
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // user1 intenta hacer transferencia forzada (debe fallar)
        vm.prank(user1);
        vm.expectRevert();
        token.forcedTransfer(user1, user2, 500 * 10**18);
    }
    
    /**
     * @dev Test: forcedTransfer funciona incluso con cuentas congeladas
     */
    function test_ForcedTransfer_WorksWithFrozenAccounts() public {
        // Mint tokens
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Congelar ambas cuentas
        token.freezeAccount(user1);
        token.freezeAccount(user2);
        
        // Agent puede hacer transferencia forzada
        vm.prank(agent);
        token.forcedTransfer(user1, user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: forcedTransfer funciona incluso cuando el token está pausado
     */
    function test_ForcedTransfer_WorksWhenPaused() public {
        // Mint tokens
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Pausar token
        token.pause();
        
        // Agent puede hacer transferencia forzada
        vm.prank(agent);
        token.forcedTransfer(user1, user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: canTransfer retorna false cuando token está pausado
     */
    function test_CanTransfer_ReturnsFalse_WhenPaused() public {
        // Mint tokens
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Pausar token
        token.pause();
        
        // canTransfer debe retornar false
        assertFalse(token.canTransfer(user1, user2, 500 * 10**18));
    }
    
    /**
     * @dev Test: canTransfer retorna false cuando cuenta está congelada
     */
    function test_CanTransfer_ReturnsFalse_WhenFrozen() public {
        // Mint tokens
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Congelar user1
        token.freezeAccount(user1);
        
        // canTransfer debe retornar false
        assertFalse(token.canTransfer(user1, user2, 500 * 10**18));
    }
    
    /**
     * @dev Test: mint funciona cuando token está pausado
     */
    function test_Mint_WorksWhenPaused() public {
        // Pausar token
        token.pause();
        
        // Mint debe funcionar (no requiere verificación)
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        assertEq(token.balanceOf(user1), 1000 * 10**18);
    }
    
    /**
     * @dev Test: burn funciona cuando token está pausado
     */
    function test_Burn_WorksWhenPaused() public {
        // Mint tokens
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Pausar token
        token.pause();
        
        // Burn debe funcionar
        vm.prank(user1);
        token.burn(500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
    }
}

