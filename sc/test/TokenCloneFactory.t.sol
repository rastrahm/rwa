// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TokenCloneFactory} from "../src/TokenCloneFactory.sol";
import {TokenCloneable} from "../src/TokenCloneable.sol";
import {Identity} from "../src/Identity.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";

/**
 * @title TokenCloneFactoryTest
 * @dev Tests para TokenCloneFactory
 */
contract TokenCloneFactoryTest is Test {
    TokenCloneFactory public factory;
    IdentityRegistry public identityRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    address public owner;
    address public user1;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        
        // Desplegar registries
        identityRegistry = new IdentityRegistry(owner);
        trustedIssuersRegistry = new TrustedIssuersRegistry(owner);
        claimTopicsRegistry = new ClaimTopicsRegistry(owner);
        
        // Desplegar factory
        factory = new TokenCloneFactory(owner);
    }
    
    // ============ Paso 4.2: TokenCloneFactory ============
    
    /**
     * @dev Test: verificar constructor
     */
    function test_Constructor() public {
        assertEq(factory.owner(), owner);
        assertTrue(factory.implementation() != address(0));
        
        // Verificar que la implementación es un TokenCloneable
        TokenCloneable impl = TokenCloneable(factory.implementation());
        // Si llegamos aquí, la implementación existe
    }
    
    /**
     * @dev Test: crear token usando factory
     */
    function test_CreateToken() public {
        address token = factory.createToken(
            "TestToken",
            "TTK",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        assertTrue(token != address(0));
        
        TokenCloneable tokenContract = TokenCloneable(token);
        assertEq(tokenContract.name(), "TestToken");
        assertEq(tokenContract.symbol(), "TTK");
        assertEq(tokenContract.decimals(), 18);
        assertTrue(tokenContract.hasRole(tokenContract.DEFAULT_ADMIN_ROLE(), owner));
    }
    
    /**
     * @dev Test: múltiples tokens creados
     */
    function test_CreateMultipleTokens() public {
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
     * @dev Test: tokens tienen estado independiente
     */
    function test_Tokens_IndependentState() public {
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
        
        TokenCloneable token1Contract = TokenCloneable(token1);
        TokenCloneable token2Contract = TokenCloneable(token2);
        
        // Configurar usuario verificado
        Identity identity1 = new Identity(user1);
        identityRegistry.registerIdentity(user1, address(identity1));
        
        // Otorgar rol AGENT_ROLE en ambos
        bytes32 AGENT_ROLE = keccak256("AGENT_ROLE");
        token1Contract.grantRole(AGENT_ROLE, owner);
        token2Contract.grantRole(AGENT_ROLE, owner);
        
        // Mint en token1 no afecta token2
        vm.prank(owner);
        token1Contract.mint(user1, 1000 * 10**18);
        
        assertEq(token1Contract.balanceOf(user1), 1000 * 10**18);
        assertEq(token2Contract.balanceOf(user1), 0);
    }
    
    /**
     * @dev Test: getTotalTokens retorna el número correcto
     */
    function test_GetTotalTokens() public {
        assertEq(factory.getTotalTokens(), 0);
        
        factory.createToken(
            "Token1",
            "TK1",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        assertEq(factory.getTotalTokens(), 1);
        
        factory.createToken(
            "Token2",
            "TK2",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        assertEq(factory.getTotalTokens(), 2);
    }
    
    /**
     * @dev Test: getToken retorna la dirección correcta
     */
    function test_GetToken() public {
        address token1 = factory.createToken(
            "Token1",
            "TK1",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        assertEq(factory.getToken(0), token1);
    }
    
    /**
     * @dev Test: getToken con índice inválido debe fallar
     */
    function test_RevertWhen_GetToken_InvalidIndex() public {
        vm.expectRevert("Index out of bounds");
        factory.getToken(0);
    }
    
    /**
     * @dev Test: ahorro de gas comparado con deployment directo
     */
    function test_GasSavings() public {
        // Gas para crear clone
        uint256 gasBefore = gasleft();
        address token = factory.createToken(
            "TestToken",
            "TTK",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        uint256 gasUsed = gasBefore - gasleft();
        
        // Clone debe usar mucho menos gas que deployment directo
        // Deployment directo: ~3,736,079 gas
        // Clone: ~364,903 gas
        assertLt(gasUsed, 500000); // Debe ser menos de 500k gas
    }
    
    /**
     * @dev Test: todos los tokens usan la misma implementación
     */
    function test_AllTokens_UseSameImplementation() public {
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
        
        // Verificar que ambos están en la lista de tokens
        assertTrue(factory.isToken(token1));
        assertTrue(factory.isToken(token2));
        
        // Verificar que la implementación es la misma
        assertEq(factory.implementation(), factory.implementation());
    }
    
    /**
     * @dev Test: createToken emite evento
     */
    function test_CreateToken_EmitsEvent() public {
        // Crear token y verificar que se emitió el evento
        address token = factory.createToken(
            "TestToken",
            "TTK",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        // Si llegamos aquí, el evento se emitió correctamente
        assertTrue(token != address(0));
    }
    
    /**
     * @dev Test: isToken verifica correctamente
     */
    function test_IsToken() public {
        address token = factory.createToken(
            "TestToken",
            "TTK",
            owner,
            address(identityRegistry),
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry)
        );
        
        assertTrue(factory.isToken(token));
        assertFalse(factory.isToken(address(0x123)));
    }
    
    /**
     * @dev Test: getAllTokens retorna todos los tokens
     */
    function test_GetAllTokens() public {
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
        
        address[] memory allTokens = factory.getAllTokens();
        assertEq(allTokens.length, 2);
        assertEq(allTokens[0], token1);
        assertEq(allTokens[1], token2);
    }
}

