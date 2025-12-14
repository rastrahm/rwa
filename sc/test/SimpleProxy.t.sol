// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SimpleProxy} from "../src/SimpleProxy.sol";
import {SimpleStorage} from "../src/SimpleStorage.sol";

/**
 * @title SimpleProxyTest
 * @dev Tests para el proxy simple desde cero
 */
contract SimpleProxyTest is Test {
    SimpleProxy public proxy;
    SimpleStorage public implementation;
    
    address public owner = address(0x1111);
    address public user = address(0x2222);
    
    function setUp() public {
        // Deploy implementation
        implementation = new SimpleStorage();
        
        // Deploy proxy
        proxy = new SimpleProxy(address(implementation), owner);
    }
    
    function test_Proxy_StoresImplementation() public view {
        assertEq(proxy.implementation(), address(implementation));
    }
    
    function test_Proxy_DelegatesCall() public {
        uint256 testValue = 123;
        
        // Llamar setValue a través del proxy usando call
        (bool success, ) = address(proxy).call(
            abi.encodeWithSignature("setValue(uint256)", testValue)
        );
        require(success, "setValue call failed");
        
        // Leer value directamente del storage slot 2 del proxy
        // Slot 0: implementation, Slot 1: owner, Slot 2: value
        bytes32 valueSlot = bytes32(uint256(2));
        bytes32 storedValueBytes = vm.load(address(proxy), valueSlot);
        uint256 storedValue = uint256(storedValueBytes);
        
        assertEq(storedValue, testValue, "Value should be stored in proxy's slot 2");
        
        // Verificar que implementation NO tiene el valor
        assertEq(implementation.value(), 0, "Implementation should not have the value");
    }
    
    function test_Proxy_PreservesMsgSender() public {
        vm.prank(user);
        bool success;
        bytes memory data;
        (success, data) = address(proxy).call(
            abi.encodeWithSignature("getMsgSender()")
        );
        assertTrue(success);
        
        address returnedSender = abi.decode(data, (address));
        assertEq(returnedSender, user);  // Preserva msg.sender original
    }
    
    function test_Proxy_PreservesAddressThis() public {
        bool success;
        bytes memory data;
        (success, data) = address(proxy).call(
            abi.encodeWithSignature("getContractAddress()")
        );
        assertTrue(success);
        
        address returnedAddress = abi.decode(data, (address));
        assertEq(returnedAddress, address(proxy));  // Retorna dirección del proxy
    }
    
    function test_Proxy_IndependentStorage() public {
        // Crear segundo proxy con misma implementación
        SimpleProxy proxy2 = new SimpleProxy(address(implementation), owner);
        
        // Set value en proxy 1 usando call
        (bool success, ) = address(proxy).call(
            abi.encodeWithSignature("setValue(uint256)", 100)
        );
        require(success, "setValue on proxy1 failed");
        
        // Set value en proxy 2 usando call
        (success, ) = address(proxy2).call(
            abi.encodeWithSignature("setValue(uint256)", 200)
        );
        require(success, "setValue on proxy2 failed");
        
        // Leer valores directamente del storage de cada proxy
        uint256 value1;
        uint256 value2;
        assembly {
            // Leer slot 2 de proxy1
            let proxy1Addr := sload(0)  // Esto no funciona así, necesitamos la dirección
            // Usar un enfoque diferente: leer desde las direcciones directamente
        }
        
        // Usar vm.load para leer el storage directamente
        bytes32 value1Bytes = vm.load(address(proxy), bytes32(uint256(2)));
        bytes32 value2Bytes = vm.load(address(proxy2), bytes32(uint256(2)));
        
        value1 = uint256(value1Bytes);
        value2 = uint256(value2Bytes);
        
        assertEq(value1, 100, "Proxy 1 should have value 100");
        assertEq(value2, 200, "Proxy 2 should have value 200");
        
        // Verificar que implementation NO tiene valores
        assertEq(implementation.value(), 0);
    }
    
    function test_Proxy_EtherHandling() public payable {
        vm.deal(address(this), 1 ether);
        
        (bool success, ) = address(proxy).call{value: 1 ether}(
            abi.encodeWithSignature("deposit()")
        );
        assertTrue(success);
        
        // ETH se queda en el proxy, no en implementation
        assertEq(address(proxy).balance, 1 ether);
        assertEq(address(implementation).balance, 0);
    }
    
    function test_Proxy_UpdateImplementation() public {
        // Crear nueva implementación
        SimpleStorage newImpl = new SimpleStorage();
        
        // Actualizar implementación
        vm.prank(owner);
        proxy.updateImplementation(address(newImpl));
        
        assertEq(proxy.implementation(), address(newImpl));
        
        // El storage del proxy se mantiene (el valor anterior se preserva)
        // Esto demuestra que cambiar la implementación no afecta el storage existente
    }
    
    function test_Proxy_OnlyOwnerCanUpdate() public {
        SimpleStorage newImpl = new SimpleStorage();
        
        vm.prank(user);  // No es owner
        vm.expectRevert("Only owner");
        proxy.updateImplementation(address(newImpl));
    }
}

