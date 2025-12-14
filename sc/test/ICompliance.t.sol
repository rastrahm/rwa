// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ICompliance} from "../src/ICompliance.sol";

/**
 * @dev MockCompliance es una implementación simple de ICompliance
 * que siempre permite transferencias y no hace nada en las notificaciones
 */
contract MockCompliance is ICompliance {
    function canTransfer(address, address, uint256) external pure override returns (bool) {
        return true;
    }
    
    function transferred(address, address, uint256) external override {
        // No hace nada, solo implementa la interfaz
    }
    
    function created(address, uint256) external override {
        // No hace nada, solo implementa la interfaz
    }
    
    function destroyed(address, uint256) external override {
        // No hace nada, solo implementa la interfaz
    }
}

/**
 * @title IComplianceTest
 * @dev Tests para verificar que la interfaz ICompliance está correctamente definida
 */
contract IComplianceTest is Test {
    MockCompliance public mockCompliance;
    
    function setUp() public {
        // Desplegar la implementación mock
        mockCompliance = new MockCompliance();
    }
    
    // ============ Paso 2.1: ICompliance Interface ============
    
    /**
     * @dev Test básico: verificar que la interfaz existe y puede ser implementada
     */
    function test_InterfaceExists() public {
        // Si llegamos aquí, la interfaz existe y puede ser implementada
        assertTrue(address(mockCompliance) != address(0));
    }
    
    /**
     * @dev Test: verificar que canTransfer() funciona
     */
    function test_CanTransfer_ReturnsTrue() public {
        bool result = mockCompliance.canTransfer(address(0), address(0), 0);
        assertTrue(result);
    }
    
    /**
     * @dev Test: verificar que canTransfer() acepta diferentes parámetros
     */
    function test_CanTransfer_WithDifferentParameters() public {
        address from = makeAddr("from");
        address to = makeAddr("to");
        uint256 amount = 100 * 10**18;
        
        bool result = mockCompliance.canTransfer(from, to, amount);
        assertTrue(result);
    }
    
    /**
     * @dev Test: verificar que transferred() puede ser llamado sin revertir
     */
    function test_Transferred_CanBeCalled() public {
        address from = makeAddr("from");
        address to = makeAddr("to");
        uint256 amount = 100 * 10**18;
        
        // No debe revertir
        mockCompliance.transferred(from, to, amount);
    }
    
    /**
     * @dev Test: verificar que created() puede ser llamado sin revertir
     */
    function test_Created_CanBeCalled() public {
        address to = makeAddr("to");
        uint256 amount = 100 * 10**18;
        
        // No debe revertir
        mockCompliance.created(to, amount);
    }
    
    /**
     * @dev Test: verificar que destroyed() puede ser llamado sin revertir
     */
    function test_Destroyed_CanBeCalled() public {
        address from = makeAddr("from");
        uint256 amount = 100 * 10**18;
        
        // No debe revertir
        mockCompliance.destroyed(from, amount);
    }
    
    /**
     * @dev Test: verificar que la interfaz puede ser usada como tipo
     */
    function test_InterfaceCanBeUsedAsType() public {
        ICompliance compliance = ICompliance(address(mockCompliance));
        
        // Debe poder llamar a las funciones
        bool result = compliance.canTransfer(address(0), address(0), 0);
        assertTrue(result);
    }
}

