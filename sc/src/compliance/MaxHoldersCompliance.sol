// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICompliance} from "../ICompliance.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MaxHoldersCompliance
 * @dev Módulo de compliance que limita el número máximo de holders
 * 
 * Este módulo rastrea cuántas direcciones únicas tienen balance > 0 (holders)
 * y valida que no se exceda el límite máximo.
 * 
 * LÓGICA:
 * - Rastrea qué direcciones son holders (balance > 0)
 * - Mantiene un contador de holders únicos
 * - canTransfer() valida: si 'to' es nuevo holder, verifica que no exceda el límite
 * - transferred() actualiza el estado: agrega/remueve holders según balances
 */
contract MaxHoldersCompliance is ICompliance, Ownable {
    // ============ State Variables ============
    
    /**
     * @dev Número máximo de holders permitidos
     */
    uint256 public maxHolders;
    
    /**
     * @dev Dirección del contrato del token
     * Se usa para consultar balances y determinar si alguien es holder
     */
    address public tokenContract;
    
    /**
     * @dev Mapping que rastrea si una dirección es holder
     * true = es holder (tiene balance > 0)
     * false = no es holder (balance = 0)
     */
    mapping(address => bool) private holders;
    
    /**
     * @dev Contador de holders únicos
     */
    uint256 private holdersCount;
    
    // ============ Events ============
    
    event MaxHoldersUpdated(uint256 oldMaxHolders, uint256 newMaxHolders);
    event TokenContractUpdated(address oldTokenContract, address newTokenContract);
    event HolderAdded(address indexed holder);
    event HolderRemoved(address indexed holder);
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor
     * @param initialOwner Dirección del owner del contrato
     * @param _maxHolders Número máximo de holders permitidos
     * @param _tokenContract Dirección del contrato del token
     */
    constructor(address initialOwner, uint256 _maxHolders, address _tokenContract) 
        Ownable(initialOwner) {
        require(_tokenContract != address(0), "Invalid token contract address");
        
        maxHolders = _maxHolders;
        tokenContract = _tokenContract;
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @dev Actualizar el número máximo de holders
     * @param _maxHolders Nuevo número máximo de holders
     */
    function setMaxHolders(uint256 _maxHolders) external onlyOwner {
        uint256 oldMaxHolders = maxHolders;
        maxHolders = _maxHolders;
        emit MaxHoldersUpdated(oldMaxHolders, _maxHolders);
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
    
    // ============ View Functions ============
    
    /**
     * @dev Verificar si una dirección es holder
     * @param account Dirección a verificar
     * @return true si es holder, false en caso contrario
     */
    function isHolder(address account) external view returns (bool) {
        return holders[account];
    }
    
    /**
     * @dev Obtener el número actual de holders
     * @return Número de holders únicos
     */
    function getHoldersCount() external view returns (uint256) {
        return holdersCount;
    }
    
    // ============ ICompliance Implementation ============
    
    /**
     * @dev Verificar si una transferencia es permitida
     * 
     * VALIDACIÓN:
     * - Si 'to' ya es holder → siempre permitida (no aumenta el contador)
     * - Si 'to' NO es holder → verifica que holdersCount < maxHolders
     * 
     * @param to Dirección del destinatario (se valida si es nuevo holder)
     * @param amount Cantidad de tokens a transferir
     * @return true si la transferencia es permitida, false en caso contrario
     */
    function canTransfer(address, address to, uint256 amount) 
        external view override returns (bool) {
        // Si 'to' ya es holder, no aumenta el contador → siempre permitida
        if (holders[to]) {
            return true;
        }
        
        // Si 'to' no es holder y ya alcanzamos el límite → rechazar
        if (holdersCount >= maxHolders) {
            return false;
        }
        
        // Si 'to' no es holder y hay espacio → permitida
        return true;
    }
    
    /**
     * @dev Notificar después de una transferencia
     * 
     * ACTUALIZA EL ESTADO:
     * - Si 'to' recibe tokens y no es holder → agregar como holder
     * - Si 'from' transfiere todos sus tokens (balance = 0) → remover como holder
     * 
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad transferida
     */
    function transferred(address from, address to, uint256 amount) external override {
        // Actualizar estado del destinatario
        if (to != address(0)) {
            uint256 toBalance = ERC20(tokenContract).balanceOf(to);
            if (toBalance > 0 && !holders[to]) {
                // 'to' tiene balance > 0 y no es holder → agregar
                holders[to] = true;
                holdersCount++;
                emit HolderAdded(to);
            }
        }
        
        // Actualizar estado del remitente
        if (from != address(0)) {
            uint256 fromBalance = ERC20(tokenContract).balanceOf(from);
            if (fromBalance == 0 && holders[from]) {
                // 'from' tiene balance = 0 y es holder → remover
                holders[from] = false;
                holdersCount--;
                emit HolderRemoved(from);
            }
        }
    }
    
    /**
     * @dev Notificar cuando se mintean tokens
     * 
     * ACTUALIZA EL ESTADO:
     * - Si 'to' recibe tokens y no es holder → agregar como holder
     * 
     * @param to Dirección que recibe los tokens minteados
     * @param amount Cantidad minteada
     */
    function created(address to, uint256 amount) external override {
        if (to != address(0)) {
            uint256 toBalance = ERC20(tokenContract).balanceOf(to);
            if (toBalance > 0 && !holders[to]) {
                // 'to' tiene balance > 0 y no es holder → agregar
                holders[to] = true;
                holdersCount++;
                emit HolderAdded(to);
            }
        }
    }
    
    /**
     * @dev Notificar cuando se queman tokens
     * 
     * ACTUALIZA EL ESTADO:
     * - Si 'from' tiene balance = 0 después del burn → remover como holder
     * 
     * @param from Dirección de la que se queman tokens
     * @param amount Cantidad quemada
     */
    function destroyed(address from, uint256 amount) external override {
        if (from != address(0)) {
            uint256 fromBalance = ERC20(tokenContract).balanceOf(from);
            if (fromBalance == 0 && holders[from]) {
                // 'from' tiene balance = 0 y es holder → remover
                holders[from] = false;
                holdersCount--;
                emit HolderRemoved(from);
            }
        }
    }
}

