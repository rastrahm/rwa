// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Identity} from "../src/Identity.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";
import {Token} from "../src/Token.sol";
import {MaxBalanceCompliance} from "../src/compliance/MaxBalanceCompliance.sol";
import {MaxHoldersCompliance} from "../src/compliance/MaxHoldersCompliance.sol";
import {TransferLockCompliance} from "../src/compliance/TransferLockCompliance.sol";
import {ComplianceAggregator} from "../src/compliance/ComplianceAggregator.sol";
import {TokenCloneFactory} from "../src/TokenCloneFactory.sol";
import {TokenCloneable} from "../src/TokenCloneable.sol";

/**
 * @title CompleteIntegrationTest
 * @dev Tests de integración end-to-end del sistema completo
 * 
 * Este test verifica que todos los componentes del sistema funcionan
 * correctamente juntos en un flujo completo.
 */
contract CompleteIntegrationTest is Test {
    // ============ Identity System ============
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    // ============ Compliance Modules ============
    MaxBalanceCompliance public maxBalanceCompliance;
    MaxHoldersCompliance public maxHoldersCompliance;
    TransferLockCompliance public transferLockCompliance;
    ComplianceAggregator public complianceAggregator;
    
    // ============ Token ============
    Token public token;
    
    // ============ Factory ============
    TokenCloneFactory public factory;
    
    // ============ Users ============
    address public owner;
    address public issuer1;
    address public user1;
    address public user2;
    address public user3;
    
    // ============ Test Data ============
    uint256 public constant TOPIC_KYC = 1;
    uint256 public constant TOPIC_AML = 2;
    bytes public signature = "0x1234";
    bytes public data = "0x5678";
    string public uri = "https://example.com";
    
    function setUp() public {
        owner = address(this);
        issuer1 = makeAddr("issuer1");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        // ============ Deploy Identity System ============
        identityRegistry = new IdentityRegistry(owner);
        trustedIssuersRegistry = new TrustedIssuersRegistry(owner);
        claimTopicsRegistry = new ClaimTopicsRegistry(owner);
        
        // ============ Deploy Token ============
        token = new Token(
            "RWA Token",
            "RWA",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // ============ Deploy Compliance Modules ============
        maxBalanceCompliance = new MaxBalanceCompliance(
            owner,
            1000 * 10**18, // Max 1000 tokens
            address(token)
        );
        
        maxHoldersCompliance = new MaxHoldersCompliance(
            owner,
            10, // Max 10 holders
            address(token)
        );
        
        transferLockCompliance = new TransferLockCompliance(owner, 7 days);
        
        complianceAggregator = new ComplianceAggregator(owner);
        
        // ============ Configure Compliance ============
        complianceAggregator.addModule(address(token), address(maxBalanceCompliance));
        complianceAggregator.addModule(address(token), address(maxHoldersCompliance));
        complianceAggregator.addModule(address(token), address(transferLockCompliance));
        complianceAggregator.setCurrentToken(address(token));
        
        token.addComplianceModule(address(complianceAggregator));
        
        // ============ Deploy Factory ============
        factory = new TokenCloneFactory(owner);
        
        // ============ Setup Identity System ============
        // Agregar trusted issuer
        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        trustedIssuersRegistry.addTrustedIssuer(issuer1, topics);
        
        // Agregar claim topic requerido
        claimTopicsRegistry.addClaimTopic(TOPIC_KYC);
    }
    
    // ============ Paso 6.2: Tests de Integración Completa ============
    
    /**
     * @dev Test: flujo completo end-to-end
     */
    function test_CompleteFlow() public {
        // 1. Setup identity system
        setupIdentitySystem();
        
        // 2. Setup compliance (ya está hecho en setUp)
        
        // 3. Setup token (ya está hecho en setUp)
        
        // 4. Verificar usuarios
        verifyUsers();
        
        // 5. Mint tokens
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 1000 * 10**18);
        
        assertEq(token.balanceOf(user1), 1000 * 10**18);
        assertEq(token.totalSupply(), 1000 * 10**18);
        
        // Avanzar tiempo para que expire el lock (7 días + 1 segundo)
        vm.warp(block.timestamp + 7 days + 1);
        
        // 6. Transfer tokens
        vm.prank(user1);
        token.transfer(user2, 500 * 10**18);
        
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.balanceOf(user2), 500 * 10**18);
        
        // 7. Verificar estado final
        assertEq(token.balanceOf(user2), 500 * 10**18);
        assertTrue(maxHoldersCompliance.isHolder(user1));
        assertTrue(maxHoldersCompliance.isHolder(user2));
    }
    
    /**
     * @dev Test: flujo completo con múltiples usuarios
     */
    function test_CompleteFlow_MultipleUsers() public {
        // Setup identities
        setupIdentityForUser(user1);
        setupIdentityForUser(user2);
        setupIdentityForUser(user3);
        
        // Verificar usuarios
        assertTrue(token.isVerified(user1));
        assertTrue(token.isVerified(user2));
        assertTrue(token.isVerified(user3));
        
        // Mint tokens
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 1000 * 10**18);
        token.mint(user2, 500 * 10**18);
        
        // Avanzar tiempo para que expire el lock (7 días + 1 segundo)
        vm.warp(block.timestamp + 7 days + 1);
        
        // Transferencias
        vm.prank(user1);
        token.transfer(user3, 200 * 10**18);
        
        vm.prank(user2);
        token.transfer(user3, 100 * 10**18);
        
        // Verificar balances finales
        assertEq(token.balanceOf(user1), 800 * 10**18);
        assertEq(token.balanceOf(user2), 400 * 10**18);
        assertEq(token.balanceOf(user3), 300 * 10**18);
        
        // Verificar holders
        assertEq(maxHoldersCompliance.getHoldersCount(), 3);
    }
    
    /**
     * @dev Test: compliance rechaza transferencia que excede límite
     */
    function test_Compliance_RejectsExceedingLimit() public {
        setupIdentityForUser(user1);
        setupIdentityForUser(user2);
        
        token.grantRole(token.AGENT_ROLE(), owner);
        
        // Mintear a user1 primero (dentro del límite)
        token.mint(user1, 1000 * 10**18);
        
        // Avanzar tiempo para que expire el lock
        vm.warp(block.timestamp + 7 days + 1);
        
        // Llenar el límite de holders (maxHoldersCompliance tiene límite de 10)
        // Ya tenemos user1, así que agregamos 9 más (total 10)
        for (uint256 i = 0; i < 9; i++) {
            address holder = makeAddr(string(abi.encodePacked("holder", i)));
            setupIdentityForUser(holder);
            token.mint(holder, 1 * 10**18);
        }
        
        // Ahora intentar transferir a user2 (holder 11)
        // maxHoldersCompliance debe rechazar
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, 100 * 10**18);
    }
    
    /**
     * @dev Test: transfer lock funciona correctamente
     */
    function test_TransferLock_WorksCorrectly() public {
        setupIdentityForUser(user1);
        setupIdentityForUser(user2);
        
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 1000 * 10**18);
        
        // user1 recibe tokens, debe estar bloqueado por 7 días
        assertTrue(transferLockCompliance.isLocked(user1));
        
        // Intentar transferir debe fallar
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, 100 * 10**18);
        
        // Avanzar tiempo (7 días + 1 segundo)
        vm.warp(block.timestamp + 7 days + 1);
        
        // Ahora debe poder transferir
        vm.prank(user1);
        token.transfer(user2, 100 * 10**18);
        
        assertEq(token.balanceOf(user2), 100 * 10**18);
    }
    
    /**
     * @dev Test: factory crea tokens correctamente
     */
    function test_Factory_CreatesTokens() public {
        address token1 = factory.createToken(
            "Token1",
            "TK1",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        address token2 = factory.createToken(
            "Token2",
            "TK2",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        assertTrue(token1 != address(0));
        assertTrue(token2 != address(0));
        assertTrue(token1 != token2);
        
        TokenCloneable token1Contract = TokenCloneable(token1);
        TokenCloneable token2Contract = TokenCloneable(token2);
        
        assertEq(token1Contract.name(), "Token1");
        assertEq(token2Contract.name(), "Token2");
    }
    
    /**
     * @dev Test: pause y unpause funcionan en flujo completo
     */
    function test_Pause_WorksInCompleteFlow() public {
        setupIdentityForUser(user1);
        setupIdentityForUser(user2);
        
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 1000 * 10**18);
        
        // Avanzar tiempo para que expire el lock
        vm.warp(block.timestamp + 7 days + 1);
        
        // Pausar token
        token.pause();
        assertTrue(token.paused());
        
        // Transferencia debe fallar
        vm.prank(user1);
        vm.expectRevert("Token is paused");
        token.transfer(user2, 100 * 10**18);
        
        // Despausar token
        token.unpause();
        assertFalse(token.paused());
        
        // Ahora debe funcionar
        vm.prank(user1);
        token.transfer(user2, 100 * 10**18);
        
        assertEq(token.balanceOf(user2), 100 * 10**18);
    }
    
    /**
     * @dev Test: freeze account funciona en flujo completo
     */
    function test_Freeze_WorksInCompleteFlow() public {
        setupIdentityForUser(user1);
        setupIdentityForUser(user2);
        
        token.grantRole(token.AGENT_ROLE(), owner);
        token.mint(user1, 1000 * 10**18);
        
        // Avanzar tiempo para que expire el lock
        vm.warp(block.timestamp + 7 days + 1);
        
        // Congelar cuenta
        token.freezeAccount(user1);
        assertTrue(token.isFrozen(user1));
        
        // Transferencia debe fallar
        vm.prank(user1);
        vm.expectRevert("Account is frozen");
        token.transfer(user2, 100 * 10**18);
        
        // Descongelar cuenta
        token.unfreezeAccount(user1);
        assertFalse(token.isFrozen(user1));
        
        // Ahora debe funcionar
        vm.prank(user1);
        token.transfer(user2, 100 * 10**18);
        
        assertEq(token.balanceOf(user2), 100 * 10**18);
    }
    
    // ============ Ejercicio 4: Test de Integración Completo ============
    
    /**
     * @dev Test: Flujo completo del inversor (Complete Investor Journey)
     * 
     * Este test implementa el flujo completo de un inversor:
     * 1. Investor registers identity
     * 2. Issuer adds KYC claim
     * 3. Investor receives tokens
     * 4. Wait for lock period
     * 5. Investor transfers tokens
     * 6. Verify all compliance checks
     */
    function test_CompleteInvestorJourney() public {
        address investor = makeAddr("investor");
        address recipient = makeAddr("recipient");
        uint256 mintAmount = 500 * 10**18;
        uint256 transferAmount = 200 * 10**18;
        
        // ============ PASO 1: Investor registers identity ============
        Identity investorIdentity = new Identity(investor);
        identityRegistry.registerIdentity(investor, address(investorIdentity));
        
        // Verificar que está registrado
        assertTrue(identityRegistry.isRegistered(investor));
        assertEq(identityRegistry.getIdentity(investor), address(investorIdentity));
        
        // En este punto, el investor NO está verificado (no tiene claims)
        assertFalse(token.isVerified(investor), "Investor should not be verified yet");
        
        // ============ PASO 2: Issuer adds KYC claim ============
        // El issuer agrega el claim de KYC al identity del investor
        vm.prank(investor); // El owner del identity debe ser quien agrega el claim
        investorIdentity.addClaim(
            TOPIC_KYC,
            1, // scheme (ECDSA)
            issuer1, // issuer confiable
            signature,
            data,
            "https://kyc-service.com/investor-123"
        );
        
        // Verificar que el claim existe
        assertTrue(investorIdentity.claimExists(TOPIC_KYC, issuer1));
        
        // Ahora el investor DEBE estar verificado
        assertTrue(token.isVerified(investor), "Investor should be verified after KYC claim");
        
        // ============ PASO 3: Investor receives tokens ============
        // Otorgar AGENT_ROLE al owner para poder mintear
        token.grantRole(token.AGENT_ROLE(), owner);
        
        // Mintear tokens al investor
        token.mint(investor, mintAmount);
        
        // Verificar balance
        assertEq(token.balanceOf(investor), mintAmount, "Investor should have received tokens");
        assertEq(token.totalSupply(), mintAmount, "Total supply should match");
        
        // Verificar compliance después del mint
        assertTrue(maxBalanceCompliance.canTransfer(address(0), investor, mintAmount), 
                   "Mint should comply with maxBalance");
        assertEq(maxHoldersCompliance.getHoldersCount(), 1, "Should have 1 holder");
        
        // Verificar que el investor está bloqueado por lock period
        assertTrue(transferLockCompliance.isLocked(investor), 
                   "Investor should be locked after receiving tokens");
        
        // ============ PASO 4: Wait for lock period ============
        uint256 lockPeriod = transferLockCompliance.lockPeriod();
        uint256 currentTime = block.timestamp;
        uint256 unlockTime = currentTime + lockPeriod;
        
        // Verificar que no puede transferir antes del unlock
        vm.prank(investor);
        vm.expectRevert();
        token.transfer(recipient, transferAmount);
        
        // Avanzar tiempo hasta justo antes del unlock (debe seguir bloqueado)
        vm.warp(unlockTime - 1);
        assertTrue(transferLockCompliance.isLocked(investor), 
                   "Investor should still be locked");
        
        vm.prank(investor);
        vm.expectRevert();
        token.transfer(recipient, transferAmount);
        
        // Avanzar tiempo hasta después del unlock
        vm.warp(unlockTime + 1);
        assertFalse(transferLockCompliance.isLocked(investor), 
                    "Investor should be unlocked");
        
        // ============ PASO 5: Investor transfers tokens ============
        // Setup del recipient (debe estar verificado para recibir tokens)
        Identity recipientIdentity = new Identity(recipient);
        identityRegistry.registerIdentity(recipient, address(recipientIdentity));
        
        vm.prank(recipient);
        recipientIdentity.addClaim(
            TOPIC_KYC,
            1,
            issuer1,
            signature,
            data,
            "https://kyc-service.com/recipient-456"
        );
        
        assertTrue(token.isVerified(recipient), "Recipient should be verified");
        
        // Realizar transferencia
        vm.prank(investor);
        token.transfer(recipient, transferAmount);
        
        // ============ PASO 6: Verify all compliance checks ============
        
        // 6.1 Verificar balances después de la transferencia
        assertEq(token.balanceOf(investor), mintAmount - transferAmount,
                 "Investor balance should decrease");
        assertEq(token.balanceOf(recipient), transferAmount,
                 "Recipient balance should increase");
        
        // 6.2 Verificar MaxBalanceCompliance
        assertTrue(maxBalanceCompliance.canTransfer(address(0), investor, 1),
                   "MaxBalance should allow more tokens");
        assertTrue(token.balanceOf(recipient) <= maxBalanceCompliance.maxBalance(), 
                   "Recipient balance should not exceed max");
        
        // 6.3 Verificar MaxHoldersCompliance
        assertEq(maxHoldersCompliance.getHoldersCount(), 2, "Should have 2 holders now");
        assertTrue(maxHoldersCompliance.isHolder(investor), "Investor should be a holder");
        assertTrue(maxHoldersCompliance.isHolder(recipient), "Recipient should be a holder");
        assertTrue(maxHoldersCompliance.getHoldersCount() <= maxHoldersCompliance.maxHolders(), 
                   "Holders count should not exceed max");
        
        // 6.4 Verificar TransferLockCompliance
        assertFalse(transferLockCompliance.isLocked(investor), 
                    "Investor should not be locked after lock period");
        assertTrue(transferLockCompliance.isLocked(recipient), 
                   "Recipient should be locked after receiving tokens");
        
        // 6.5 Verificar Identity System
        assertTrue(token.isVerified(investor), "Investor should remain verified");
        assertTrue(token.isVerified(recipient), "Recipient should remain verified");
        assertTrue(identityRegistry.isRegistered(investor), "Investor should be registered");
        assertTrue(identityRegistry.isRegistered(recipient), "Recipient should be registered");
        
        // 6.6 Verificar ComplianceAggregator
        assertEq(complianceAggregator.getModulesCountForToken(address(token)), 3, 
                 "Should have 3 compliance modules");
        
        // 6.7 Verificar total supply
        assertEq(token.totalSupply(), mintAmount, 
                 "Total supply should remain unchanged");
    }
    
    // ============ Helper Functions ============
    
    function setupIdentitySystem() internal {
        setupIdentityForUser(user1);
        setupIdentityForUser(user2);
    }
    
    function setupIdentityForUser(address user) internal {
        // Crear identity
        Identity identity = new Identity(user);
        
        // Registrar identity
        identityRegistry.registerIdentity(user, address(identity));
        
        // Agregar claim
        vm.prank(user);
        identity.addClaim(
            TOPIC_KYC,
            1, // scheme
            issuer1,
            signature,
            data,
            uri
        );
    }
    
    function verifyUsers() internal view {
        assertTrue(token.isVerified(user1));
        assertTrue(token.isVerified(user2));
    }
}

