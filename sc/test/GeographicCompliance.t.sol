// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {GeographicCompliance} from "../src/compliance/GeographicCompliance.sol";
import {ICompliance} from "../src/ICompliance.sol";

/**
 * @title GeographicComplianceTest
 * @dev Tests para el módulo GeographicCompliance
 */
contract GeographicComplianceTest is Test {
    GeographicCompliance public geographicCompliance;
    
    address public owner;
    address public user1;
    address public user2;
    address public user3;
    address public userWithoutCountry;
    
    // Países
    string public constant COUNTRY_US = "US";
    string public constant COUNTRY_MX = "MX";
    string public constant COUNTRY_BR = "BR";
    string public constant COUNTRY_CA = "CA"; // No permitido inicialmente
    
    function setUp() public {
        owner = address(this);
        user1 = address(0x1111);
        user2 = address(0x2222);
        user3 = address(0x3333);
        userWithoutCountry = address(0x4444);
        
        // Deploy GeographicCompliance
        geographicCompliance = new GeographicCompliance(owner);
        
        // Agregar países permitidos
        geographicCompliance.addAllowedCountry(COUNTRY_US);
        geographicCompliance.addAllowedCountry(COUNTRY_MX);
        geographicCompliance.addAllowedCountry(COUNTRY_BR);
        
        // Asignar países a usuarios
        geographicCompliance.setUserCountry(user1, COUNTRY_US);
        geographicCompliance.setUserCountry(user2, COUNTRY_US);
        geographicCompliance.setUserCountry(user3, COUNTRY_MX);
        
        // userWithoutCountry no tiene país asignado
    }
    
    // ============ Test 1: Transfers entre usuarios del mismo país permitido ============
    
    function test_CanTransfer_BetweenUsersSameAllowedCountry() public view {
        // user1 y user2 son ambos de "US" (país permitido)
        bool canTransfer = geographicCompliance.canTransfer(user1, user2, 100);
        assertTrue(canTransfer, "Should allow transfer between users of same allowed country");
    }
    
    function test_CanTransfer_BetweenDifferentAllowedCountries() public view {
        // user1 es de "US", user3 es de "MX" (ambos países permitidos)
        bool canTransfer = geographicCompliance.canTransfer(user1, user3, 100);
        assertTrue(canTransfer, "Should allow transfer between users of different allowed countries");
    }
    
    function test_CanTransfer_FromSameCountryToSameCountry() public {
        // Configurar ambos usuarios del mismo país
        geographicCompliance.setUserCountry(user1, COUNTRY_US);
        geographicCompliance.setUserCountry(user2, COUNTRY_US);
        
        // Verificar que puede transferir
        bool canTransfer = geographicCompliance.canTransfer(user1, user2, 100);
        assertTrue(canTransfer);
    }
    
    // ============ Test 2: Transfers a país no permitido bloqueados ============
    
    function test_CannotTransfer_ToUserFromNotAllowedCountry() public {
        // Agregar usuario de país NO permitido
        geographicCompliance.setUserCountry(userWithoutCountry, COUNTRY_CA);
        
        // user1 (US permitido) intenta transferir a userWithoutCountry (CA no permitido)
        bool canTransfer = geographicCompliance.canTransfer(user1, userWithoutCountry, 100);
        assertFalse(canTransfer, "Should block transfer to user from not allowed country");
    }
    
    function test_CannotTransfer_FromUserFromNotAllowedCountry() public {
        // Agregar usuario de país NO permitido
        geographicCompliance.setUserCountry(userWithoutCountry, COUNTRY_CA);
        
        // userWithoutCountry (CA no permitido) intenta transferir a user1 (US permitido)
        bool canTransfer = geographicCompliance.canTransfer(userWithoutCountry, user1, 100);
        assertFalse(canTransfer, "Should block transfer from user from not allowed country");
    }
    
    function test_CannotTransfer_BetweenUsersFromNotAllowedCountries() public {
        address user4 = address(0x5555);
        address user5 = address(0x6666);
        
        // Configurar usuarios de país NO permitido
        geographicCompliance.setUserCountry(user4, COUNTRY_CA);
        geographicCompliance.setUserCountry(user5, COUNTRY_CA);
        
        // Intentar transferir entre usuarios de país no permitido
        bool canTransfer = geographicCompliance.canTransfer(user4, user5, 100);
        assertFalse(canTransfer, "Should block transfer between users from not allowed countries");
    }
    
    function test_CannotTransfer_AfterRemovingCountryFromAllowedList() public {
        // user1 y user2 son ambos de "US" (inicialmente permitido)
        assertTrue(geographicCompliance.canTransfer(user1, user2, 100));
        
        // Remover "US" de la lista de países permitidos
        geographicCompliance.removeAllowedCountry(COUNTRY_US);
        
        // Ahora no debería poder transferir
        bool canTransfer = geographicCompliance.canTransfer(user1, user2, 100);
        assertFalse(canTransfer, "Should block transfer after removing country from allowed list");
    }
    
    // ============ Test 3: Gestión de usuarios sin país asignado ============
    
    function test_CannotTransfer_WhenSenderHasNoCountry() public view {
        // userWithoutCountry no tiene país asignado
        // user1 (US permitido) intenta transferir a userWithoutCountry
        bool canTransfer = geographicCompliance.canTransfer(user1, userWithoutCountry, 100);
        assertFalse(canTransfer, "Should block transfer when recipient has no country");
    }
    
    function test_CannotTransfer_WhenRecipientHasNoCountry() public view {
        // userWithoutCountry no tiene país asignado
        // userWithoutCountry intenta transferir a user1 (US permitido)
        bool canTransfer = geographicCompliance.canTransfer(userWithoutCountry, user1, 100);
        assertFalse(canTransfer, "Should block transfer when sender has no country");
    }
    
    function test_CannotTransfer_WhenBothUsersHaveNoCountry() public {
        address user4 = address(0x5555);
        address user5 = address(0x6666);
        // Ambos sin país asignado
        
        bool canTransfer = geographicCompliance.canTransfer(user4, user5, 100);
        assertFalse(canTransfer, "Should block transfer when both users have no country");
    }
    
    function test_CanTransfer_AfterAssigningCountry() public {
        // Inicialmente userWithoutCountry no tiene país
        assertFalse(geographicCompliance.canTransfer(userWithoutCountry, user1, 100));
        
        // Asignar país permitido
        geographicCompliance.setUserCountry(userWithoutCountry, COUNTRY_US);
        
        // Ahora debería poder transferir
        bool canTransfer = geographicCompliance.canTransfer(userWithoutCountry, user1, 100);
        assertTrue(canTransfer, "Should allow transfer after assigning allowed country");
    }
    
    function test_CanReceive_WhenUserHasAllowedCountry() public view {
        // Verificar que user1 puede recibir tokens (mint)
        bool canReceive = geographicCompliance.canTransfer(address(0), user1, 100);
        assertTrue(canReceive, "Should allow mint to user with allowed country");
    }
    
    function test_CannotReceive_WhenUserHasNoCountry() public view {
        // Verificar que userWithoutCountry NO puede recibir tokens (mint)
        bool canReceive = geographicCompliance.canTransfer(address(0), userWithoutCountry, 100);
        assertFalse(canReceive, "Should block mint to user without country");
    }
    
    function test_CannotReceive_WhenUserHasNotAllowedCountry() public {
        // Asignar país NO permitido
        geographicCompliance.setUserCountry(userWithoutCountry, COUNTRY_CA);
        
        // Verificar que NO puede recibir tokens (mint)
        bool canReceive = geographicCompliance.canTransfer(address(0), userWithoutCountry, 100);
        assertFalse(canReceive, "Should block mint to user with not allowed country");
    }
    
    // ============ Tests de Configuración ============
    
    function test_SetUserCountry() public {
        address newUser = address(0x7777);
        
        geographicCompliance.setUserCountry(newUser, COUNTRY_BR);
        
        assertEq(geographicCompliance.userCountry(newUser), COUNTRY_BR);
    }
    
    function test_AddAllowedCountry() public {
        geographicCompliance.addAllowedCountry(COUNTRY_CA);
        
        assertTrue(geographicCompliance.allowedCountries(COUNTRY_CA));
    }
    
    function test_RemoveAllowedCountry() public {
        // Remover país permitido
        geographicCompliance.removeAllowedCountry(COUNTRY_US);
        
        assertFalse(geographicCompliance.allowedCountries(COUNTRY_US));
    }
    
    function test_HasCountry() public view {
        assertTrue(geographicCompliance.hasCountry(user1));
        assertFalse(geographicCompliance.hasCountry(userWithoutCountry));
    }
    
    function test_IsCountryAllowed() public view {
        assertTrue(geographicCompliance.isCountryAllowed(COUNTRY_US));
        assertFalse(geographicCompliance.isCountryAllowed(COUNTRY_CA));
    }
    
    // ============ Tests de Edge Cases ============
    
    function test_CannotSetUserCountry_ToZeroAddress() public {
        vm.expectRevert("Invalid user address");
        geographicCompliance.setUserCountry(address(0), COUNTRY_US);
    }
    
    function test_CannotSetUserCountry_ToEmptyString() public {
        vm.expectRevert("Country cannot be empty");
        geographicCompliance.setUserCountry(user1, "");
    }
    
    function test_CannotAddCountry_ThatIsAlreadyAllowed() public {
        vm.expectRevert("Country already allowed");
        geographicCompliance.addAllowedCountry(COUNTRY_US);
    }
    
    function test_CannotRemoveCountry_ThatIsNotAllowed() public {
        vm.expectRevert("Country not in allowed list");
        geographicCompliance.removeAllowedCountry(COUNTRY_CA);
    }
    
    // ============ Tests de Events ============
    
    function test_Event_UserCountrySet() public {
        address newUser = address(0x8888);
        
        vm.expectEmit(true, false, false, true);
        emit GeographicCompliance.UserCountrySet(newUser, COUNTRY_BR);
        
        geographicCompliance.setUserCountry(newUser, COUNTRY_BR);
    }
    
    function test_Event_CountryAdded() public {
        vm.expectEmit(true, false, false, true);
        emit GeographicCompliance.CountryAdded(COUNTRY_CA);
        
        geographicCompliance.addAllowedCountry(COUNTRY_CA);
    }
    
    function test_Event_CountryRemoved() public {
        vm.expectEmit(true, false, false, true);
        emit GeographicCompliance.CountryRemoved(COUNTRY_US);
        
        geographicCompliance.removeAllowedCountry(COUNTRY_US);
    }
    
    // ============ Tests de ICompliance Interface ============
    
    function test_Transferred_DoesNotRevert() public {
        // transferred() no debería hacer nada, solo verificar que no revierte
        geographicCompliance.transferred(user1, user2, 100);
    }
    
    function test_Created_DoesNotRevert() public {
        // created() no debería hacer nada, solo verificar que no revierte
        geographicCompliance.created(user1, 100);
    }
    
    function test_Destroyed_DoesNotRevert() public {
        // destroyed() no debería hacer nada, solo verificar que no revierte
        geographicCompliance.destroyed(user1, 100);
    }
}

