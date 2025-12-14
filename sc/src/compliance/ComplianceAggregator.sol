// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICompliance} from "../ICompliance.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ComplianceAggregator
 * @dev Agregador de múltiples módulos de compliance para un token
 * 
 * Este contrato permite gestionar múltiples módulos de compliance para un token específico.
 * Actúa como un intermediario que:
 * - Agrega múltiples módulos de compliance para un token
 * - Verifica todos los módulos cuando se llama canTransfer
 * - Notifica a todos los módulos cuando ocurren transferencias
 * 
 * VENTAJAS:
 * - Gestión centralizada de módulos de compliance
 * - Permite agregar/remover módulos dinámicamente
 * - Soporta múltiples tokens (cada token tiene su propio conjunto de módulos)
 * - Implementa ICompliance, por lo que puede ser usado como módulo único en Token
 * 
 * USO:
 * 1. Crear ComplianceAggregator
 * 2. Agregar módulos para un token: aggregator.addModule(token, module1)
 * 3. Agregar aggregator como módulo en Token: token.addComplianceModule(aggregator)
 * 4. El Token llamará aggregator.canTransfer() que verificará todos los módulos
 */
contract ComplianceAggregator is ICompliance, Ownable {
    // ============ State Variables ============
    
    /**
     * @dev Mapping de token a array de módulos de compliance
     * token => modules[]
     */
    mapping(address => address[]) private tokenModules;
    
    /**
     * @dev Mapping para verificar si un módulo está activo para un token
     * token => module => isActive
     */
    mapping(address => mapping(address => bool)) private isModuleActive;
    
    /**
     * @dev Token actual para el cual se está verificando (usado en ICompliance.canTransfer)
     * Se setea cuando se agrega el aggregator como módulo en un Token
     */
    address private currentToken;
    
    // ============ Events ============
    
    /**
     * @dev Evento emitido cuando se agrega un módulo
     * @param token Dirección del token
     * @param module Dirección del módulo agregado
     */
    event ModuleAdded(address indexed token, address indexed module);
    
    /**
     * @dev Evento emitido cuando se remueve un módulo
     * @param token Dirección del token
     * @param module Dirección del módulo removido
     */
    event ModuleRemoved(address indexed token, address indexed module);
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor
     * @param initialOwner Dirección del owner
     */
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // ============ Module Management ============
    
    /**
     * @dev Agregar un módulo de compliance para un token
     * @param token Dirección del token
     * @param module Dirección del módulo de compliance
     */
    function addModule(address token, address module) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(module != address(0), "Invalid module address");
        require(!isModuleActive[token][module], "Module already added");
        
        tokenModules[token].push(module);
        isModuleActive[token][module] = true;
        
        emit ModuleAdded(token, module);
    }
    
    /**
     * @dev Remover un módulo de compliance para un token
     * @param token Dirección del token
     * @param module Dirección del módulo de compliance
     */
    function removeModule(address token, address module) external onlyOwner {
        require(isModuleActive[token][module], "Module not found");
        
        // Remover del array
        address[] storage modules = tokenModules[token];
        for (uint256 i = 0; i < modules.length; i++) {
            if (modules[i] == module) {
                modules[i] = modules[modules.length - 1];
                modules.pop();
                break;
            }
        }
        
        isModuleActive[token][module] = false;
        emit ModuleRemoved(token, module);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Verificar si un módulo está activo para un token
     * @param token Dirección del token
     * @param module Dirección del módulo
     * @return true si el módulo está activo
     */
    function isModuleActiveForToken(address token, address module) 
        external view returns (bool) {
        return isModuleActive[token][module];
    }
    
    /**
     * @dev Obtener el número de módulos para un token
     * @param token Dirección del token
     * @return Número de módulos
     */
    function getModulesCountForToken(address token) external view returns (uint256) {
        return tokenModules[token].length;
    }
    
    /**
     * @dev Obtener todos los módulos para un token
     * @param token Dirección del token
     * @return Array de direcciones de módulos
     */
    function getModulesForToken(address token) external view returns (address[] memory) {
        return tokenModules[token];
    }
    
    /**
     * @dev Obtener un módulo por índice para un token
     * @param token Dirección del token
     * @param index Índice del módulo
     * @return Dirección del módulo
     */
    function getModuleForToken(address token, uint256 index) 
        external view returns (address) {
        require(index < tokenModules[token].length, "Index out of bounds");
        return tokenModules[token][index];
    }
    
    // ============ ICompliance Implementation ============
    
    /**
     * @dev Verificar si una transferencia es permitida (ICompliance)
     * 
     * NOTA: Esta función requiere que el token haya sido configurado previamente.
     * Para usar con múltiples tokens, usar canTransfer(address token, ...) en su lugar.
     * 
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens a transferir
     * @return true si la transferencia es permitida
     */
    function canTransfer(address from, address to, uint256 amount) 
        external view override returns (bool) {
        // Si no hay token configurado, permitir (comportamiento por defecto)
        if (currentToken == address(0)) {
            return true;
        }
        
        return _canTransfer(currentToken, from, to, amount);
    }
    
    /**
     * @dev Verificar si una transferencia es permitida (con token explícito)
     * @param token Dirección del token
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens a transferir
     * @return true si la transferencia es permitida
     */
    function canTransfer(address token, address from, address to, uint256 amount) 
        external view returns (bool) {
        return _canTransfer(token, from, to, amount);
    }
    
    /**
     * @dev Verificar si una transferencia es permitida (función interna)
     * @param token Dirección del token
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens a transferir
     * @return true si la transferencia es permitida
     */
    function _canTransfer(address token, address from, address to, uint256 amount) 
        internal view returns (bool) {
        address[] memory modules = tokenModules[token];
        
        // Si no hay módulos, permitir
        if (modules.length == 0) {
            return true;
        }
        
        // Verificar todos los módulos
        for (uint256 i = 0; i < modules.length; i++) {
            if (!ICompliance(modules[i]).canTransfer(from, to, amount)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Notificar a todos los módulos sobre una transferencia (ICompliance)
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens transferidos
     */
    function transferred(address from, address to, uint256 amount) external override {
        if (currentToken != address(0)) {
            _transferred(currentToken, from, to, amount);
        }
    }
    
    /**
     * @dev Notificar a todos los módulos sobre una transferencia (con token explícito)
     * @param token Dirección del token
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens transferidos
     */
    function transferred(address token, address from, address to, uint256 amount) external {
        _transferred(token, from, to, amount);
    }
    
    /**
     * @dev Notificar a todos los módulos sobre una transferencia (función interna)
     * @param token Dirección del token
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens transferidos
     */
    function _transferred(address token, address from, address to, uint256 amount) internal {
        address[] memory modules = tokenModules[token];
        
        for (uint256 i = 0; i < modules.length; i++) {
            ICompliance(modules[i]).transferred(from, to, amount);
        }
    }
    
    /**
     * @dev Notificar a todos los módulos sobre creación de tokens (ICompliance)
     * @param to Dirección que recibió los tokens
     * @param amount Cantidad de tokens creados
     */
    function created(address to, uint256 amount) external override {
        if (currentToken != address(0)) {
            _created(currentToken, to, amount);
        }
    }
    
    /**
     * @dev Notificar a todos los módulos sobre creación de tokens (con token explícito)
     * @param token Dirección del token
     * @param to Dirección que recibió los tokens
     * @param amount Cantidad de tokens creados
     */
    function created(address token, address to, uint256 amount) external {
        _created(token, to, amount);
    }
    
    /**
     * @dev Notificar a todos los módulos sobre creación de tokens (función interna)
     * @param token Dirección del token
     * @param to Dirección que recibió los tokens
     * @param amount Cantidad de tokens creados
     */
    function _created(address token, address to, uint256 amount) internal {
        address[] memory modules = tokenModules[token];
        
        for (uint256 i = 0; i < modules.length; i++) {
            ICompliance(modules[i]).created(to, amount);
        }
    }
    
    /**
     * @dev Notificar a todos los módulos sobre destrucción de tokens (ICompliance)
     * @param from Dirección de la que se quemaron tokens
     * @param amount Cantidad de tokens quemados
     */
    function destroyed(address from, uint256 amount) external override {
        if (currentToken != address(0)) {
            _destroyed(currentToken, from, amount);
        }
    }
    
    /**
     * @dev Notificar a todos los módulos sobre destrucción de tokens (con token explícito)
     * @param token Dirección del token
     * @param from Dirección de la que se quemaron tokens
     * @param amount Cantidad de tokens quemados
     */
    function destroyed(address token, address from, uint256 amount) external {
        _destroyed(token, from, amount);
    }
    
    /**
     * @dev Notificar a todos los módulos sobre destrucción de tokens (función interna)
     * @param token Dirección del token
     * @param from Dirección de la que se quemaron tokens
     * @param amount Cantidad de tokens quemados
     */
    function _destroyed(address token, address from, uint256 amount) internal {
        address[] memory modules = tokenModules[token];
        
        for (uint256 i = 0; i < modules.length; i++) {
            ICompliance(modules[i]).destroyed(from, amount);
        }
    }
    
    /**
     * @dev Configurar el token actual (para uso con ICompliance)
     * @param token Dirección del token
     * 
     * NOTA: Esta función permite que el aggregator funcione con ICompliance
     * cuando se usa como módulo único en un Token. Se debe llamar antes de
     * agregar el aggregator como módulo en el Token.
     */
    function setCurrentToken(address token) external onlyOwner {
        currentToken = token;
    }
}

