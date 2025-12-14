// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Identity} from "../src/Identity.sol";

contract IdentityTest is Test {
    Identity public identity;
    address public owner;
    address public user1;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
    }
    
    // ============ Paso 1.1: Estructura Básica ============
    
    function test_Constructor() public {
        identity = new Identity(owner);
        assertEq(identity.owner(), owner);
    }
    
    // ============ Paso 1.2: Agregar Claims ============
    
    function test_AddClaim() public {
        identity = new Identity(owner);
        
        uint256 topic = 1;
        uint256 scheme = 1;
        address issuer = makeAddr("issuer");
        bytes memory signature = "0x1234";
        bytes memory data = "0x5678";
        string memory uri = "https://example.com";
        
        bytes32 claimId = identity.addClaim(topic, scheme, issuer, signature, data, uri);
        
        // Verificar que el claimId no es cero
        assertTrue(claimId != bytes32(0));
        
        // Verificar que el claim existe
        assertTrue(identity.claimExists(topic, issuer));
    }
    
    function test_GetClaim() public {
        identity = new Identity(owner);
        
        uint256 topic = 1;
        uint256 scheme = 1;
        address issuer = makeAddr("issuer");
        bytes memory signature = "0x1234";
        bytes memory data = "0x5678";
        string memory uri = "https://example.com";
        
        identity.addClaim(topic, scheme, issuer, signature, data, uri);
        
        (uint256 t, uint256 s, address i, bytes memory sig, bytes memory d, string memory u) = 
            identity.getClaim(topic, issuer);
        
        assertEq(t, topic);
        assertEq(s, scheme);
        assertEq(i, issuer);
        assertEq(sig, signature);
        assertEq(d, data);
        assertEq(u, uri);
    }
    
    function test_ClaimExists_ReturnsFalse_WhenClaimDoesNotExist() public {
        identity = new Identity(owner);
        
        assertFalse(identity.claimExists(1, makeAddr("issuer")));
    }
    
    function test_RemoveClaim() public {
        identity = new Identity(owner);
        
        uint256 topic = 1;
        address issuer = makeAddr("issuer");
        bytes memory signature = "0x1234";
        bytes memory data = "0x5678";
        
        identity.addClaim(topic, 1, issuer, signature, data, "");
        assertTrue(identity.claimExists(topic, issuer));
        
        bool removed = identity.removeClaim(topic, issuer);
        assertTrue(removed);
        assertFalse(identity.claimExists(topic, issuer));
    }
    
    function test_RevertWhen_AddClaim_NotOwner() public {
        identity = new Identity(owner);
        
        vm.prank(user1);
        vm.expectRevert();
        identity.addClaim(1, 1, makeAddr("issuer"), "0x", "0x", "");
    }
    
    function test_RevertWhen_RemoveClaim_NotOwner() public {
        identity = new Identity(owner);
        
        identity.addClaim(1, 1, makeAddr("issuer"), "0x", "0x", "");
        
        vm.prank(user1);
        vm.expectRevert();
        identity.removeClaim(1, makeAddr("issuer"));
    }
}

