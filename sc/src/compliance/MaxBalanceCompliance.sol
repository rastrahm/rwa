// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICompliance} from "../ICompliance.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MaxBalanceCompliance
 * @dev Módulo de compliance que limita el balance máximo por wallet
 * 
 * Este módulo valida que ningún wallet pueda tener más tokens que el máximo permitido.
 * La validación se hace ANTES de ejecutar la transferencia.
 * 
 * LÓGICA:
 * - canTransfer() verifica: balanceActual(destinatario) + cantidad <= maxBalance
 * - Si la suma excede el máximo, la transferencia es rechazada
 * - transferred(), created(), destroyed() no actualizan estado (no es necesario)
 */
contract MaxBalanceCompliance is ICompliance, Ownable {
    // ============ State Variables ============
    
    /**
     * @dev Balance máximo permitido por wallet
     */
    uint256 public maxBalance;
    
    /**
     * @dev Dirección del contrato del token
     * Se usa para consultar el balance actual del destinatario
     */
    address public tokenContract;
    
    // ============ Events ============
    
    event MaxBalanceUpdated(uint256 oldMaxBalance, uint256 newMaxBalance);
    event TokenContractUpdated(address oldTokenContract, address newTokenContract);
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor
     * @param initialOwner Dirección del owner del contrato
     * @param _maxBalance Balance máximo permitido por wallet
     * @param _tokenContract Dirección del contrato del token
     */
    constructor(address initialOwner, uint256 _maxBalance, address _tokenContract) 
        Ownable(initialOwner) {
        require(_tokenContract != address(0), "Invalid token contract address");
        
        maxBalance = _maxBalance;
        tokenContract = _tokenContract;
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @dev Actualizar el balance máximo permitido
     * @param _maxBalance Nuevo balance máximo
     */
    function setMaxBalance(uint256 _maxBalance) external onlyOwner {
        uint256 oldMaxBalance = maxBalance;
        maxBalance = _maxBalance;
        emit MaxBalanceUpdated(oldMaxBalance, _maxBalance);
    }
    
    /**
     * @dev Actualizar la dirección del contrato del token
     * @param _tokenContract Nueva dirección del contrato del token
     */
    function setTokenContract(address _tokenContract) external onlyOwner {
        require(_tokenContract != address(0), "Invalid token contract address");
        
        address oldTokenContract = tokenContract;
        tokenContract = _tokenContract;
        emit TokenContractUpdated(oldTokenContract, _tokenContract);
    }
    
    // ============ ICompliance Implementation ============
    
    /**
     * @dev Verificar si una transferencia es permitida
     * 
     * VALIDACIÓN:
     * - Obtiene el balance actual del destinatario
     * - Calcula: balanceActual + cantidad
     * - Retorna true si la suma <= maxBalance, false en caso contrario
     * 
     * NOTA: El remitente (primer parámetro) no se valida, solo el destinatario (to)
     * 
     * @param to Dirección del destinatario (se valida su balance)
     * @param amount Cantidad de tokens a transferir
     * @return true si la transferencia es permitida, false en caso contrario
     */
    function canTransfer(address, address to, uint256 amount) 
        external view override returns (bool) {
        // Obtener balance actual del destinatario
        uint256 currentBalance = ERC20(tokenContract).balanceOf(to);
        
        // Validar que la suma no exceda el máximo
        // Usamos <= para permitir exactamente el máximo
        return (currentBalance + amount) <= maxBalance;
    }
    
    /**
     * @dev Notificar después de una transferencia
     * 
     * Este módulo no necesita actualizar estado después de la transferencia,
     * ya que la validación se hace antes (en canTransfer).
     * 
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad transferida
     */
    function transferred(address from, address to, uint256 amount) external override {
        // No hay estado que actualizar
        // La validación ya se hizo en canTransfer()
    }
    
    /**
     * @dev Notificar cuando se mintean tokens
     * 
     * Este módulo no necesita actualizar estado cuando se mintean tokens.
     * La validación del balance máximo se hace en canTransfer() cuando
     * se intenta transferir tokens.
     * 
     * @param to Dirección que recibe los tokens minteados
     * @param amount Cantidad minteada
     */
    function created(address to, uint256 amount) external override {
        // No hay estado que actualizar
    }
    
    /**
     * @dev Notificar cuando se queman tokens
     * 
     * Este módulo no necesita actualizar estado cuando se queman tokens.
     * 
     * @param from Dirección de la que se queman tokens
     * @param amount Cantidad quemada
     */
    function destroyed(address from, uint256 amount) external override {
        // No hay estado que actualizar
    }
}

