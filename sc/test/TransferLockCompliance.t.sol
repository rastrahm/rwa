// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TransferLockCompliance} from "../src/compliance/TransferLockCompliance.sol";

/**
 * @title TransferLockComplianceTest
 * @dev Tests para TransferLockCompliance
 */
contract TransferLockComplianceTest is Test {
    TransferLockCompliance public compliance;
    
    address public owner;
    address public user1;
    address public user2;
    
    uint256 public constant LOCK_PERIOD = 30 days;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        // Desplegar compliance
        compliance = new TransferLockCompliance(owner, LOCK_PERIOD);
    }
    
    // ============ Paso 2.4: TransferLockCompliance ============
    
    /**
     * @dev Test: verificar constructor
     */
    function test_Constructor() public {
        assertEq(compliance.lockPeriod(), LOCK_PERIOD);
        assertEq(compliance.owner(), owner);
    }
    
    /**
     * @dev Test: transferencia bloqueada durante el período de lock
     */
    function test_CannotTransferDuringLockPeriod() public {
        // user1 recibe tokens (esto actualiza lockUntil)
        compliance.transferred(address(0), user1, 100);
        
        // Verificar que user1 está bloqueado
        assertTrue(compliance.isLocked(user1));
        
        // Intentar transferir inmediatamente (debe fallar)
        vm.warp(block.timestamp + 1 days);
        bool canTransfer = compliance.canTransfer(user1, user2, 50);
        assertFalse(canTransfer);
    }
    
    /**
     * @dev Test: transferencia permitida después del período de lock
     */
    function test_CanTransfer_AfterLockPeriod() public {
        // user1 recibe tokens
        compliance.transferred(address(0), user1, 100);
        
        // Después del lock period (debe pasar)
        vm.warp(block.timestamp + 31 days);
        bool canTransfer = compliance.canTransfer(user1, user2, 50);
        assertTrue(canTransfer);
        assertFalse(compliance.isLocked(user1));
    }
    
    /**
     * @dev Test: transferencia permitida exactamente en el lock period
     */
    function test_CanTransfer_ExactlyAtLockPeriod() public {
        // user1 recibe tokens
        compliance.transferred(address(0), user1, 100);
        
        // Exactamente en el lock period (debe pasar)
        vm.warp(block.timestamp + 30 days);
        bool canTransfer = compliance.canTransfer(user1, user2, 50);
        assertTrue(canTransfer);
        assertFalse(compliance.isLocked(user1));
    }
    
    /**
     * @dev Test: transferred() actualiza lockUntil
     */
    function test_Transferred_UpdatesLockUntil() public {
        // user1 recibe tokens
        uint256 timestampBefore = block.timestamp;
        compliance.transferred(address(0), user1, 100);
        
        // Verificar que lockUntil se actualizó
        uint256 lockUntil = compliance.getLockUntil(user1);
        assertEq(lockUntil, timestampBefore + LOCK_PERIOD);
        assertTrue(compliance.isLocked(user1));
    }
    
    /**
     * @dev Test: múltiples transferencias extienden el lock period
     */
    function test_MultipleTransfers_ExtendLockPeriod() public {
        // user1 recibe tokens en día 0
        uint256 timestamp0 = block.timestamp;
        compliance.transferred(address(0), user1, 100);
        uint256 firstLockUntil = compliance.getLockUntil(user1);
        assertEq(firstLockUntil, timestamp0 + LOCK_PERIOD);
        
        // user1 recibe más tokens en día 10
        vm.warp(block.timestamp + 10 days);
        uint256 timestamp10 = block.timestamp;
        compliance.transferred(address(0), user1, 50);
        uint256 secondLockUntil = compliance.getLockUntil(user1);
        
        // El lock period se extiende desde el nuevo timestamp
        assertEq(secondLockUntil, timestamp10 + LOCK_PERIOD);
        assertGt(secondLockUntil, firstLockUntil);
    }
    
    /**
     * @dev Test: created() también bloquea (mint)
     */
    function test_Created_AlsoLocks() public {
        // Mint tokens a user1
        uint256 timestampBefore = block.timestamp;
        compliance.created(user1, 100);
        
        // Verificar que user1 está bloqueado
        uint256 lockUntil = compliance.getLockUntil(user1);
        assertEq(lockUntil, timestampBefore + LOCK_PERIOD);
        assertTrue(compliance.isLocked(user1));
    }
    
    /**
     * @dev Test: destroyed() no afecta el lock
     */
    function test_Destroyed_DoesNotAffectLock() public {
        // user1 recibe tokens
        compliance.transferred(address(0), user1, 100);
        uint256 lockUntil = compliance.getLockUntil(user1);
        
        // Quemar tokens
        compliance.destroyed(user1, 100);
        
        // El lock no debe cambiar
        assertEq(compliance.getLockUntil(user1), lockUntil);
    }
    
    /**
     * @dev Test: transferencia desde address(0) no bloquea
     */
    function test_TransferFromZero_DoesNotLock() public {
        // Transferencia desde address(0) (mint) bloquea al destinatario
        compliance.transferred(address(0), user1, 100);
        assertTrue(compliance.isLocked(user1));
        
        // Transferencia a address(0) (burn) no bloquea
        compliance.transferred(user1, address(0), 50);
        // user1 sigue bloqueado (porque aún tiene tokens)
        assertTrue(compliance.isLocked(user1));
    }
    
    /**
     * @dev Test: setLockPeriod actualiza el período
     */
    function test_SetLockPeriod() public {
        uint256 newLockPeriod = 60 days;
        compliance.setLockPeriod(newLockPeriod);
        
        assertEq(compliance.lockPeriod(), newLockPeriod);
    }
    
    /**
     * @dev Test: setLockPeriod solo puede ser llamado por owner
     */
    function test_RevertWhen_SetLockPeriod_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        compliance.setLockPeriod(60 days);
    }
    
    /**
     * @dev Test: canTransfer permite cuando no hay lock
     */
    function test_CanTransfer_WhenNoLock() public {
        // user1 nunca recibió tokens → no tiene lock
        bool canTransfer = compliance.canTransfer(user1, user2, 50);
        assertTrue(canTransfer);
        assertFalse(compliance.isLocked(user1));
    }
    
    /**
     * @dev Test: isLocked retorna false cuando no hay lock
     */
    function test_IsLocked_ReturnsFalse_WhenNoLock() public {
        // user1 nunca recibió tokens
        assertFalse(compliance.isLocked(user1));
        assertEq(compliance.getLockUntil(user1), 0);
    }
    
    /**
     * @dev Test: múltiples usuarios con locks independientes
     */
    function test_MultipleUsers_IndependentLocks() public {
        // user1 recibe tokens
        compliance.transferred(address(0), user1, 100);
        assertTrue(compliance.isLocked(user1));
        
        // user2 recibe tokens
        compliance.transferred(address(0), user2, 200);
        assertTrue(compliance.isLocked(user2));
        
        // Avanzar 31 días
        vm.warp(block.timestamp + 31 days);
        
        // user1 puede transferir (lock expiró)
        assertTrue(compliance.canTransfer(user1, user2, 50));
        assertFalse(compliance.isLocked(user1));
        
        // user2 puede transferir (lock expiró)
        assertTrue(compliance.canTransfer(user2, user1, 100));
        assertFalse(compliance.isLocked(user2));
    }
    
    // ============ Tests: Sistema de Tiers (Lock Periods según Cantidad) ============
    
    /**
     * @dev Test: configurar tiers de lock periods
     */
    function test_SetLockTiers() public {
        uint256[] memory thresholds = new uint256[](3);
        thresholds[0] = 100;
        thresholds[1] = 1000;
        thresholds[2] = 10000;
        
        uint256[] memory lockPeriods = new uint256[](3);
        lockPeriods[0] = 7 days;
        lockPeriods[1] = 30 days;
        lockPeriods[2] = 90 days;
        
        compliance.setLockTiers(thresholds, lockPeriods);
        
        (uint256[] memory returnedThresholds, uint256[] memory returnedLockPeriods) = compliance.getLockTiers();
        assertEq(returnedThresholds.length, 3);
        assertEq(returnedLockPeriods.length, 3);
        assertEq(returnedThresholds[0], 100);
        assertEq(returnedLockPeriods[0], 7 days);
    }
    
    /**
     * @dev Test: getLockPeriodForAmount retorna el tier correcto
     */
    function test_GetLockPeriodForAmount_WithTiers() public {
        uint256[] memory thresholds = new uint256[](3);
        thresholds[0] = 100;
        thresholds[1] = 1000;
        thresholds[2] = 10000;
        
        uint256[] memory lockPeriods = new uint256[](3);
        lockPeriods[0] = 7 days;
        lockPeriods[1] = 30 days;
        lockPeriods[2] = 90 days;
        
        compliance.setLockTiers(thresholds, lockPeriods);
        
        // Cantidad menor al primer umbral → lockPeriod por defecto
        assertEq(compliance.getLockPeriodForAmount(50), LOCK_PERIOD);
        
        // Cantidad igual al primer umbral → 7 días
        assertEq(compliance.getLockPeriodForAmount(100), 7 days);
        
        // Cantidad entre umbrales → tier más alto alcanzado
        assertEq(compliance.getLockPeriodForAmount(500), 7 days);
        
        // Cantidad igual al segundo umbral → 30 días
        assertEq(compliance.getLockPeriodForAmount(1000), 30 days);
        
        // Cantidad mayor al último umbral → 90 días
        assertEq(compliance.getLockPeriodForAmount(50000), 90 days);
    }
    
    /**
     * @dev Test: getLockPeriodForAmount sin tiers usa lockPeriod por defecto
     */
    function test_GetLockPeriodForAmount_WithoutTiers() public {
        // Sin tiers configurados, debe usar lockPeriod por defecto
        assertEq(compliance.getLockPeriodForAmount(50), LOCK_PERIOD);
        assertEq(compliance.getLockPeriodForAmount(1000), LOCK_PERIOD);
        assertEq(compliance.getLockPeriodForAmount(100000), LOCK_PERIOD);
    }
    
    /**
     * @dev Test: transferred aplica lock period según cantidad recibida
     */
    function test_Transferred_AppliesCorrectLockPeriod() public {
        uint256[] memory thresholds = new uint256[](2);
        thresholds[0] = 100;
        thresholds[1] = 1000;
        
        uint256[] memory lockPeriods = new uint256[](2);
        lockPeriods[0] = 7 days;
        lockPeriods[1] = 30 days;
        
        compliance.setLockTiers(thresholds, lockPeriods);
        
        uint256 timestamp0 = block.timestamp;
        
        // user1 recibe 50 tokens (< 100) → lockPeriod por defecto
        compliance.transferred(address(0), user1, 50);
        uint256 lockUntil1 = compliance.getLockUntil(user1);
        assertEq(lockUntil1, timestamp0 + LOCK_PERIOD);
        
        // user2 recibe 100 tokens (>= 100) → 7 días
        compliance.transferred(address(0), user2, 100);
        uint256 lockUntil2 = compliance.getLockUntil(user2);
        assertEq(lockUntil2, timestamp0 + 7 days);
        
        // user1 recibe más tokens (500, >= 100) → ahora 7 días
        vm.warp(block.timestamp + 1 days);
        uint256 timestamp1 = block.timestamp;
        compliance.transferred(address(0), user1, 500);
        uint256 lockUntil1Updated = compliance.getLockUntil(user1);
        assertEq(lockUntil1Updated, timestamp1 + 7 days);
    }
    
    /**
     * @dev Test: created aplica lock period según cantidad minteada
     */
    function test_Created_AppliesCorrectLockPeriod() public {
        uint256[] memory thresholds = new uint256[](2);
        thresholds[0] = 100;
        thresholds[1] = 1000;
        
        uint256[] memory lockPeriods = new uint256[](2);
        lockPeriods[0] = 7 days;
        lockPeriods[1] = 30 days;
        
        compliance.setLockTiers(thresholds, lockPeriods);
        
        uint256 timestamp0 = block.timestamp;
        
        // Mint 50 tokens (< 100) → lockPeriod por defecto
        compliance.created(user1, 50);
        assertEq(compliance.getLockUntil(user1), timestamp0 + LOCK_PERIOD);
        
        // Mint 1000 tokens (>= 1000) → 30 días
        compliance.created(user2, 1000);
        assertEq(compliance.getLockUntil(user2), timestamp0 + 30 days);
    }
    
    /**
     * @dev Test: diferentes cantidades tienen diferentes períodos de bloqueo
     */
    function test_DifferentAmounts_DifferentLockPeriods() public {
        uint256[] memory thresholds = new uint256[](3);
        thresholds[0] = 100;
        thresholds[1] = 1000;
        thresholds[2] = 10000;
        
        uint256[] memory lockPeriods = new uint256[](3);
        lockPeriods[0] = 7 days;
        lockPeriods[1] = 30 days;
        lockPeriods[2] = 90 days;
        
        compliance.setLockTiers(thresholds, lockPeriods);
        
        uint256 timestamp0 = block.timestamp;
        
        // Pequeña cantidad → lockPeriod por defecto
        compliance.transferred(address(0), user1, 50);
        
        // Cantidad media → 7 días
        compliance.transferred(address(0), user2, 500);
        
        // Cantidad grande → 30 días
        address user3 = makeAddr("user3");
        compliance.transferred(address(0), user3, 5000);
        
        // Cantidad muy grande → 90 días
        address user4 = makeAddr("user4");
        compliance.transferred(address(0), user4, 50000);
        
        // Verificar locks
        assertEq(compliance.getLockUntil(user1), timestamp0 + LOCK_PERIOD);
        assertEq(compliance.getLockUntil(user2), timestamp0 + 7 days);
        assertEq(compliance.getLockUntil(user3), timestamp0 + 30 days);
        assertEq(compliance.getLockUntil(user4), timestamp0 + 90 days);
        
        // Verificar que todos están bloqueados
        assertTrue(compliance.isLocked(user1));
        assertTrue(compliance.isLocked(user2));
        assertTrue(compliance.isLocked(user3));
        assertTrue(compliance.isLocked(user4));
    }
    
    /**
     * @dev Test: revertir cuando thresholds y lockPeriods tienen diferente longitud
     */
    function test_RevertWhen_SetLockTiers_LengthMismatch() public {
        uint256[] memory thresholds = new uint256[](2);
        thresholds[0] = 100;
        thresholds[1] = 1000;
        
        uint256[] memory lockPeriods = new uint256[](3);
        lockPeriods[0] = 7 days;
        lockPeriods[1] = 30 days;
        lockPeriods[2] = 90 days;
        
        vm.expectRevert("Arrays length mismatch");
        compliance.setLockTiers(thresholds, lockPeriods);
    }
    
    /**
     * @dev Test: revertir cuando thresholds no está ordenado
     */
    function test_RevertWhen_SetLockTiers_NotSorted() public {
        uint256[] memory thresholds = new uint256[](3);
        thresholds[0] = 1000;
        thresholds[1] = 100;  // Menor que el anterior
        thresholds[2] = 10000;
        
        uint256[] memory lockPeriods = new uint256[](3);
        lockPeriods[0] = 7 days;
        lockPeriods[1] = 30 days;
        lockPeriods[2] = 90 days;
        
        vm.expectRevert("Thresholds must be sorted ascending");
        compliance.setLockTiers(thresholds, lockPeriods);
    }
    
    /**
     * @dev Test: revertir cuando lockPeriod es 0
     */
    function test_RevertWhen_SetLockTiers_ZeroLockPeriod() public {
        uint256[] memory thresholds = new uint256[](2);
        thresholds[0] = 100;
        thresholds[1] = 1000;
        
        uint256[] memory lockPeriods = new uint256[](2);
        lockPeriods[0] = 7 days;
        lockPeriods[1] = 0;  // Inválido
        
        vm.expectRevert("Lock period must be > 0");
        compliance.setLockTiers(thresholds, lockPeriods);
    }
    
    /**
     * @dev Test: setLockTiers solo puede ser llamado por owner
     */
    function test_RevertWhen_SetLockTiers_NotOwner() public {
        uint256[] memory thresholds = new uint256[](1);
        thresholds[0] = 100;
        
        uint256[] memory lockPeriods = new uint256[](1);
        lockPeriods[0] = 7 days;
        
        vm.prank(user1);
        vm.expectRevert();
        compliance.setLockTiers(thresholds, lockPeriods);
    }
}

