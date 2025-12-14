// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {TokenCloneable} from "./TokenCloneable.sol";

/**
 * @title TokenCloneFactory
 * @dev Factory para crear clones de Token usando EIP-1167
 * 
 * Este contrato permite crear múltiples instancias de Token de forma eficiente
 * usando el patrón Minimal Proxy (EIP-1167), ahorrando ~90% de gas comparado
 * con deployment directo.
 * 
 * FUNCIONALIDAD:
 * - Despliega una implementación de TokenCloneable (una vez)
 * - Crea clones de la implementación (muy barato en gas)
 * - Inicializa cada clone con parámetros específicos
 * - Mantiene registro de todos los tokens creados
 * 
 * VENTAJAS:
 * - Ahorro masivo de gas (~90% menos que deployment directo)
 * - Todos los clones comparten la misma implementación
 * - Cada clone tiene estado independiente
 * - Facilita auditorías (solo auditar una implementación)
 */
contract TokenCloneFactory is Ownable {
    using Clones for address;
    
    // ============ State Variables ============
    
    /**
     * @dev Dirección de la implementación de TokenCloneable
     * Se despliega una vez en el constructor y se usa para todos los clones
     */
    address public immutable implementation;
    
    /**
     * @dev Array de direcciones de tokens creados
     */
    address[] private tokens;
    
    // ============ Events ============
    
    /**
     * @dev Evento emitido cuando se crea un nuevo token
     * @param token Dirección del token creado
     * @param name Nombre del token
     * @param symbol Símbolo del token
     * @param admin Administrador del token
     */
    event TokenCreated(
        address indexed token,
        string name,
        string symbol,
        address indexed admin
    );
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor
     * @param initialOwner Dirección del owner del factory
     * 
     * Despliega la implementación de TokenCloneable una vez.
     * Esta implementación se usará para crear todos los clones.
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        // Desplegar implementación (una vez)
        implementation = address(new TokenCloneable());
    }
    
    // ============ Token Creation ============
    
    /**
     * @dev Crear un nuevo token clonando la implementación
     * 
     * FLUJO:
     * 1. Crear clone usando EIP-1167 (muy barato en gas)
     * 2. Inicializar el clone con parámetros específicos
     * 3. Agregar a la lista de tokens creados
     * 4. Emitir evento
     * 
     * @param name_ Nombre del token
     * @param symbol_ Símbolo del token
     * @param admin Dirección del administrador del token
     * @param _identityRegistry Dirección del IdentityRegistry
     * @param _trustedIssuersRegistry Dirección del TrustedIssuersRegistry
     * @param _claimTopicsRegistry Dirección del ClaimTopicsRegistry
     * @return token Dirección del token creado
     */
    function createToken(
        string memory name_,
        string memory symbol_,
        address admin,
        address _identityRegistry,
        address _trustedIssuersRegistry,
        address _claimTopicsRegistry
    ) external returns (address token) {
        // Validaciones
        require(admin != address(0), "Invalid admin address");
        require(_identityRegistry != address(0), "Invalid identity registry");
        require(_trustedIssuersRegistry != address(0), "Invalid trusted issuers registry");
        require(_claimTopicsRegistry != address(0), "Invalid claim topics registry");
        
        // 1. Crear clone usando EIP-1167 (muy barato en gas)
        token = implementation.clone();
        
        // 2. Inicializar el clone
        TokenCloneable(token).initialize(
            name_,
            symbol_,
            admin,
            _identityRegistry,
            _trustedIssuersRegistry,
            _claimTopicsRegistry
        );
        
        // 3. Agregar a la lista de tokens
        tokens.push(token);
        
        // 4. Emitir evento
        emit TokenCreated(token, name_, symbol_, admin);
        
        return token;
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Obtener el número total de tokens creados
     * @return Número de tokens creados
     */
    function getTotalTokens() external view returns (uint256) {
        return tokens.length;
    }
    
    /**
     * @dev Obtener la dirección de un token por índice
     * @param index Índice del token (0-based)
     * @return Dirección del token
     */
    function getToken(uint256 index) external view returns (address) {
        require(index < tokens.length, "Index out of bounds");
        return tokens[index];
    }
    
    /**
     * @dev Obtener todos los tokens creados
     * @return Array de direcciones de tokens
     */
    function getAllTokens() external view returns (address[] memory) {
        return tokens;
    }
    
    /**
     * @dev Verificar si una dirección es un token creado por este factory
     * @param token Dirección a verificar
     * @return true si es un token creado por este factory
     */
    function isToken(address token) external view returns (bool) {
        // Verificar si está en la lista de tokens
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == token) {
                return true;
            }
        }
        return false;
    }
}

