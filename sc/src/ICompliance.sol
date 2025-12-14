// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICompliance
 * @dev Interface que deben implementar todos los módulos de compliance
 * 
 * Esta interfaz define el contrato que todos los módulos de compliance deben cumplir.
 * Permite que el Token pueda interactuar con múltiples módulos de forma uniforme.
 * 
 * FLUJO DE USO:
 * 1. Token llama canTransfer() ANTES de ejecutar una transferencia
 * 2. Si canTransfer() retorna true, se ejecuta la transferencia
 * 3. Token llama transferred() DESPUÉS de ejecutar la transferencia
 * 4. Token llama created() cuando se mintean tokens
 * 5. Token llama destroyed() cuando se queman tokens
 */
interface ICompliance {
    /**
     * @dev Verificar si una transferencia es permitida ANTES de ejecutarla
     * 
     * Esta función se llama ANTES de que se ejecute una transferencia.
     * Si retorna false, la transferencia será rechazada.
     * 
     * @param from Dirección del remitente (quien envía los tokens)
     * @param to Dirección del destinatario (quien recibe los tokens)
     * @param amount Cantidad de tokens a transferir
     * @return true si la transferencia es permitida, false en caso contrario
     * 
     * NOTA: Esta función es view, no modifica el estado del contrato.
     *       Solo lee información y retorna un booleano.
     */
    function canTransfer(address from, address to, uint256 amount) 
        external view returns (bool);

    /**
     * @dev Notificar DESPUÉS de que ocurrió una transferencia
     * 
     * Esta función se llama DESPUÉS de que se ejecutó una transferencia exitosa.
     * Permite que el módulo actualice su estado interno (ej: contadores, timestamps).
     * 
     * @param from Dirección del remitente
     * @param to Dirección del destinatario
     * @param amount Cantidad de tokens transferidos
     * 
     * NOTA: Esta función puede modificar el estado del contrato.
     *       Se usa para actualizar información después de la transferencia.
     */
    function transferred(address from, address to, uint256 amount) external;

    /**
     * @dev Notificar cuando se mintean tokens (mint)
     * 
     * Esta función se llama cuando se crean nuevos tokens (mint).
     * Permite que el módulo rastree cuando se agregan tokens al sistema.
     * 
     * @param to Dirección que recibe los tokens minteados
     * @param amount Cantidad de tokens minteados
     * 
     * EJEMPLO: Si un módulo limita el número de holders, debe verificar
     *          si 'to' es un nuevo holder y actualizar el contador.
     */
    function created(address to, uint256 amount) external;

    /**
     * @dev Notificar cuando se queman tokens (burn)
     * 
     * Esta función se llama cuando se destruyen tokens (burn).
     * Permite que el módulo rastree cuando se eliminan tokens del sistema.
     * 
     * @param from Dirección de la que se queman los tokens
     * @param amount Cantidad de tokens quemados
     * 
     * EJEMPLO: Si un módulo rastrea holders, debe verificar si 'from'
     *          dejó de ser holder (balance = 0) y actualizar el contador.
     */
    function destroyed(address from, uint256 amount) external;
}

