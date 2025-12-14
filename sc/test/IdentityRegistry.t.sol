// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Identity} from "../src/Identity.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry public registry;
    Identity public identity;
    address public owner;
    address public user1;
    address public user2;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        registry = new IdentityRegistry(owner);
    }
    
    // ============ Paso 1.3: Registro Básico ============
    
    function test_Constructor() public {
        assertEq(registry.owner(), owner);
    }
    
    function test_RegisterIdentity() public {
        identity = new Identity(user1);
        registry.registerIdentity(user1, address(identity));
        
        assertTrue(registry.isRegistered(user1));
        assertEq(registry.getIdentity(user1), address(identity));
    }
    
    function test_RevertWhen_RegisterIdentity_InvalidWallet() public {
        identity = new Identity(user1);
        vm.expectRevert("Invalid wallet address");
        registry.registerIdentity(address(0), address(identity));
    }
    
    function test_RevertWhen_RegisterIdentity_InvalidIdentity() public {
        vm.expectRevert("Invalid identity address");
        registry.registerIdentity(user1, address(0));
    }
    
    function test_RevertWhen_RegisterIdentity_AlreadyRegistered() public {
        identity = new Identity(user1);
        registry.registerIdentity(user1, address(identity));
        
        Identity identity2 = new Identity(user1);
        vm.expectRevert("Wallet already registered");
        registry.registerIdentity(user1, address(identity2));
    }
    
    function test_RevertWhen_RegisterIdentity_NotOwner() public {
        identity = new Identity(user1);
        vm.prank(user2);
        vm.expectRevert();
        registry.registerIdentity(user1, address(identity));
    }
    
    // ============ Funcionalidades Adicionales ============
    
    function test_UpdateIdentity() public {
        identity = new Identity(user1);
        registry.registerIdentity(user1, address(identity));
        
        Identity newIdentity = new Identity(user1);
        registry.updateIdentity(user1, address(newIdentity));
        
        assertEq(registry.getIdentity(user1), address(newIdentity));
        assertTrue(registry.isRegistered(user1));
    }
    
    function test_RevertWhen_UpdateIdentity_WalletNotRegistered() public {
        Identity newIdentity = new Identity(user1);
        vm.expectRevert("Wallet not registered");
        registry.updateIdentity(user1, address(newIdentity));
    }
    
    function test_RemoveIdentity() public {
        identity = new Identity(user1);
        registry.registerIdentity(user1, address(identity));
        assertTrue(registry.isRegistered(user1));
        
        registry.removeIdentity(user1);
        assertFalse(registry.isRegistered(user1));
        assertEq(registry.getIdentity(user1), address(0));
    }
    
    function test_RevertWhen_RemoveIdentity_WalletNotRegistered() public {
        vm.expectRevert("Wallet not registered");
        registry.removeIdentity(user1);
    }
    
    function test_GetRegisteredCount() public {
        assertEq(registry.getRegisteredCount(), 0);
        
        identity = new Identity(user1);
        registry.registerIdentity(user1, address(identity));
        assertEq(registry.getRegisteredCount(), 1);
        
        Identity identity2 = new Identity(user2);
        registry.registerIdentity(user2, address(identity2));
        assertEq(registry.getRegisteredCount(), 2);
    }
    
    function test_GetRegisteredAddress() public {
        identity = new Identity(user1);
        registry.registerIdentity(user1, address(identity));
        
        Identity identity2 = new Identity(user2);
        registry.registerIdentity(user2, address(identity2));
        
        assertEq(registry.getRegisteredAddress(0), user1);
        assertEq(registry.getRegisteredAddress(1), user2);
    }
    
    function test_RevertWhen_GetRegisteredAddress_IndexOutOfBounds() public {
        vm.expectRevert("Index out of bounds");
        registry.getRegisteredAddress(0);
    }
    
    function test_RemoveIdentity_UpdatesRegisteredCount() public {
        identity = new Identity(user1);
        registry.registerIdentity(user1, address(identity));
        
        Identity identity2 = new Identity(user2);
        registry.registerIdentity(user2, address(identity2));
        
        assertEq(registry.getRegisteredCount(), 2);
        
        registry.removeIdentity(user1);
        assertEq(registry.getRegisteredCount(), 1);
        assertEq(registry.getRegisteredAddress(0), user2);
    }
}

