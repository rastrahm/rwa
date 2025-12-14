// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";

contract TrustedIssuersRegistryTest is Test {
    TrustedIssuersRegistry public registry;
    address public owner;
    address public issuer1;
    address public issuer2;
    
    function setUp() public {
        owner = address(this);
        issuer1 = makeAddr("issuer1");
        issuer2 = makeAddr("issuer2");
        registry = new TrustedIssuersRegistry(owner);
    }
    
    // ============ Paso 1.4: Trusted Issuers Básico ============
    
    function test_Constructor() public {
        assertEq(registry.owner(), owner);
    }
    
    function test_AddTrustedIssuer() public {
        uint256[] memory topics = new uint256[](2);
        topics[0] = 1; // KYC
        topics[1] = 2; // AML
        
        registry.addTrustedIssuer(issuer1, topics);
        
        assertTrue(registry.isTrustedIssuer(issuer1));
        assertTrue(registry.hasClaimTopic(issuer1, 1));
        assertTrue(registry.hasClaimTopic(issuer1, 2));
    }
    
    function test_RevertWhen_AddTrustedIssuer_InvalidAddress() public {
        uint256[] memory topics = new uint256[](1);
        topics[0] = 1;
        
        vm.expectRevert("Invalid issuer address");
        registry.addTrustedIssuer(address(0), topics);
    }
    
    function test_RevertWhen_AddTrustedIssuer_AlreadyTrusted() public {
        uint256[] memory topics = new uint256[](1);
        topics[0] = 1;
        
        registry.addTrustedIssuer(issuer1, topics);
        
        vm.expectRevert("Issuer already trusted");
        registry.addTrustedIssuer(issuer1, topics);
    }
    
    function test_RevertWhen_AddTrustedIssuer_EmptyTopics() public {
        uint256[] memory topics = new uint256[](0);
        
        vm.expectRevert("Must specify at least one claim topic");
        registry.addTrustedIssuer(issuer1, topics);
    }
    
    function test_RevertWhen_AddTrustedIssuer_NotOwner() public {
        uint256[] memory topics = new uint256[](1);
        topics[0] = 1;
        
        vm.prank(issuer2);
        vm.expectRevert();
        registry.addTrustedIssuer(issuer1, topics);
    }
    
    // ============ Funcionalidades Adicionales ============
    
    function test_GetIssuerClaimTopics() public {
        uint256[] memory topics = new uint256[](3);
        topics[0] = 1;
        topics[1] = 2;
        topics[2] = 3;
        
        registry.addTrustedIssuer(issuer1, topics);
        
        uint256[] memory retrievedTopics = registry.getIssuerClaimTopics(issuer1);
        assertEq(retrievedTopics.length, 3);
        assertEq(retrievedTopics[0], 1);
        assertEq(retrievedTopics[1], 2);
        assertEq(retrievedTopics[2], 3);
    }
    
    function test_HasClaimTopic_ReturnsFalse_WhenIssuerNotTrusted() public {
        assertFalse(registry.hasClaimTopic(issuer1, 1));
    }
    
    function test_HasClaimTopic_ReturnsFalse_WhenTopicNotInList() public {
        uint256[] memory topics = new uint256[](2);
        topics[0] = 1;
        topics[1] = 2;
        
        registry.addTrustedIssuer(issuer1, topics);
        
        assertFalse(registry.hasClaimTopic(issuer1, 99));
    }
    
    function test_RemoveTrustedIssuer() public {
        uint256[] memory topics = new uint256[](1);
        topics[0] = 1;
        
        registry.addTrustedIssuer(issuer1, topics);
        assertTrue(registry.isTrustedIssuer(issuer1));
        
        registry.removeTrustedIssuer(issuer1);
        assertFalse(registry.isTrustedIssuer(issuer1));
        assertFalse(registry.hasClaimTopic(issuer1, 1));
    }
    
    function test_RevertWhen_RemoveTrustedIssuer_NotTrusted() public {
        vm.expectRevert("Issuer not trusted");
        registry.removeTrustedIssuer(issuer1);
    }
    
    function test_UpdateIssuerClaimTopics() public {
        uint256[] memory initialTopics = new uint256[](2);
        initialTopics[0] = 1;
        initialTopics[1] = 2;
        
        registry.addTrustedIssuer(issuer1, initialTopics);
        
        uint256[] memory newTopics = new uint256[](2);
        newTopics[0] = 3;
        newTopics[1] = 4;
        
        registry.updateIssuerClaimTopics(issuer1, newTopics);
        
        assertTrue(registry.hasClaimTopic(issuer1, 3));
        assertTrue(registry.hasClaimTopic(issuer1, 4));
        assertFalse(registry.hasClaimTopic(issuer1, 1));
        assertFalse(registry.hasClaimTopic(issuer1, 2));
    }
    
    function test_RevertWhen_UpdateIssuerClaimTopics_NotTrusted() public {
        uint256[] memory topics = new uint256[](1);
        topics[0] = 1;
        
        vm.expectRevert("Issuer not trusted");
        registry.updateIssuerClaimTopics(issuer1, topics);
    }
    
    function test_RevertWhen_UpdateIssuerClaimTopics_EmptyTopics() public {
        uint256[] memory initialTopics = new uint256[](1);
        initialTopics[0] = 1;
        
        registry.addTrustedIssuer(issuer1, initialTopics);
        
        uint256[] memory emptyTopics = new uint256[](0);
        vm.expectRevert("Must specify at least one claim topic");
        registry.updateIssuerClaimTopics(issuer1, emptyTopics);
    }
    
    function test_GetTrustedIssuers() public {
        uint256[] memory topics1 = new uint256[](1);
        topics1[0] = 1;
        
        uint256[] memory topics2 = new uint256[](1);
        topics2[0] = 2;
        
        registry.addTrustedIssuer(issuer1, topics1);
        registry.addTrustedIssuer(issuer2, topics2);
        
        address[] memory issuers = registry.getTrustedIssuers();
        assertEq(issuers.length, 2);
        assertEq(issuers[0], issuer1);
        assertEq(issuers[1], issuer2);
    }
    
    function test_GetTrustedIssuersCount() public {
        assertEq(registry.getTrustedIssuersCount(), 0);
        
        uint256[] memory topics = new uint256[](1);
        topics[0] = 1;
        
        registry.addTrustedIssuer(issuer1, topics);
        assertEq(registry.getTrustedIssuersCount(), 1);
        
        uint256[] memory topics2 = new uint256[](1);
        topics2[0] = 2;
        registry.addTrustedIssuer(issuer2, topics2);
        assertEq(registry.getTrustedIssuersCount(), 2);
    }
    
    function test_RemoveTrustedIssuer_UpdatesCount() public {
        uint256[] memory topics1 = new uint256[](1);
        topics1[0] = 1;
        
        uint256[] memory topics2 = new uint256[](1);
        topics2[0] = 2;
        
        registry.addTrustedIssuer(issuer1, topics1);
        registry.addTrustedIssuer(issuer2, topics2);
        
        assertEq(registry.getTrustedIssuersCount(), 2);
        
        registry.removeTrustedIssuer(issuer1);
        assertEq(registry.getTrustedIssuersCount(), 1);
        
        address[] memory issuers = registry.getTrustedIssuers();
        assertEq(issuers[0], issuer2);
    }
}

