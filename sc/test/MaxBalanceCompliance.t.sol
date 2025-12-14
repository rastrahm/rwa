// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MaxBalanceCompliance} from "../src/compliance/MaxBalanceCompliance.sol";
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
 * @title MaxBalanceComplianceTest
 * @dev Tests para MaxBalanceCompliance
 */
contract MaxBalanceComplianceTest is Test {
    MaxBalanceCompliance public compliance;
    MockERC20 public token;
    
    address public owner;
    address public user1;
    address public user2;
    
    uint256 public constant MAX_BALANCE = 1000 * 10**18;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        // Desplegar token mock
        token = new MockERC20();
        
        // Desplegar compliance
        compliance = new MaxBalanceCompliance(owner, MAX_BALANCE, address(token));
    }
    
    // ============ Paso 2.2: MaxBalanceCompliance ============
    
    /**
     * @dev Test: verificar constructor
     */
    function test_Constructor() public {
        assertEq(compliance.maxBalance(), MAX_BALANCE);
        assertEq(compliance.tokenContract(), address(token));
        assertEq(compliance.owner(), owner);
    }
    
    /**
     * @dev Test: transferencia permitida cuando está bajo el máximo
     */
    function test_CanTransfer_WhenUnderMaxBalance() public {
        // Setup: user2 tiene 500 tokens, maxBalance = 1000
        token.setBalance(user2, 500 * 10**18);
        
        // Transferencia de 400 tokens debe ser permitida (500 + 400 = 900 <= 1000)
        bool canTransfer = compliance.canTransfer(user1, user2, 400 * 10**18);
        assertTrue(canTransfer);
    }
    
    /**
     * @dev Test: transferencia rechazada cuando excede el máximo
     */
    function test_CannotTransfer_WhenExceedsMaxBalance() public {
        // Setup: user2 tiene 500 tokens, maxBalance = 1000
        token.setBalance(user2, 500 * 10**18);
        
        // Transferencia de 600 tokens debe ser rechazada (500 + 600 = 1100 > 1000)
        bool canTransfer = compliance.canTransfer(user1, user2, 600 * 10**18);
        assertFalse(canTransfer);
    }
    
    /**
     * @dev Test: transferencia permitida cuando es exactamente el máximo
     */
    function test_CanTransfer_WhenExactlyMaxBalance() public {
        // Setup: user2 tiene 500 tokens, maxBalance = 1000
        token.setBalance(user2, 500 * 10**18);
        
        // Transferencia de exactamente 500 tokens debe ser permitida (500 + 500 = 1000)
        bool canTransfer = compliance.canTransfer(user1, user2, 500 * 10**18);
        assertTrue(canTransfer);
    }
    
    /**
     * @dev Test: transferencia permitida cuando el destinatario tiene balance cero
     */
    function test_CanTransfer_WhenRecipientHasZeroBalance() public {
        // Setup: user2 tiene 0 tokens, maxBalance = 1000
        token.setBalance(user2, 0);
        
        // Transferencia de 1000 tokens debe ser permitida (0 + 1000 = 1000)
        bool canTransfer = compliance.canTransfer(user1, user2, 1000 * 10**18);
        assertTrue(canTransfer);
    }
    
    /**
     * @dev Test: transferencia rechazada cuando el destinatario ya tiene el máximo
     */
    function test_CannotTransfer_WhenRecipientHasMaxBalance() public {
        // Setup: user2 tiene exactamente 1000 tokens (el máximo)
        token.setBalance(user2, 1000 * 10**18);
        
        // Cualquier transferencia debe ser rechazada
        bool canTransfer = compliance.canTransfer(user1, user2, 1);
        assertFalse(canTransfer);
    }
    
    /**
     * @dev Test: transferred() puede ser llamado sin revertir
     */
    function test_Transferred_CanBeCalled() public {
        // No debe revertir
        compliance.transferred(user1, user2, 100 * 10**18);
    }
    
    /**
     * @dev Test: created() puede ser llamado sin revertir
     */
    function test_Created_CanBeCalled() public {
        // No debe revertir
        compliance.created(user1, 100 * 10**18);
    }
    
    /**
     * @dev Test: destroyed() puede ser llamado sin revertir
     */
    function test_Destroyed_CanBeCalled() public {
        // No debe revertir
        compliance.destroyed(user1, 100 * 10**18);
    }
    
    /**
     * @dev Test: setMaxBalance actualiza el máximo
     */
    function test_SetMaxBalance() public {
        uint256 newMaxBalance = 2000 * 10**18;
        compliance.setMaxBalance(newMaxBalance);
        
        assertEq(compliance.maxBalance(), newMaxBalance);
    }
    
    /**
     * @dev Test: setMaxBalance solo puede ser llamado por owner
     */
    function test_RevertWhen_SetMaxBalance_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        compliance.setMaxBalance(2000 * 10**18);
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
     * @dev Test: canTransfer ignora el remitente (solo valida destinatario)
     */
    function test_CanTransfer_IgnoresSender() public {
        // Setup: user1 tiene 2000 tokens (más que el máximo)
        token.setBalance(user1, 2000 * 10**18);
        token.setBalance(user2, 500 * 10**18);
        
        // La transferencia debe ser permitida porque solo importa el balance del destinatario
        bool canTransfer = compliance.canTransfer(user1, user2, 400 * 10**18);
        assertTrue(canTransfer);
    }
}

