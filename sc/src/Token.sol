// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IdentityRegistry} from "./IdentityRegistry.sol";
import {TrustedIssuersRegistry} from "./TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "./ClaimTopicsRegistry.sol";
import {Identity} from "./Identity.sol";
import {ICompliance} from "./ICompliance.sol";

/**
 * @title Token
 * @dev Token ERC-3643 con integración de Identity System y Compliance Modules
 * 
 * Este contrato implementa un token ERC-20 estándar con funcionalidades adicionales:
 * - Mint: Crear nuevos tokens (solo AGENT_ROLE)
 * - Burn: Quemar tokens propios
 * - BurnFrom: Quemar tokens de otros (solo AGENT_ROLE)
 * - Control de acceso basado en roles (AccessControl)
 * - Verificación de identidad: solo usuarios verificados pueden transferir
 * - Compliance Modules: módulos modulares que validan transferencias
 * 
 * ROLES:
 * - DEFAULT_ADMIN_ROLE: Puede gestionar roles y configurar el token (pause, freeze)
 * - AGENT_ROLE: Puede mintear y quemar tokens de cualquier usuario
 * - COMPLIANCE_ROLE: Puede gestionar módulos de compliance y registries
 * 
 * INTEGRACIÓN IDENTITY SYSTEM:
 * - Usa IdentityRegistry para verificar si usuarios están registrados
 * - Usa TrustedIssuersRegistry para verificar emisores confiables
 * - Usa ClaimTopicsRegistry para verificar topics requeridos
 * - Valida que usuarios tengan todos los claims requeridos antes de transferir
 * 
 * INTEGRACIÓN COMPLIANCE MODULES:
 * - Array de módulos de compliance que validan transferencias
 * - canTransfer() valida todos los módulos antes de transferir
 * - _update() notifica a todos los módulos después de transferir
 */
