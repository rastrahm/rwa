// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MaxHoldersCompliance} from "../src/compliance/MaxHoldersCompliance.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev Mock ERC20 token para testing
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("MockToken", "MTK") {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function setBalance(address account, uint256 amount) external {
        uint256 currentBalance = balanceOf(account);
        if (amount > currentBalance) {
            _mint(account, amount - currentBalance);
        } else if (amount < currentBalance) {
            _burn(account, currentBalance - amount);
        }
    }
}

/**
 * @title MaxHoldersComplianceTest
 * @dev Tests para MaxHoldersCompliance
 */
contract MaxHoldersComplianceTest is Test {
    MaxHoldersCompliance public compliance;
    MockERC20 public token;
    
    address public owner;
    address public user1;
    address public user2;
    address public user3;
    
    uint256 public constant MAX_HOLDERS = 10;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        // Desplegar token mock
        token = new MockERC20();
        
        // Desplegar compliance
        compliance = new MaxHoldersCompliance(owner, MAX_HOLDERS, address(token));
    }
    
    // ============ Paso 2.3: MaxHoldersCompliance ============
    
    /**
     * @dev Test: verificar constructor
     */
    function test_Constructor() public {
        assertEq(compliance.maxHolders(), MAX_HOLDERS);
        assertEq(compliance.tokenContract(), address(token));
        assertEq(compliance.owner(), owner);
        assertEq(compliance.getHoldersCount(), 0);
    }
    
    /**
     * @dev Test: transferencia permitida a holder existente
     */
    function test_CanTransfer_ToExistingHolder() public {
        // Setup: user2 ya es holder (tiene balance > 0)
        token.setBalance(user2, 100 * 10**18);
        compliance.transferred(address(0), user2, 100 * 10**18);
        
        assertTrue(compliance.isHolder(user2));
        
        // Transferencia a holder existente debe ser permitida
        bool canTransfer = compliance.canTransfer(user1, user2, 50 * 10**18);
        assertTrue(canTransfer);
    }
    
    /**
     * @dev Test: transferencia permitida cuando está bajo el límite
     */
    function test_CanTransfer_WhenUnderMaxHolders() public {
        // Setup: maxHolders = 10, agregar 5 holders
        for (uint i = 0; i < 5; i++) {
            address holder = makeAddr(string(abi.encodePacked("holder", i)));
            token.setBalance(holder, 1);
            compliance.transferred(address(0), holder, 1);
        }
        
        assertEq(compliance.getHoldersCount(), 5);
        
        // Transferencia a nuevo holder debe ser permitida (5 + 1 = 6 <= 10)
        address newHolder = makeAddr("newHolder");
        bool canTransfer = compliance.canTransfer(address(0), newHolder, 1);
        assertTrue(canTransfer);
    }
    
    /**
     * @dev Test: transferencia rechazada cuando excede el límite
     */
    function test_CannotExceedMaxHolders() public {
        // Setup: agregar 10 holders (el máximo)
        for (uint i = 0; i < MAX_HOLDERS; i++) {
            address holder = makeAddr(string(abi.encodePacked("holder", i)));
            token.setBalance(holder, 1);
            compliance.transferred(address(0), holder, 1);
        }
        
        assertEq(compliance.getHoldersCount(), MAX_HOLDERS);
        
        // Intentar agregar uno más debe fallar
        address newHolder = makeAddr("newHolder");
        bool canTransfer = compliance.canTransfer(address(0), newHolder, 1);
        assertFalse(canTransfer);
    }
    
    /**
     * @dev Test: transferred() agrega nuevo holder
     */
    function test_Transferred_AddsNewHolder() public {
        // Verificar que transferred() agrega nuevo holder
        token.setBalance(user1, 100 * 10**18);
        compliance.transferred(address(0), user1, 100 * 10**18);
        
        assertTrue(compliance.isHolder(user1));
        assertEq(compliance.getHoldersCount(), 1);
    }
    
    /**
     * @dev Test: transferred() no agrega holder duplicado
     */
    function test_Transferred_DoesNotAddDuplicateHolder() public {
        // Agregar user1 como holder
        token.setBalance(user1, 100 * 10**18);
        compliance.transferred(address(0), user1, 100 * 10**18);
        assertEq(compliance.getHoldersCount(), 1);
        
        // Transferir más tokens a user1 (ya es holder)
        compliance.transferred(user2, user1, 50 * 10**18);
        
        // El contador no debe aumentar
        assertEq(compliance.getHoldersCount(), 1);
        assertTrue(compliance.isHolder(user1));
    }
    
    /**
     * @dev Test: transferred() remueve holder cuando balance es cero
     */
    function test_Transferred_RemovesHolder_WhenBalanceZero() public {
        // Setup: user1 tiene 100 tokens
        token.setBalance(user1, 100 * 10**18);
        compliance.transferred(address(0), user1, 100 * 10**18);
        assertTrue(compliance.isHolder(user1));
        assertEq(compliance.getHoldersCount(), 1);
        
        // user1 transfiere todos sus tokens a user2
        token.setBalance(user1, 0);
        token.setBalance(user2, 100 * 10**18);
        compliance.transferred(user1, user2, 100 * 10**18);
        
        // user1 ya no es holder, user2 es holder
        assertFalse(compliance.isHolder(user1));
        assertTrue(compliance.isHolder(user2));
        assertEq(compliance.getHoldersCount(), 1); // Solo user2
    }
    
    /**
     * @dev Test: created() agrega nuevo holder
     */
    function test_Created_AddsNewHolder() public {
        // Mint tokens a user1
        token.setBalance(user1, 100 * 10**18);
        compliance.created(user1, 100 * 10**18);
        
        assertTrue(compliance.isHolder(user1));
        assertEq(compliance.getHoldersCount(), 1);
    }
    
    /**
     * @dev Test: destroyed() remueve holder cuando balance es cero
     */
    function test_Destroyed_RemovesHolder_WhenBalanceZero() public {
        // Setup: user1 tiene 100 tokens
        token.setBalance(user1, 100 * 10**18);
        compliance.transferred(address(0), user1, 100 * 10**18);
        assertTrue(compliance.isHolder(user1));
        
        // Quemar todos los tokens
        token.setBalance(user1, 0);
        compliance.destroyed(user1, 100 * 10**18);
        
        // user1 ya no es holder
        assertFalse(compliance.isHolder(user1));
        assertEq(compliance.getHoldersCount(), 0);
    }
    
    /**
     * @dev Test: destroyed() no remueve holder si balance > 0
     */
    function test_Destroyed_DoesNotRemoveHolder_WhenBalanceNotZero() public {
        // Setup: user1 tiene 200 tokens
        token.setBalance(user1, 200 * 10**18);
        compliance.transferred(address(0), user1, 200 * 10**18);
        assertTrue(compliance.isHolder(user1));
        
        // Quemar solo 100 tokens (balance sigue > 0)
        token.setBalance(user1, 100 * 10**18);
        compliance.destroyed(user1, 100 * 10**18);
        
        // user1 sigue siendo holder
        assertTrue(compliance.isHolder(user1));
        assertEq(compliance.getHoldersCount(), 1);
    }
    
    /**
     * @dev Test: setMaxHolders actualiza el máximo
     */
    function test_SetMaxHolders() public {
        uint256 newMaxHolders = 20;
        compliance.setMaxHolders(newMaxHolders);
        
        assertEq(compliance.maxHolders(), newMaxHolders);
    }
    
    /**
     * @dev Test: setMaxHolders solo puede ser llamado por owner
     */
    function test_RevertWhen_SetMaxHolders_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        compliance.setMaxHolders(20);
    }
    
    /**
     * @dev Test: setTokenContract actualiza el contrato del token
     */
    function test_SetTokenContract() public {
        MockERC20 newToken = new MockERC20();
        compliance.setTokenContract(address(newToken));
        
        assertEq(compliance.tokenContract(), address(newToken));
    }
    
    /**
     * @dev Test: setTokenContract solo puede ser llamado por owner
     */
    function test_RevertWhen_SetTokenContract_NotOwner() public {
        MockERC20 newToken = new MockERC20();
        vm.prank(user1);
        vm.expectRevert();
        compliance.setTokenContract(address(newToken));
    }
    
    /**
     * @dev Test: canTransfer permite cuando el límite se actualiza
     */
    function test_CanTransfer_AfterMaxHoldersUpdated() public {
        // Setup: agregar 10 holders (el máximo inicial)
        for (uint i = 0; i < MAX_HOLDERS; i++) {
            address holder = makeAddr(string(abi.encodePacked("holder", i)));
            token.setBalance(holder, 1);
            compliance.transferred(address(0), holder, 1);
        }
        
        // No se puede agregar más
        address newHolder = makeAddr("newHolder");
        assertFalse(compliance.canTransfer(address(0), newHolder, 1));
        
        // Aumentar el límite a 20
        compliance.setMaxHolders(20);
        
        // Ahora se puede agregar más
        assertTrue(compliance.canTransfer(address(0), newHolder, 1));
    }
}

