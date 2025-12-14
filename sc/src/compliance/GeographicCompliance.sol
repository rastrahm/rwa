// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICompliance} from "../ICompliance.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GeographicCompliance
 * @dev Módulo de compliance que restringe transferencias basándose en países
 * 
 * Este módulo permite restringir transferencias basándose en la nacionalidad
 * de los usuarios. Solo permite transfers entre usuarios de países permitidos.
 * 
 * LÓGICA:
 * - Mantiene un mapping de usuario a país
 * - Mantiene una lista de países permitidos
 * - canTransfer() verifica que ambos usuarios (from y to) estén en países permitidos
 * - Si un usuario no tiene país asignado, la transferencia es rechazada
 * 
 * NOTA: Esta implementación usa strings para simplificar, pero en producción
 * se recomienda usar bytes2 con códigos ISO 3166-1 alpha-2 para eficiencia de gas.
 */
contract GeographicCompliance is ICompliance, Ownable {
    // ============ State Variables ============
    
    /**
     * @dev Mapping de usuario a país
     * user => country code (ej: "US", "MX", "BR")
     */
    mapping(address => string) public userCountry;
    
    /**
     * @dev Mapping de países permitidos
     * country => isAllowed
     */
    mapping(string => bool) public allowedCountries;
    
    // ============ Events ============
    
    /**
     * @dev Evento emitido cuando se asigna un país a un usuario
     */
    event UserCountrySet(address indexed user, string country);
    
    /**
     * @dev Evento emitido cuando se agrega un país permitido
     */
    event CountryAdded(string indexed country);
    
    /**
     * @dev Evento emitido cuando se remueve un país permitido
     */
    event CountryRemoved(string indexed country);
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor
     * @param initialOwner Dirección del owner del contrato
     */
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // ============ Configuration Functions ============
    
    /**
     * @dev Asignar país a un usuario
     * @param user Dirección del usuario
     * @param country Código de país (ej: "US", "MX", "BR")
     */
    function setUserCountry(address user, string memory country) 
        external onlyOwner 
    {
        require(user != address(0), "Invalid user address");
        require(bytes(country).length > 0, "Country cannot be empty");
        
        userCountry[user] = country;
        emit UserCountrySet(user, country);
    }
    
    /**
     * @dev Agregar un país a la lista de países permitidos
     * @param country Código de país (ej: "US", "MX", "BR")
     */
    function addAllowedCountry(string memory country) 
        external onlyOwner 
    {
        require(bytes(country).length > 0, "Country cannot be empty");
        require(!allowedCountries[country], "Country already allowed");
        
        allowedCountries[country] = true;
        emit CountryAdded(country);
    }
    
    /**
     * @dev Remover un país de la lista de países permitidos
     * @param country Código de país
     */
    function removeAllowedCountry(string memory country) 
        external onlyOwner 
    {
        require(allowedCountries[country], "Country not in allowed list");
        
        allowedCountries[country] = false;
        emit CountryRemoved(country);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Verificar si un país está permitido
     * @param country Código de país
     * @return true si el país está permitido
     */
    function isCountryAllowed(string memory country) 
        external view returns (bool) 
    {
        return allowedCountries[country];
    }
    
    /**
     * @dev Verificar si un usuario tiene país asignado
     * @param user Dirección del usuario
     * @return true si el usuario tiene país asignado
     */
    function hasCountry(address user) external view returns (bool) {
        return bytes(userCountry[user]).length > 0;
    }
    
    // ============ ICompliance Implementation ============
    
    /**
     * @dev Verificar si una transferencia es permitida
     * 
     * VALIDACIÓN:
     * - Si es mint (from == address(0)), solo verificar destinatario
     * - Para transferencias normales, verificar que ambos usuarios:
     *   1. Tienen país asignado
     *   2. Están en países permitidos
     * 
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @return true si la transferencia es permitida
     */
    function canTransfer(address from, address to, uint256 /* amount */) 
        external view override returns (bool) 
    {
        // Si es mint (from == address(0)), solo verificar destinatario
        if (from == address(0)) {
            return _canReceive(to);
        }
        
        // Para transferencias normales, verificar ambos usuarios
        return _canTransfer(from, to);
    }
    
    /**
     * @dev Función interna para verificar si un usuario puede recibir tokens
     * @param user Dirección del usuario
     * @return true si el usuario puede recibir tokens
     */
    function _canReceive(address user) private view returns (bool) {
        // Verificar que el usuario tiene país asignado
        string memory country = userCountry[user];
        if (bytes(country).length == 0) {
            return false; // Usuario sin país asignado
        }
        
        // Verificar que el país está permitido
        return allowedCountries[country];
    }
    
    /**
     * @dev Función interna para verificar si una transferencia entre dos usuarios es permitida
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @return true si la transferencia es permitida
     */
    function _canTransfer(address from, address to) private view returns (bool) {
        // Verificar que ambos usuarios tienen país asignado
        string memory fromCountry = userCountry[from];
        string memory toCountry = userCountry[to];
        
        if (bytes(fromCountry).length == 0 || bytes(toCountry).length == 0) {
            return false; // Al menos uno no tiene país asignado
        }
        
        // Verificar que ambos países están permitidos
        if (!allowedCountries[fromCountry] || !allowedCountries[toCountry]) {
            return false; // Al menos un país no está permitido
        }
        
        return true;
    }
    
    /**
     * @dev Notificar después de una transferencia
     * Este módulo no necesita actualizar estado después de la transferencia
     */
    function transferred(address from, address to, uint256 amount) external override {
        // No hay estado que actualizar
    }
    
    /**
     * @dev Notificar cuando se mintean tokens
     */
    function created(address to, uint256 amount) external override {
        // No hay estado que actualizar
    }
    
    /**
     * @dev Notificar cuando se queman tokens
     */
    function destroyed(address from, uint256 amount) external override {
        // No hay estado que actualizar
    }
}

