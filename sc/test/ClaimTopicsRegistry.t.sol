// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ClaimTopicsRegistry} from "../src/ClaimTopicsRegistry.sol";

contract ClaimTopicsRegistryTest is Test {
    ClaimTopicsRegistry public registry;
    address public owner;
    address public user1;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        registry = new ClaimTopicsRegistry(owner);
    }
    
    // ============ Paso 1.5: Claim Topics Básico ============
    
    function test_Constructor() public {
        assertEq(registry.owner(), owner);
    }
    
    function test_AddClaimTopic() public {
        registry.addClaimTopic(1); // KYC required
        
        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 1);
        assertEq(topics[0], 1);
    }
    
    function test_RevertWhen_AddClaimTopic_AlreadyExists() public {
        registry.addClaimTopic(1);
        
        vm.expectRevert("Claim topic already exists");
        registry.addClaimTopic(1);
    }
    
    function test_RevertWhen_AddClaimTopic_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.addClaimTopic(1);
    }
    
    // ============ Funcionalidades Adicionales ============
    
    function test_ClaimTopicExists() public {
        assertFalse(registry.claimTopicExists(1));
        
        registry.addClaimTopic(1);
        assertTrue(registry.claimTopicExists(1));
    }
    
    function test_RemoveClaimTopic() public {
        registry.addClaimTopic(1);
        registry.addClaimTopic(2);
        
        assertTrue(registry.claimTopicExists(1));
        assertTrue(registry.claimTopicExists(2));
        
        registry.removeClaimTopic(1);
        
        assertFalse(registry.claimTopicExists(1));
        assertTrue(registry.claimTopicExists(2));
        
        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 1);
        assertEq(topics[0], 2);
    }
    
    function test_RevertWhen_RemoveClaimTopic_DoesNotExist() public {
        vm.expectRevert("Claim topic does not exist");
        registry.removeClaimTopic(1);
    }
    
    function test_RevertWhen_RemoveClaimTopic_NotOwner() public {
        registry.addClaimTopic(1);
        
        vm.prank(user1);
        vm.expectRevert();
        registry.removeClaimTopic(1);
    }
    
    function test_GetClaimTopicsCount() public {
        assertEq(registry.getClaimTopicsCount(), 0);
        
        registry.addClaimTopic(1);
        assertEq(registry.getClaimTopicsCount(), 1);
        
        registry.addClaimTopic(2);
        assertEq(registry.getClaimTopicsCount(), 2);
        
        registry.removeClaimTopic(1);
        assertEq(registry.getClaimTopicsCount(), 1);
    }
    
    function test_MultipleClaimTopics() public {
        registry.addClaimTopic(1); // KYC
        registry.addClaimTopic(2); // AML
        registry.addClaimTopic(3); // Accreditation
        
        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 3);
        assertEq(topics[0], 1);
        assertEq(topics[1], 2);
        assertEq(topics[2], 3);
        
        // Verificar que todos existen
        assertTrue(registry.claimTopicExists(1));
        assertTrue(registry.claimTopicExists(2));
        assertTrue(registry.claimTopicExists(3));
    }
    
    function test_RemoveClaimTopic_MiddleElement() public {
        registry.addClaimTopic(1);
        registry.addClaimTopic(2);
        registry.addClaimTopic(3);
        
        // Remover el del medio (2)
        registry.removeClaimTopic(2);
        
        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 2);
        // El algoritmo swap hace que el último se mueva a la posición del eliminado
        assertTrue(topics[0] == 1 || topics[0] == 3);
        assertTrue(topics[1] == 1 || topics[1] == 3);
        assertTrue(topics[0] != topics[1]);
        
        assertFalse(registry.claimTopicExists(2));
        assertTrue(registry.claimTopicExists(1));
        assertTrue(registry.claimTopicExists(3));
    }
    
    function test_RemoveClaimTopic_LastElement() public {
        registry.addClaimTopic(1);
        registry.addClaimTopic(2);
        
        registry.removeClaimTopic(2);
        
        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 1);
        assertEq(topics[0], 1);
    }
    
    function test_RemoveClaimTopic_FirstElement() public {
        registry.addClaimTopic(1);
        registry.addClaimTopic(2);
        registry.addClaimTopic(3);
        
        registry.removeClaimTopic(1);
        
        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 2);
        // El último (3) se mueve a la posición del primero (1)
        assertEq(topics[0], 3);
        assertEq(topics[1], 2);
        
        assertFalse(registry.claimTopicExists(1));
    }
}

