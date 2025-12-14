// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleProxy
 * @dev Proxy contract simple desde cero usando delegatecall
 * 
 * Este contrato demuestra cómo funciona un proxy básico:
 * 1. Almacena la dirección de la implementación
 * 2. Delega todas las llamadas a la implementación usando delegatecall
 * 3. Preserva el contexto (msg.sender, address(this), storage)
 */
contract SimpleProxy {
    // ============ Storage ============
    
    /**
     * @dev Dirección del contrato de implementación
     * Se guarda en el slot 0 del storage del proxy
     */
    address public implementation;
    
    /**
     * @dev Owner del proxy (para actualizar implementation)
     */
    address public owner;
    
    // ============ Events ============
    
    event ImplementationUpdated(address oldImplementation, address newImplementation);
    event OwnershipTransferred(address oldOwner, address newOwner);
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor
     * @param _implementation Dirección de la implementación inicial
     * @param _owner Dirección del owner
     */
    constructor(address _implementation, address _owner) {
        require(_implementation != address(0), "Invalid implementation");
        require(_owner != address(0), "Invalid owner");
        
        implementation = _implementation;
        owner = _owner;
    }
    
    // ============ Fallback Function ============
    
    /**
     * @dev Fallback function que delega todas las llamadas a la implementación
     * 
     * Esta función se ejecuta cuando:
     * - Se llama a una función que no existe en el proxy
     * - Se envía ETH al proxy sin especificar una función
     * 
     * IMPORTANTE: Usa delegatecall para preservar el contexto del proxy
     */
    fallback() external payable {
        _delegate(implementation);
    }
    
    /**
     * @dev Receive function para recibir ETH directamente
     */
    receive() external payable {
        _delegate(implementation);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Función interna que ejecuta delegatecall
     * @param target Dirección del contrato al que se delega la llamada
     */
    function _delegate(address target) internal {
        assembly {
            // Copiar los datos de la llamada a memoria
            // calldatasize() = tamaño de los datos de llamada
            calldatacopy(0, 0, calldatasize())
            
            // Ejecutar delegatecall
            // delegatecall(gas, target, argsOffset, argsSize, retOffset, retSize)
            let result := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            
            // Copiar los datos de retorno a memoria
            returndatacopy(0, 0, returndatasize())
            
            // Revertir si delegatecall falló
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Actualizar la implementación
     * @param newImplementation Nueva dirección de implementación
     */
    function updateImplementation(address newImplementation) external {
        require(msg.sender == owner, "Only owner");
        require(newImplementation != address(0), "Invalid implementation");
        
        address oldImplementation = implementation;
        implementation = newImplementation;
        
        emit ImplementationUpdated(oldImplementation, newImplementation);
    }
    
    /**
     * @dev Transferir ownership
     * @param newOwner Nueva dirección del owner
     */
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "Invalid owner");
        
        address oldOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

