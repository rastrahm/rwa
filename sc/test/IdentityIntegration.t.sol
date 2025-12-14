// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Identity} from "../src/Identity.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";

/**
 * @title IdentityIntegrationTest
 * @dev Tests de integración del sistema completo de Identity
 * Demuestra cómo trabajan juntos todos los componentes
 */
contract IdentityIntegrationTest is Test {
    // Componentes del sistema
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    // Identities
    Identity public identity1;
    Identity public identity2;
    
    // Direcciones
    address public owner;
    address public user1;
    address public user2;
    address public issuer1;
    address public issuer2;
    
    // Datos de claims
    bytes public signature1;
    bytes public data1;
    string public uri1;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        issuer1 = makeAddr("issuer1");
        issuer2 = makeAddr("issuer2");
        
        // Desplegar registries
        identityRegistry = new IdentityRegistry(owner);
        trustedIssuersRegistry = new TrustedIssuersRegistry(owner);
        claimTopicsRegistry = new ClaimTopicsRegistry(owner);
        
        // Desplegar identities
        identity1 = new Identity(user1);
        identity2 = new Identity(user2);
        
        // Datos de ejemplo para claims
        signature1 = "0x1234567890abcdef";
        data1 = "0xabcdef1234567890";
        uri1 = "https://example.com/kyc/user1";
    }
    
    // ============ Paso 1.6: Integración Completa ============
    
    /**
     * @dev Test que demuestra el flujo completo de verificación de identidad
     * Este test muestra cómo se integran todos los componentes
     */
    function test_CompleteIdentityVerification_Flow() public {
        // ========== PASO 1: Configurar el Sistema ==========
        
        // 1.1. Agregar claim topics requeridos
        claimTopicsRegistry.addClaimTopic(1); // KYC requerido
        claimTopicsRegistry.addClaimTopic(2); // AML requerido
        
        // 1.2. Agregar trusted issuers con sus topics permitidos
        uint256[] memory issuer1Topics = new uint256[](2);
        issuer1Topics[0] = 1; // KYC
        issuer1Topics[1] = 2; // AML
        trustedIssuersRegistry.addTrustedIssuer(issuer1, issuer1Topics);
        
        uint256[] memory issuer2Topics = new uint256[](1);
        issuer2Topics[0] = 1; // Solo KYC
        trustedIssuersRegistry.addTrustedIssuer(issuer2, issuer2Topics);
        
        // ========== PASO 2: Registrar Identities ==========
        
        // 2.1. Registrar identity de user1
        identityRegistry.registerIdentity(user1, address(identity1));
        assertTrue(identityRegistry.isRegistered(user1));
        
        // 2.2. Registrar identity de user2
        identityRegistry.registerIdentity(user2, address(identity2));
        assertTrue(identityRegistry.isRegistered(user2));
        
        // ========== PASO 3: Agregar Claims a las Identities ==========
        
        // 3.1. Agregar claim KYC a identity1 (de issuer1)
        // user1 es el owner de identity1, así que usamos vm.prank
        vm.prank(user1);
        identity1.addClaim(1, 1, issuer1, signature1, data1, uri1);
        assertTrue(identity1.claimExists(1, issuer1));
        
        // 3.2. Agregar claim AML a identity1 (de issuer1)
        bytes memory signature2 = "0xabcdef1234567890";
        bytes memory data2 = "0x9876543210fedcba";
        vm.prank(user1);
        identity1.addClaim(2, 1, issuer1, signature2, data2, "https://example.com/aml/user1");
        assertTrue(identity1.claimExists(2, issuer1));
        
        // 3.3. Agregar claim KYC a identity2 (de issuer2)
        vm.prank(user2);
        identity2.addClaim(1, 1, issuer2, signature1, data1, uri1);
        assertTrue(identity2.claimExists(1, issuer2));
        
        // ========== PASO 4: Verificar que el Sistema Funciona ==========
        
        // 4.1. Verificar que user1 tiene todos los claims requeridos
        assertTrue(verifyUserComplete(user1));
        
        // 4.2. Verificar que user2 NO tiene todos los claims requeridos (falta AML)
        assertFalse(verifyUserComplete(user2));
        
        // 4.3. Agregar claim AML a identity2 para completar verificación
        vm.prank(user2);
        identity2.addClaim(2, 1, issuer1, signature2, data2, "https://example.com/aml/user2");
        assertTrue(verifyUserComplete(user2));
    }
    
    /**
     * @dev Test que demuestra qué pasa cuando falta un claim requerido
     */
    function test_VerificationFails_WhenMissingRequiredClaim() public {
        // Configurar sistema
        claimTopicsRegistry.addClaimTopic(1); // KYC requerido
        claimTopicsRegistry.addClaimTopic(2); // AML requerido
        
        uint256[] memory topics = new uint256[](2);
        topics[0] = 1;
        topics[1] = 2;
        trustedIssuersRegistry.addTrustedIssuer(issuer1, topics);
        
        // Registrar identity
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // Agregar solo claim KYC (falta AML)
        vm.prank(user1);
        identity1.addClaim(1, 1, issuer1, signature1, data1, uri1);
        
        // Verificación debe fallar porque falta AML
        assertFalse(verifyUserComplete(user1));
    }
    
    /**
     * @dev Test que demuestra qué pasa cuando el issuer no es trusted
     */
    function test_VerificationFails_WhenIssuerNotTrusted() public {
        // Configurar sistema
        claimTopicsRegistry.addClaimTopic(1); // KYC requerido
        
        // NO agregar issuer1 como trusted
        
        // Registrar identity
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // Agregar claim de un issuer NO trusted
        vm.prank(user1);
        identity1.addClaim(1, 1, issuer1, signature1, data1, uri1);
        
        // Verificación debe fallar porque el issuer no es trusted
        assertFalse(verifyUserComplete(user1));
    }
    
    /**
     * @dev Test que demuestra qué pasa cuando el issuer no tiene permiso para el topic
     */
    function test_VerificationFails_WhenIssuerCannotIssueTopic() public {
        // Configurar sistema
        claimTopicsRegistry.addClaimTopic(2); // AML requerido
        
        // issuer1 solo puede emitir KYC, no AML
        uint256[] memory topics = new uint256[](1);
        topics[0] = 1; // Solo KYC
        trustedIssuersRegistry.addTrustedIssuer(issuer1, topics);
        
        // Registrar identity
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // Agregar claim AML de issuer1 (pero issuer1 no puede emitir AML)
        vm.prank(user1);
        identity1.addClaim(2, 1, issuer1, signature1, data1, uri1);
        
        // Verificación debe fallar porque issuer1 no puede emitir topic 2
        assertFalse(verifyUserComplete(user1));
    }
    
    /**
     * @dev Test que demuestra múltiples issuers para el mismo topic
     */
    function test_VerificationWorks_WithMultipleIssuersForSameTopic() public {
        // Configurar sistema
        claimTopicsRegistry.addClaimTopic(1); // KYC requerido
        
        // Agregar dos issuers que pueden emitir KYC
        uint256[] memory topics1 = new uint256[](1);
        topics1[0] = 1;
        trustedIssuersRegistry.addTrustedIssuer(issuer1, topics1);
        
        uint256[] memory topics2 = new uint256[](1);
        topics2[0] = 1;
        trustedIssuersRegistry.addTrustedIssuer(issuer2, topics2);
        
        // Registrar identity
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // Agregar claim KYC de issuer2 (no issuer1)
        vm.prank(user1);
        identity1.addClaim(1, 1, issuer2, signature1, data1, uri1);
        
        // Verificación debe pasar porque issuer2 es trusted y puede emitir KYC
        assertTrue(verifyUserComplete(user1));
    }
    
    /**
     * @dev Test que demuestra actualización de requirements
     */
    function test_VerificationUpdates_WhenRequirementsChange() public {
        // Configurar sistema inicial
        claimTopicsRegistry.addClaimTopic(1); // Solo KYC requerido
        
        uint256[] memory topics = new uint256[](2);
        topics[0] = 1;
        topics[1] = 2;
        trustedIssuersRegistry.addTrustedIssuer(issuer1, topics);
        
        // Registrar identity y agregar solo KYC
        identityRegistry.registerIdentity(user1, address(identity1));
        vm.prank(user1);
        identity1.addClaim(1, 1, issuer1, signature1, data1, uri1);
        
        // Inicialmente debe pasar (solo requiere KYC)
        assertTrue(verifyUserComplete(user1));
        
        // Agregar nuevo requirement: AML
        claimTopicsRegistry.addClaimTopic(2);
        
        // Ahora debe fallar (falta AML)
        assertFalse(verifyUserComplete(user1));
        
        // Agregar claim AML
        vm.prank(user1);
        identity1.addClaim(2, 1, issuer1, "0xabcdef", "0x123456", "https://aml");
        
        // Ahora debe pasar de nuevo
        assertTrue(verifyUserComplete(user1));
    }
    
    // ============ Helper Functions ============
    
    /**
     * @dev Función helper que verifica si un usuario está completamente verificado
     * Esta función replica la lógica que estará en Token.sol
     * @param user Dirección del usuario a verificar
     * @return true si el usuario está completamente verificado
     */
    function verifyUserComplete(address user) public view returns (bool) {
        // 1. Verificar que está registrado en IdentityRegistry
        if (!identityRegistry.isRegistered(user)) {
            return false;
        }
        
        // 2. Obtener el contrato de identity
        address identityAddress = identityRegistry.getIdentity(user);
        if (identityAddress == address(0)) {
            return false;
        }
        
        // 3. Obtener topics requeridos
        uint256[] memory requiredTopics = claimTopicsRegistry.getClaimTopics();
        
        // Si no hay topics requeridos, cualquier usuario registrado está verificado
        if (requiredTopics.length == 0) {
            return true;
        }
        
        // 4. Para cada topic requerido, verificar que existe claim válido
        for (uint256 i = 0; i < requiredTopics.length; i++) {
            bool hasValidClaim = false;
            
            // Buscar emisores confiables para este topic
            address[] memory trustedIssuers = trustedIssuersRegistry.getTrustedIssuers();
            
            for (uint256 j = 0; j < trustedIssuers.length; j++) {
                // Verificar que el issuer puede emitir este topic
                if (trustedIssuersRegistry.hasClaimTopic(trustedIssuers[j], requiredTopics[i])) {
                    // Verificar que el claim existe en el Identity
                    Identity identity = Identity(identityAddress);
                    if (identity.claimExists(requiredTopics[i], trustedIssuers[j])) {
                        hasValidClaim = true;
                        break;
                    }
                }
            }
            
            // Si no se encontró un claim válido para este topic, falla
            if (!hasValidClaim) {
                return false;
            }
        }
        
        return true;
    }
}

