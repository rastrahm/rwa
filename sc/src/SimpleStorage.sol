// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleStorage
 * @dev Contrato de implementación simple para demostrar el proxy
 * 
 * IMPORTANTE: Para evitar colisiones de storage con el proxy, necesitamos
 * que las variables empiecen desde el slot 2 (ya que proxy usa 0 y 1).
 * Sin embargo, Solidity siempre empieza desde el slot 0, así que necesitamos
 * usar un patrón diferente: agregar variables dummy o usar storage gaps.
 * 
 * Para este ejemplo educativo, usaremos un patrón más simple: mover las
 * variables después de las del proxy usando un storage gap.
 */
contract SimpleStorage {
    // ============ Storage Gap (para evitar colisión con proxy) ============
    // El proxy usa:
    //   Slot 0: address implementation
    //   Slot 1: address owner
    // Este contrato debe empezar desde el slot 2
    
    // Variables dummy para ocupar slots 0 y 1 (no se usan, solo para layout)
    // En un proxy real, estas variables estarían en el proxy, no aquí
    address private _gap0;  // Slot 0 (reservado para proxy.implementation)
    address private _gap1;  // Slot 1 (reservado para proxy.owner)
    
    // ============ Variables Reales ============
    // Slot 2: value
    uint256 public value;
    
    // Slot 3: storedAddress
    address public storedAddress;
    
    // Slot 4+: balances mapping
    mapping(address => uint256) public balances;
    
    function setValue(uint256 _value) external {
        value = _value;
    }
    
    function setAddress(address _addr) external {
        storedAddress = _addr;
    }
    
    function setBalance(address user, uint256 amount) external {
        balances[user] = amount;
    }
    
    function getContractAddress() external view returns (address) {
        return address(this);  // Debe retornar la dirección del proxy
    }
    
    function getMsgSender() external view returns (address) {
        return msg.sender;  // Debe retornar el caller original
    }
    
    function deposit() external payable {
        // ETH se queda en el proxy
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

