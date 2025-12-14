// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICompliance} from "../ICompliance.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TransferLockCompliance
 * @dev Módulo de compliance que bloquea transferencias por un período de tiempo
 * 
 * Este módulo bloquea las transferencias de tokens durante un período de tiempo
 * después de que un usuario recibe tokens. Esto previene la venta inmediata de tokens.
 * 
 * LÓGICA:
 * - Cuando un usuario recibe tokens (transfer o mint), se actualiza su lockUntil
 * - El lock period depende de la cantidad recibida (sistema de tiers)
 * - lockUntil = block.timestamp + getLockPeriodForAmount(amount)
 * - canTransfer() valida: block.timestamp >= lockUntil
 * - Si el tiempo actual es menor que lockUntil → transferencia bloqueada
 * 
 * SISTEMA DE TIERS:
 * - Diferentes cantidades tienen diferentes lock periods
 * - Ejemplo: < 100 tokens → 7 días, 100-1000 → 30 días, > 1000 → 90 días
 */
contract TransferLockCompliance is ICompliance, Ownable {
    // ============ State Variables ============
    
    /**
     * @dev Período de bloqueo por defecto en segundos (para retrocompatibilidad)
     * Se usa cuando no hay tiers configurados o la cantidad no alcanza ningún umbral
     */
    uint256 public lockPeriod;
    
    /**
     * @dev Array de umbrales (thresholds) ordenados de menor a mayor
     * thresholds[i] = cantidad mínima para aplicar lockPeriods[i]
     * Ejemplo: [100, 1000, 10000] significa:
     *   - < 100 tokens → lockPeriod por defecto
     *   - >= 100 y < 1000 → lockPeriods[0]
     *   - >= 1000 y < 10000 → lockPeriods[1]
     *   - >= 10000 → lockPeriods[2]
     */
    uint256[] public thresholds;
    
    /**
     * @dev Array de lock periods correspondientes a cada umbral
     * lockPeriods[i] = período de bloqueo para amounts >= thresholds[i]
     * Debe tener la misma longitud que thresholds
     */
    uint256[] public lockPeriods;
    
    /**
     * @dev Mapping que almacena hasta cuándo está bloqueada cada dirección
     * lockUntil[account] = timestamp hasta cuando está bloqueado
     * Si lockUntil[account] = 0, no hay lock activo
     * Si block.timestamp < lockUntil[account], está bloqueado
     */
    mapping(address => uint256) private lockUntil;
    
    // ============ Events ============
    
    event LockPeriodUpdated(uint256 oldLockPeriod, uint256 newLockPeriod);
    event LockTiersUpdated(uint256[] thresholds, uint256[] lockPeriods);
    event LockUpdated(address indexed account, uint256 lockUntil, uint256 lockPeriod);
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor
     * @param initialOwner Dirección del owner del contrato
     * @param _lockPeriod Período de bloqueo por defecto en segundos
     */
    constructor(address initialOwner, uint256 _lockPeriod) Ownable(initialOwner) {
        lockPeriod = _lockPeriod;
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @dev Actualizar el período de bloqueo por defecto
     * @param _lockPeriod Nuevo período de bloqueo en segundos
     */
    function setLockPeriod(uint256 _lockPeriod) external onlyOwner {
        uint256 oldLockPeriod = lockPeriod;
        lockPeriod = _lockPeriod;
        emit LockPeriodUpdated(oldLockPeriod, _lockPeriod);
    }
    
    /**
     * @dev Configurar los tiers de lock periods según cantidad
     * @param _thresholds Array de umbrales (cantidades mínimas) ordenados de menor a mayor
     * @param _lockPeriods Array de lock periods correspondientes a cada umbral
     * 
     * REQUISITOS:
     * - thresholds y lockPeriods deben tener la misma longitud
     * - thresholds debe estar ordenado de menor a mayor
     * - Cada lockPeriod debe ser > 0
     * 
     * EJEMPLO:
     * - thresholds = [100, 1000, 10000]
     * - lockPeriods = [7 days, 30 days, 90 days]
     * - Resultado: < 100 → lockPeriod por defecto, >= 100 → 7 días, >= 1000 → 30 días, >= 10000 → 90 días
     */
    function setLockTiers(uint256[] calldata _thresholds, uint256[] calldata _lockPeriods) 
        external onlyOwner {
        require(_thresholds.length == _lockPeriods.length, "Arrays length mismatch");
        require(_thresholds.length <= 10, "Too many tiers"); // Límite razonable
        
        // Validar que thresholds esté ordenado y lockPeriods sean válidos
        for (uint256 i = 0; i < _thresholds.length; i++) {
            require(_lockPeriods[i] > 0, "Lock period must be > 0");
            if (i > 0) {
                require(_thresholds[i] > _thresholds[i - 1], "Thresholds must be sorted ascending");
            }
        }
        
        // Limpiar arrays anteriores
        delete thresholds;
        delete lockPeriods;
        
        // Copiar nuevos valores
        for (uint256 i = 0; i < _thresholds.length; i++) {
            thresholds.push(_thresholds[i]);
            lockPeriods.push(_lockPeriods[i]);
        }
        
        emit LockTiersUpdated(_thresholds, _lockPeriods);
    }
    
    /**
     * @dev Obtener el lock period que corresponde a una cantidad específica
     * @param amount Cantidad de tokens recibidos
     * @return lockPeriodToApply El período de bloqueo en segundos que se aplicará
     * 
     * LÓGICA:
     * - Si no hay tiers configurados → retorna lockPeriod por defecto
     * - Busca el tier más alto que la cantidad alcance
     * - Si amount >= thresholds[i] → retorna lockPeriods[i]
     * - Si no alcanza ningún tier → retorna lockPeriod por defecto
     */
    function getLockPeriodForAmount(uint256 amount) public view returns (uint256) {
        // Si no hay tiers configurados, usar lock period por defecto
        if (thresholds.length == 0) {
            return lockPeriod;
        }
        
        // Buscar el tier más alto que la cantidad alcance
        // Recorrer de mayor a menor para encontrar el primer umbral que se alcance
        for (uint256 i = thresholds.length; i > 0; i--) {
            if (amount >= thresholds[i - 1]) {
                return lockPeriods[i - 1];
            }
        }
        
        // Si no alcanza ningún umbral, usar lock period por defecto
        return lockPeriod;
    }
    
    /**
     * @dev Obtener información de todos los tiers configurados
     * @return _thresholds Array de umbrales
     * @return _lockPeriods Array de lock periods
     */
    function getLockTiers() external view returns (uint256[] memory _thresholds, uint256[] memory _lockPeriods) {
        return (thresholds, lockPeriods);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Obtener hasta cuándo está bloqueada una dirección
     * @param account Dirección a consultar
     * @return Timestamp hasta cuando está bloqueada (0 si no hay lock)
     */
    function getLockUntil(address account) external view returns (uint256) {
        return lockUntil[account];
    }
    
    /**
     * @dev Verificar si una dirección está bloqueada
     * @param account Dirección a verificar
     * @return true si está bloqueada, false en caso contrario
     */
    function isLocked(address account) external view returns (bool) {
        // Si lockUntil es 0, no hay lock activo
        if (lockUntil[account] == 0) {
            return false;
        }
        
        // Si el tiempo actual es menor que lockUntil, está bloqueado
        return block.timestamp < lockUntil[account];
    }
    
    // ============ ICompliance Implementation ============
    
    /**
     * @dev Verificar si una transferencia es permitida
     * 
     * VALIDACIÓN:
     * - Verifica si 'from' está bloqueado
     * - Si block.timestamp < lockUntil[from] → bloqueada
     * - Si block.timestamp >= lockUntil[from] → permitida
     * 
     * NOTA: Solo se valida el remitente (from), no el destinatario (to)
     * 
     * @param from Dirección del remitente
     * @param to Dirección del destinatario (no se usa en la validación)
     * @param amount Cantidad de tokens a transferir (no se usa en la validación)
     * @return true si la transferencia es permitida, false en caso contrario
     */
    function canTransfer(address from, address to, uint256 amount) 
        external view override returns (bool) {
        // Si 'from' es address(0), es un mint → siempre permitido (se validará en created())
        if (from == address(0)) {
            return true;
        }
        
        // Si 'from' no tiene lock activo → permitida
        if (lockUntil[from] == 0) {
            return true;
        }
        
        // Verificar si el lock ya expiró
        // Si block.timestamp >= lockUntil[from] → permitida
        // Si block.timestamp < lockUntil[from] → bloqueada
        return block.timestamp >= lockUntil[from];
    }
    
    /**
     * @dev Notificar después de una transferencia
     * 
     * ACTUALIZA EL ESTADO:
     * - Si 'to' recibe tokens (no es address(0)) → actualiza su lockUntil
     * - lockUntil[to] = block.timestamp + getLockPeriodForAmount(amount)
     * - El lock period depende de la cantidad recibida (sistema de tiers)
     * 
     * NOTA: Cada vez que se reciben tokens, el lock se resetea/extiende
     * 
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad transferida
     */
    function transferred(address from, address to, uint256 amount) external override {
        // Si 'to' recibe tokens, actualizar su lockUntil
        if (to != address(0)) {
            uint256 lockPeriodToApply = getLockPeriodForAmount(amount);
            lockUntil[to] = block.timestamp + lockPeriodToApply;
            emit LockUpdated(to, lockUntil[to], lockPeriodToApply);
        }
    }
    
    /**
     * @dev Notificar cuando se mintean tokens
     * 
     * ACTUALIZA EL ESTADO:
     * - Si 'to' recibe tokens minteados → actualiza su lockUntil
     * - lockUntil[to] = block.timestamp + getLockPeriodForAmount(amount)
     * - El lock period depende de la cantidad minteada (sistema de tiers)
     * 
     * @param to Dirección que recibe los tokens minteados
     * @param amount Cantidad minteada
     */
    function created(address to, uint256 amount) external override {
        // Mint también bloquea
        if (to != address(0)) {
            uint256 lockPeriodToApply = getLockPeriodForAmount(amount);
            lockUntil[to] = block.timestamp + lockPeriodToApply;
            emit LockUpdated(to, lockUntil[to], lockPeriodToApply);
        }
    }
    
    /**
     * @dev Notificar cuando se queman tokens
     * 
     * NO ACTUALIZA EL ESTADO:
     * - El burn no afecta el lock
     * - El usuario sigue bloqueado hasta que expire el lock
     * 
     * @param from Dirección de la que se queman tokens (no se usa)
     * @param amount Cantidad quemada (no se usa)
     */
    function destroyed(address from, uint256 amount) external override {
        // Burn no afecta el lock
        // El usuario sigue bloqueado hasta que expire el lock
    }
}