contract Token is ERC20, AccessControl, Pausable {
    // ============ Constants ============
    
    /**
     * @dev Rol que permite mintear y quemar tokens
     */
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    
    /**
     * @dev Rol que permite gestionar módulos de compliance y registries
     */
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    
    // ============ Identity System References ============
    
    /**
     * @dev Registry que mapea wallets a sus Identity contracts
     */
    IdentityRegistry public identityRegistry;
    
    /**
     * @dev Registry de emisores confiables de claims
     */
    TrustedIssuersRegistry public trustedIssuersRegistry;
    
    /**
     * @dev Registry de claim topics requeridos
     */
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    // ============ Compliance Modules ============
    
    /**
     * @dev Array de módulos de compliance activos
     */
    ICompliance[] public complianceModules;
    
    /**
     * @dev Mapping para verificar si un módulo está activo
     */
    mapping(address => bool) private isComplianceModuleActive;
    
    /**
     * @dev Mapping para rastrear cuentas congeladas
     */
    mapping(address => bool) private frozen;
    
    // ============ Events ============
    
    event ComplianceModuleAdded(address indexed module);
    event ComplianceModuleRemoved(address indexed module);
    event AccountFrozen(address indexed account);
    event AccountUnfrozen(address indexed account);
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor
     * @param name_ Nombre del token
     * @param symbol_ Símbolo del token
     * @param admin Dirección del administrador (recibe DEFAULT_ADMIN_ROLE)
     * @param _identityRegistry Dirección del IdentityRegistry
     * @param _trustedIssuersRegistry Dirección del TrustedIssuersRegistry
     * @param _claimTopicsRegistry Dirección del ClaimTopicsRegistry
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address admin,
        address _identityRegistry,
        address _trustedIssuersRegistry,
        address _claimTopicsRegistry
    ) ERC20(name_, symbol_) {
        require(admin != address(0), "Invalid admin address");
        require(_identityRegistry != address(0), "Invalid identity registry");
        require(_trustedIssuersRegistry != address(0), "Invalid trusted issuers registry");
        require(_claimTopicsRegistry != address(0), "Invalid claim topics registry");
        
        // Otorgar DEFAULT_ADMIN_ROLE al admin
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        
        // El admin también recibe AGENT_ROLE por defecto
        _grantRole(AGENT_ROLE, admin);
        
        // El admin también recibe COMPLIANCE_ROLE por defecto
        _grantRole(COMPLIANCE_ROLE, admin);
        
        // Asignar referencias externas
        identityRegistry = IdentityRegistry(_identityRegistry);
        trustedIssuersRegistry = TrustedIssuersRegistry(_trustedIssuersRegistry);
        claimTopicsRegistry = ClaimTopicsRegistry(_claimTopicsRegistry);
    }
    
    // ============ Pause Functions ============
    
    /**
     * @dev Pausar el token (bloquea todas las transferencias)
     * Solo puede ser llamado por DEFAULT_ADMIN_ROLE
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Despausar el token
     * Solo puede ser llamado por DEFAULT_ADMIN_ROLE
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ Freeze Functions ============
    
    /**
     * @dev Congelar una cuenta (bloquea transferencias desde/hacia esa cuenta)
     * @param account Dirección de la cuenta a congelar
     * Solo puede ser llamado por DEFAULT_ADMIN_ROLE
     */
    function freezeAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Invalid account address");
        require(!frozen[account], "Account already frozen");
        
        frozen[account] = true;
        emit AccountFrozen(account);
    }
    
    /**
     * @dev Descongelar una cuenta
     * @param account Dirección de la cuenta a descongelar
     * Solo puede ser llamado por DEFAULT_ADMIN_ROLE
     */
    function unfreezeAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Invalid account address");
        require(frozen[account], "Account not frozen");
        
        frozen[account] = false;
        emit AccountUnfrozen(account);
    }
    
    /**
     * @dev Verificar si una cuenta está congelada
     * @param account Dirección de la cuenta
     * @return true si la cuenta está congelada
     */
    function isFrozen(address account) external view returns (bool) {
        return frozen[account];
    }
    
    // ============ Forced Transfer ============
    
    /**
     * @dev Transferencia forzada (bypassa pause, freeze, y compliance)
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens a transferir
     * Solo puede ser llamado por AGENT_ROLE
     * 
     * USO: Para transferencias administrativas, recuperación de fondos, etc.
     * 
     * NOTA: Esta función bypassa todas las validaciones (pause, freeze, identity, compliance)
     */
    function forcedTransfer(address from, address to, uint256 amount) 
        external onlyRole(AGENT_ROLE) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        // Setear flag para bypassar validaciones
        bypassCompliance = true;
        
        // Hacer transferencia (llama _update() que verifica bypassCompliance)
        _transfer(from, to, amount);
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @dev Actualizar IdentityRegistry
     * @param _identityRegistry Nueva dirección del IdentityRegistry
     */
    function setIdentityRegistry(address _identityRegistry) external onlyRole(COMPLIANCE_ROLE) {
        require(_identityRegistry != address(0), "Invalid address");
        identityRegistry = IdentityRegistry(_identityRegistry);
    }
    
    /**
     * @dev Actualizar TrustedIssuersRegistry
     * @param _trustedIssuersRegistry Nueva dirección del TrustedIssuersRegistry
     */
    function setTrustedIssuersRegistry(address _trustedIssuersRegistry) external onlyRole(COMPLIANCE_ROLE) {
        require(_trustedIssuersRegistry != address(0), "Invalid address");
        trustedIssuersRegistry = TrustedIssuersRegistry(_trustedIssuersRegistry);
    }
    
    /**
     * @dev Actualizar ClaimTopicsRegistry
     * @param _claimTopicsRegistry Nueva dirección del ClaimTopicsRegistry
     */
    function setClaimTopicsRegistry(address _claimTopicsRegistry) external onlyRole(COMPLIANCE_ROLE) {
        require(_claimTopicsRegistry != address(0), "Invalid address");
        claimTopicsRegistry = ClaimTopicsRegistry(_claimTopicsRegistry);
    }
    
    // ============ Identity Verification ============
    
    /**
     * @dev Verificar si un usuario está completamente verificado
     * 
     * FLUJO DE VERIFICACIÓN:
     * 1. Verificar que está registrado en IdentityRegistry
     * 2. Obtener su Identity contract
     * 3. Obtener topics requeridos desde ClaimTopicsRegistry
     * 4. Para cada topic requerido, verificar que tiene claim válido de issuer confiable
     * 
     * @param account Dirección del usuario a verificar
     * @return true si el usuario está completamente verificado
     */
    function isVerified(address account) public view returns (bool) {
        // 1. Verificar que IdentityRegistry está configurado
        if (address(identityRegistry) == address(0)) {
            return false;
        }
        
        // 2. Verificar que está registrado
        if (!identityRegistry.isRegistered(account)) {
            return false;
        }
        
        // 3. Obtener Identity contract
        address identityAddress = identityRegistry.getIdentity(account);
        if (identityAddress == address(0)) {
            return false;
        }
        
        // 4. Obtener topics requeridos
        uint256[] memory requiredTopics = claimTopicsRegistry.getClaimTopics();
        
        // Si no hay topics requeridos, cualquier usuario registrado está OK
        if (requiredTopics.length == 0) {
            return true;
        }
        
        // 5. Para cada topic requerido, verificar que existe claim válido
        for (uint256 i = 0; i < requiredTopics.length; i++) {
            bool hasValidClaim = false;
            
            // Obtener todos los issuers confiables
            address[] memory trustedIssuers = trustedIssuersRegistry.getTrustedIssuers();
            
            for (uint256 j = 0; j < trustedIssuers.length; j++) {
                // Verificar que el issuer puede emitir este topic
                if (trustedIssuersRegistry.hasClaimTopic(trustedIssuers[j], requiredTopics[i])) {
                    // Verificar que el claim existe en el Identity
                    Identity identity = Identity(identityAddress);
                    if (identity.claimExists(requiredTopics[i], trustedIssuers[j])) {
                        hasValidClaim = true;
                        break;
                    }
                }
            }
            
            // Si no se encontró un claim válido para este topic, falla
            if (!hasValidClaim) {
                return false;
            }
        }
        
        return true;
    }
    
    // ============ Mint Functions ============
    
    /**
     * @dev Mintear nuevos tokens
     * @param to Dirección que recibirá los tokens
     * @param amount Cantidad de tokens a mintear
     * 
     * Requisitos:
     * - Solo puede ser llamado por AGENT_ROLE
     * - 'to' no puede ser address(0)
     * - 'to' debe estar verificado (isVerified)
     * - Debe cumplir con todos los módulos de compliance
     */
    function mint(address to, uint256 amount) external onlyRole(AGENT_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        require(isVerified(to), "Recipient not verified");
        
        // Verificar compliance antes de mintear
        for (uint256 i = 0; i < complianceModules.length; i++) {
            require(
                complianceModules[i].canTransfer(address(0), to, amount),
                "Mint not compliant"
            );
        }
        
        _mint(to, amount);
        // La notificación a compliance modules se hace en _update() cuando from == address(0)
    }
    
    // ============ Burn Functions ============
    
    /**
     * @dev Quemar tokens propios
     * @param amount Cantidad de tokens a quemar
     * 
     * Requisitos:
     * - El caller debe tener suficiente balance
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Quemar tokens de otra dirección
     * @param from Dirección de la que se queman tokens
     * @param amount Cantidad de tokens a quemar
     * 
     * Requisitos:
     * - Solo puede ser llamado por AGENT_ROLE
     * - 'from' debe tener suficiente balance
     */
    function burnFrom(address from, uint256 amount) external onlyRole(AGENT_ROLE) {
        require(from != address(0), "Cannot burn from zero address");
        _burn(from, amount);
    }
    
    // ============ Compliance Module Management ============
    
    /**
     * @dev Agregar un módulo de compliance
     * @param module Dirección del módulo de compliance
     */
    function addComplianceModule(address module) external onlyRole(COMPLIANCE_ROLE) {
        require(module != address(0), "Invalid module address");
        require(!isComplianceModuleActive[module], "Module already added");
        
        complianceModules.push(ICompliance(module));
        isComplianceModuleActive[module] = true;
        
        emit ComplianceModuleAdded(module);
    }
    
    /**
     * @dev Remover un módulo de compliance
     * @param module Dirección del módulo de compliance
     */
    function removeComplianceModule(address module) external onlyRole(COMPLIANCE_ROLE) {
        require(isComplianceModuleActive[module], "Module not found");
        
        // Remover del array
        for (uint256 i = 0; i < complianceModules.length; i++) {
            if (address(complianceModules[i]) == module) {
                complianceModules[i] = complianceModules[complianceModules.length - 1];
                complianceModules.pop();
                break;
            }
        }
        
        isComplianceModuleActive[module] = false;
        emit ComplianceModuleRemoved(module);
    }
    
    /**
     * @dev Verificar si un módulo está activo
     * @param module Dirección del módulo
     * @return true si el módulo está activo
     */
    function isComplianceModule(address module) external view returns (bool) {
        return isComplianceModuleActive[module];
    }
    
    /**
     * @dev Obtener el número de módulos de compliance
     * @return Número de módulos activos
     */
    function getComplianceModulesCount() external view returns (uint256) {
        return complianceModules.length;
    }
    
    /**
     * @dev Obtener un módulo de compliance por índice
     * @param index Índice del módulo
     * @return Dirección del módulo
     */
    function getComplianceModule(uint256 index) external view returns (address) {
        require(index < complianceModules.length, "Index out of bounds");
        return address(complianceModules[index]);
    }
    
    // ============ Compliance Validation ============
    
    /**
     * @dev Verificar si una transferencia es permitida
     * 
     * VALIDACIONES (en orden):
     * 1. Token no está pausado
     * 2. Cuentas no están congeladas
     * 3. Verificación de identidad (isVerified)
     * 4. Validación de todos los módulos de compliance
     * 
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens a transferir
     * @return true si la transferencia es permitida
     */
    function canTransfer(address from, address to, uint256 amount) 
        public view returns (bool) {
        // 1. Verificar que el token no está pausado
        if (paused()) {
            return false;
        }
        
        // 2. Verificar que las cuentas no están congeladas
        if (frozen[from] || frozen[to]) {
            return false;
        }
        
        // 3. Verificar identidad
        if (!isVerified(from) || !isVerified(to)) {
            return false;
        }
        
        // 4. Validar todos los módulos de compliance
        for (uint256 i = 0; i < complianceModules.length; i++) {
            if (!complianceModules[i].canTransfer(from, to, amount)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Verificar si una transferencia es permitida (con mensajes de error específicos)
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens a transferir
     */
    function _validateTransfer(address from, address to, uint256 amount) internal view {
        // 1. Verificar que el token no está pausado
        require(!paused(), "Token is paused");
        
        // 2. Verificar que las cuentas no están congeladas
        require(!frozen[from], "Account is frozen");
        require(!frozen[to], "Account is frozen");
        
        // 3. Verificar identidad
        require(isVerified(from), "Sender not verified");
        require(isVerified(to), "Recipient not verified");
        
        // 4. Validar todos los módulos de compliance
        for (uint256 i = 0; i < complianceModules.length; i++) {
            require(
                complianceModules[i].canTransfer(from, to, amount),
                "Transfer not compliant"
            );
        }
    }
    
    // ============ Override Functions ============
    
    /**
     * @dev Flag para bypassar validaciones (usado por forcedTransfer)
     */
    bool private bypassCompliance;
    
    /**
     * @dev Override de _update para validar compliance y notificar módulos
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens transferidos
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Validar ANTES de transferir (solo para transferencias reales, no mint/burn)
        // forcedTransfer() setea bypassCompliance = true para bypassar validaciones
        if (from != address(0) && to != address(0) && !bypassCompliance) {
            _validateTransfer(from, to, amount);
        }
        
        // Resetear flag después de usar
        if (bypassCompliance) {
            bypassCompliance = false;
        }
        
        // Ejecutar la transferencia (actualizar balances)
        super._update(from, to, amount);
        
        // Notificar módulos DESPUÉS de transferir
        if (from != address(0) && to != address(0)) {
            for (uint256 i = 0; i < complianceModules.length; i++) {
                complianceModules[i].transferred(from, to, amount);
            }
        }
        
        // Notificar módulos cuando se mintean tokens
        if (from == address(0) && to != address(0)) {
            for (uint256 i = 0; i < complianceModules.length; i++) {
                complianceModules[i].created(to, amount);
            }
        }
        
        // Notificar módulos cuando se queman tokens
        if (from != address(0) && to == address(0)) {
            for (uint256 i = 0; i < complianceModules.length; i++) {
                complianceModules[i].destroyed(from, amount);
            }
        }
    }
    
    /**
     * @dev Override de transfer para validaciones de identidad
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens a transferir
     * @return true si la transferencia fue exitosa
     * 
     * Nota: La validación de compliance se hace en _update()
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override de transferFrom para validaciones de identidad
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens a transferir
     * @return true si la transferencia fue exitosa
     * 
     * Nota: La validación de compliance se hace en _update()
     */
    function transferFrom(address from, address to, uint256 amount) 
        public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        return super.transferFrom(from, to, amount);
    }
}

