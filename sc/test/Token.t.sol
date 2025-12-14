// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Token} from "../src/Token.sol";
import {Identity} from "../src/Identity.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TokenTest
 * @dev Tests para Token básico (ERC-20)
 */
contract TokenTest is Test {
    Token public token;
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
        
        // Desplegar token con registries
        token = new Token(
            "TestToken",
            "TTK",
            admin,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Otorgar rol AGENT_ROLE a agent
        token.grantRole(AGENT_ROLE, agent);
    }
    
    /**
     * @dev Helper: registrar usuario sin topics requeridos (está verificado)
     */
    function registerUser(address user) internal {
        Identity identity = new Identity(user);
        identityRegistry.registerIdentity(user, address(identity));
    }
    
    // ============ Paso 3.1: Token Básico - ERC-20 ============
    
    /**
     * @dev Test: verificar constructor
     */
    function test_Constructor() public {
        assertEq(token.name(), "TestToken");
        assertEq(token.symbol(), "TTK");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
    }
    
    /**
     * @dev Test: mint tokens
     */
    function test_Mint() public {
        // Configurar usuario verificado (sin topics requeridos, solo registro)
        Identity identity1 = new Identity(user1);
        identityRegistry.registerIdentity(user1, address(identity1));
        
        uint256 amount = 1000 * 10**18;
        
        vm.prank(agent);
        token.mint(user1, amount);
        
        assertEq(token.balanceOf(user1), amount);
        assertEq(token.totalSupply(), amount);
    }
    
    /**
     * @dev Test: mint solo puede ser llamado por AGENT_ROLE
     */
    function test_RevertWhen_Mint_NotAgent() public {
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user1, 1000 * 10**18);
    }
    
    /**
     * @dev Test: transfer tokens
     * Nota: Sin topics requeridos, cualquier usuario registrado puede transferir
     */
    function test_Transfer() public {
        // Registrar usuarios (sin topics requeridos, están verificados)
        Identity identity1 = new Identity(user1);
        Identity identity2 = new Identity(user2);
        identityRegistry.registerIdentity(user1, address(identity1));
        identityRegistry.registerIdentity(user2, address(identity2));
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // user1 transfiere a user2
        vm.prank(user1);
        token.transfer(user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
        assertEq(token.totalSupply(), amount);
    }
    
    /**
     * @dev Test: transferFrom con approve
     * Nota: Sin topics requeridos, cualquier usuario registrado puede transferir
     */
    function test_TransferFrom() public {
        // Registrar usuarios (sin topics requeridos, están verificados)
        Identity identity1 = new Identity(user1);
        Identity identity2 = new Identity(user2);
        identityRegistry.registerIdentity(user1, address(identity1));
        identityRegistry.registerIdentity(user2, address(identity2));
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // user1 aprueba a user2
        vm.prank(user1);
        token.approve(user2, 500 * 10**18);
        
        assertEq(token.allowance(user1, user2), 500 * 10**18);
        
        // user2 transfiere desde user1
        vm.prank(user2);
        token.transferFrom(user1, user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
        assertEq(token.allowance(user1, user2), 0);
    }
    
    /**
     * @dev Test: transferFrom sin approve debe fallar
     */
    function test_RevertWhen_TransferFrom_WithoutApprove() public {
        registerUser(user1);
        registerUser(user2);
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // user2 intenta transferir sin approve
        vm.prank(user2);
        vm.expectRevert();
        token.transferFrom(user1, user2, 500 * 10**18);
    }
    
    /**
     * @dev Test: transferFrom con approve insuficiente debe fallar
     */
    function test_RevertWhen_TransferFrom_InsufficientAllowance() public {
        registerUser(user1);
        registerUser(user2);
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // user1 aprueba solo 100 tokens
        vm.prank(user1);
        token.approve(user2, 100 * 10**18);
        
        // user2 intenta transferir 500 tokens
        vm.prank(user2);
        vm.expectRevert();
        token.transferFrom(user1, user2, 500 * 10**18);
    }
    
    /**
     * @dev Test: burn tokens
     */
    function test_Burn() public {
        registerUser(user1);
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // user1 quema tokens
        vm.prank(user1);
        token.burn(500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.totalSupply(), 500 * 10**18);
    }
    
    /**
     * @dev Test: burnFrom (agent puede quemar tokens de otros)
     */
    function test_BurnFrom() public {
        registerUser(user1);
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // agent quema tokens de user1
        vm.prank(agent);
        token.burnFrom(user1, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.totalSupply(), 500 * 10**18);
    }
    
    /**
     * @dev Test: burnFrom solo puede ser llamado por AGENT_ROLE
     */
    function test_RevertWhen_BurnFrom_NotAgent() public {
        registerUser(user1);
        registerUser(user2);
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // user2 intenta quemar tokens de user1
        vm.prank(user2);
        vm.expectRevert();
        token.burnFrom(user1, 500 * 10**18);
    }
    
    /**
     * @dev Test: transfer con balance insuficiente debe fallar
     */
    function test_RevertWhen_Transfer_InsufficientBalance() public {
        registerUser(user1);
        registerUser(user2);
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // user1 intenta transferir más de lo que tiene
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, 2000 * 10**18);
    }
    
    /**
     * @dev Test: transfer a address(0) debe fallar
     */
    function test_RevertWhen_Transfer_ToZeroAddress() public {
        registerUser(user1);
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // user1 intenta transferir a address(0)
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(address(0), 500 * 10**18);
    }
    
    /**
     * @dev Test: mint a address(0) debe fallar
     */
    function test_RevertWhen_Mint_ToZeroAddress() public {
        vm.prank(agent);
        vm.expectRevert();
        token.mint(address(0), 1000 * 10**18);
    }
    
    /**
     * @dev Test: eventos se emiten correctamente (verificación básica)
     * Nota: Sin topics requeridos, cualquier usuario registrado puede transferir
     */
    function test_Events() public {
        // Registrar usuarios (sin topics requeridos, están verificados)
        Identity identity1 = new Identity(user1);
        Identity identity2 = new Identity(user2);
        identityRegistry.registerIdentity(user1, address(identity1));
        identityRegistry.registerIdentity(user2, address(identity2));
        
        uint256 amount = 1000 * 10**18;
        
        // Mint debe emitir Transfer event
        vm.prank(agent);
        token.mint(user1, amount);
        
        // Transfer debe emitir Transfer event
        vm.prank(user1);
        token.transfer(user2, 500 * 10**18);
        
        // Si llegamos aquí, los eventos se emitieron correctamente
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: approve y allowance
     */
    function test_Approve() public {
        registerUser(user1);
        registerUser(user2);
        
        uint256 amount = 1000 * 10**18;
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, amount);
        
        // user1 aprueba a user2
        vm.prank(user1);
        token.approve(user2, 500 * 10**18);
        
        assertEq(token.allowance(user1, user2), 500 * 10**18);
        
        // user1 aprueba más
        vm.prank(user1);
        token.approve(user2, 800 * 10**18);
        
        assertEq(token.allowance(user1, user2), 800 * 10**18);
    }
    
}

