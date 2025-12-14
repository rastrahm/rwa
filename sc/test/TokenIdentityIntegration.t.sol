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
 * @title TokenIdentityIntegrationTest
 * @dev Tests para la integración del Token con Identity System
 */
contract TokenIdentityIntegrationTest is Test {
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
        
        // Desplegar token con registries
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
        
        // Datos de ejemplo
        signature1 = "0x1234567890abcdef";
        data1 = "0xabcdef1234567890";
        uri1 = "https://example.com/kyc/user1";
    }
    
    // ============ Helper Functions ============
    
    /**
     * @dev Configurar un usuario completamente verificado
     */
    function setupVerifiedUser(address user, Identity identity) internal {
        // 1. Agregar claim topic requerido (solo si no existe)
        if (!claimTopicsRegistry.claimTopicExists(1)) {
            claimTopicsRegistry.addClaimTopic(1); // KYC
        }
        
        // 2. Agregar trusted issuer (solo si no existe)
        if (!trustedIssuersRegistry.isTrustedIssuer(issuer1)) {
            uint256[] memory topics = new uint256[](1);
            topics[0] = 1;
            trustedIssuersRegistry.addTrustedIssuer(issuer1, topics);
        }
        
        // 3. Registrar identity (solo si no está registrado)
        if (!identityRegistry.isRegistered(user)) {
            identityRegistry.registerIdentity(user, address(identity));
        }
        
        // 4. Agregar claim (solo si no existe)
        // El owner del Identity es 'user', así que usamos vm.prank
        if (!identity.claimExists(1, issuer1)) {
            vm.prank(user);
            identity.addClaim(1, 1, issuer1, signature1, data1, uri1);
        }
    }
    
    // ============ Paso 3.2: Integración con Identity System ============
    
    /**
     * @dev Test: transferencia rechazada cuando remitente no está verificado
     */
    function test_CannotTransfer_WhenSenderNotVerified() public {
        // Setup: ambos usuarios verificados inicialmente
        setupVerifiedUser(user1, identity1);
        setupVerifiedUser(user2, identity2);
        
        // Mint tokens a user1 (está verificado)
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Remover claim de user1 para que no esté verificado
        vm.prank(user1);
        identity1.removeClaim(1, issuer1);
        
        // Verificar que user1 ya no está verificado
        assertFalse(token.isVerified(user1));
        
        // user1 intenta transferir (debe fallar)
        vm.prank(user1);
        vm.expectRevert("Sender not verified");
        token.transfer(user2, 500 * 10**18);
    }
    
    /**
     * @dev Test: transferencia rechazada cuando destinatario no está verificado
     */
    function test_CannotTransfer_WhenRecipientNotVerified() public {
        // Setup: solo user1 está verificado
        setupVerifiedUser(user1, identity1);
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // user1 intenta transferir a user2 (no verificado, debe fallar)
        vm.prank(user1);
        vm.expectRevert("Recipient not verified");
        token.transfer(user2, 500 * 10**18);
    }
    
    /**
     * @dev Test: transferencia permitida cuando ambos están verificados
     */
    function test_CanTransfer_WhenBothVerified() public {
        // Setup: ambos usuarios verificados
        setupVerifiedUser(user1, identity1);
        setupVerifiedUser(user2, identity2);
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Transferencia debe pasar
        vm.prank(user1);
        token.transfer(user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: transferFrom rechazado cuando remitente no está verificado
     */
    function test_CannotTransferFrom_WhenSenderNotVerified() public {
        // Setup: ambos usuarios verificados inicialmente
        setupVerifiedUser(user1, identity1);
        setupVerifiedUser(user2, identity2);
        
        // Mint tokens a user1 (está verificado)
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // Remover claim de user1 para que no esté verificado
        vm.prank(user1);
        identity1.removeClaim(1, issuer1);
        
        // Verificar que user1 ya no está verificado
        assertFalse(token.isVerified(user1));
        
        // user1 aprueba a user2
        vm.prank(user1);
        token.approve(user2, 500 * 10**18);
        
        // user2 intenta transferFrom (debe fallar porque user1 no está verificado)
        vm.prank(user2);
        vm.expectRevert("Sender not verified");
        token.transferFrom(user1, user2, 500 * 10**18);
    }
    
    /**
     * @dev Test: transferFrom permitido cuando ambos están verificados
     */
    function test_CanTransferFrom_WhenBothVerified() public {
        // Setup: ambos usuarios verificados
        setupVerifiedUser(user1, identity1);
        setupVerifiedUser(user2, identity2);
        
        // Mint tokens a user1
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        // user1 aprueba a user2
        vm.prank(user1);
        token.approve(user2, 500 * 10**18);
        
        // TransferFrom debe pasar
        vm.prank(user2);
        token.transferFrom(user1, user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
    }
    
    /**
     * @dev Test: isVerified retorna false cuando no está registrado
     */
    function test_IsVerified_ReturnsFalse_WhenNotRegistered() public {
        // user1 no está registrado
        assertFalse(token.isVerified(user1));
    }
    
    /**
     * @dev Test: isVerified retorna false cuando no tiene claims requeridos
     */
    function test_IsVerified_ReturnsFalse_WhenMissingClaims() public {
        // Setup: agregar topic requerido pero no agregar claim
        claimTopicsRegistry.addClaimTopic(1);
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // user1 no tiene el claim requerido
        assertFalse(token.isVerified(user1));
    }
    
    /**
     * @dev Test: isVerified retorna true cuando está completamente verificado
     */
    function test_IsVerified_ReturnsTrue_WhenFullyVerified() public {
        // Setup: usuario completamente verificado
        setupVerifiedUser(user1, identity1);
        
        assertTrue(token.isVerified(user1));
    }
    
    /**
     * @dev Test: isVerified retorna true cuando no hay topics requeridos
     */
    function test_IsVerified_ReturnsTrue_WhenNoRequiredTopics() public {
        // Setup: usuario registrado pero sin topics requeridos
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // Si no hay topics requeridos, cualquier usuario registrado está OK
        assertTrue(token.isVerified(user1));
    }
    
    /**
     * @dev Test: setIdentityRegistry actualiza el registry
     */
    function test_SetIdentityRegistry() public {
        IdentityRegistry newRegistry = new IdentityRegistry(admin);
        token.setIdentityRegistry(address(newRegistry));
        
        assertEq(address(token.identityRegistry()), address(newRegistry));
    }
    
    /**
     * @dev Test: setIdentityRegistry solo puede ser llamado por COMPLIANCE_ROLE
     */
    function test_RevertWhen_SetIdentityRegistry_NotAdmin() public {
        IdentityRegistry newRegistry = new IdentityRegistry(admin);
        vm.prank(user1);
        vm.expectRevert();
        token.setIdentityRegistry(address(newRegistry));
    }
    
    /**
     * @dev Test: mint requiere verificación
     */
    function test_Mint_RequiresVerification() public {
        // user1 no está verificado
        assertFalse(token.isVerified(user1));
        
        // Mint debe fallar (requiere verificación)
        vm.prank(agent);
        vm.expectRevert("Recipient not verified");
        token.mint(user1, 1000 * 10**18);
        
        // Ahora verificar usuario
        Identity identity1 = new Identity(user1);
        setupVerifiedUser(user1, identity1);
        assertTrue(token.isVerified(user1));
        
        // Ahora mint debe funcionar
        vm.prank(agent);
        token.mint(user1, 1000 * 10**18);
        
        assertEq(token.balanceOf(user1), 1000 * 10**18);
    }
    
    /**
     * @dev Test: múltiples topics requeridos
     */
    function test_IsVerified_WithMultipleRequiredTopics() public {
        // Setup: requerir 2 topics
        claimTopicsRegistry.addClaimTopic(1); // KYC
        claimTopicsRegistry.addClaimTopic(2); // AML
        
        // Agregar issuer que puede emitir ambos
        uint256[] memory topics = new uint256[](2);
        topics[0] = 1;
        topics[1] = 2;
        trustedIssuersRegistry.addTrustedIssuer(issuer1, topics);
        
        // Registrar identity
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // Agregar solo claim KYC (falta AML)
        vm.prank(user1);
        identity1.addClaim(1, 1, issuer1, signature1, data1, uri1);
        
        // No está verificado (falta AML)
        assertFalse(token.isVerified(user1));
        
        // Agregar claim AML
        vm.prank(user1);
        identity1.addClaim(2, 1, issuer1, signature1, data1, uri1);
        
        // Ahora está verificado
        assertTrue(token.isVerified(user1));
    }
}

