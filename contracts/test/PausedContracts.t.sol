// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {UniversalBridge} from "../src/UniversalBridge.sol";
import {TimeLockedWithdrawal} from "../src/TimeLockedWithdrawal.sol";
import {MultiPathWithdrawal} from "../src/MultiPathWithdrawal.sol";
import {CrossAssetMixer} from "../src/CrossAssetMixer.sol";
import {ProofOfInnocence} from "../src/ProofOfInnocence.sol";
import {PrivateDeFiRouter} from "../src/PrivateDeFiRouter.sol";
import {LoyaltyDiscount} from "../src/LoyaltyDiscount.sol";
import {AntiSurveillance} from "../src/AntiSurveillance.sol";

/// @title PausedContractsTest
/// @notice Locks down the killswitch behaviour we added during the
///         security audit. Every contract here ships with a placeholder
///         ZK verifier that returns true for any input — without the
///         paused-by-default flag, deploying any of them would mean
///         instant fund loss. These tests prove that:
///           1. They start paused on construction.
///           2. The fund-touching entry points revert while paused.
///           3. The authority can unpause.
///           4. Non-authority callers cannot unpause.
///         Adding new placeholder-ZK contracts? Mirror this file.
contract PausedContractsTest is Test {
    address constant FEE = address(0xFEE);
    address constant USER = address(0xCAFE);
    address constant ATTACKER = address(0xBAD);

    // ── UniversalBridge ─────────────────────────────────────────

    function test_universalBridge_startsPaused() public {
        UniversalBridge b = new UniversalBridge(address(1), address(2), address(3));
        assertTrue(b.paused(), "UniversalBridge must start paused");
    }

    function test_universalBridge_receiveBridgedDeposit_revertsWhenPaused() public {
        UniversalBridge b = new UniversalBridge(address(1), address(2), address(3));
        vm.expectRevert(bytes("Paused: bridge verification not wired"));
        b.receiveBridgedDeposit(
            UniversalBridge.SourceChain.BITCOIN,
            keccak256("tx"),
            USER,
            address(0),
            1 ether,
            false
        );
    }

    function test_universalBridge_setPaused_onlyAdmin() public {
        UniversalBridge b = new UniversalBridge(address(1), address(2), address(3));
        // Random caller cannot flip the killswitch
        vm.prank(ATTACKER);
        vm.expectRevert(bytes("Only admin"));
        b.setPaused(false);
        // But the deployer-admin can
        b.setPaused(false);
        assertFalse(b.paused());
    }

    // ── TimeLockedWithdrawal ────────────────────────────────────

    function test_timeLocked_startsPaused() public {
        TimeLockedWithdrawal t = new TimeLockedWithdrawal(FEE);
        assertTrue(t.paused(), "TimeLockedWithdrawal must start paused");
    }

    function test_timeLocked_schedule_revertsWhenPaused() public {
        TimeLockedWithdrawal t = new TimeLockedWithdrawal(FEE);
        vm.expectRevert(bytes("Paused: ZK verifier not wired"));
        t.scheduleWithdrawal(
            keccak256("nh"),
            USER,
            1 ether,
            address(0),
            1 hours,
            0
        );
    }

    function test_timeLocked_setPaused_onlyOwner() public {
        TimeLockedWithdrawal t = new TimeLockedWithdrawal(FEE);
        vm.prank(ATTACKER);
        vm.expectRevert(bytes("Only owner"));
        t.setPaused(false);
        t.setPaused(false);
        assertFalse(t.paused());
    }

    // ── MultiPathWithdrawal ─────────────────────────────────────

    function test_multiPath_startsPaused() public {
        MultiPathWithdrawal m = new MultiPathWithdrawal(FEE);
        assertTrue(m.paused(), "MultiPathWithdrawal must start paused");
    }

    function test_multiPath_create_revertsWhenPaused() public {
        MultiPathWithdrawal m = new MultiPathWithdrawal(FEE);
        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        uint256[] memory delays = new uint256[](1);
        recipients[0] = USER;
        amounts[0] = 1 ether;
        delays[0] = 0;

        vm.expectRevert(bytes("Paused: ZK verifier not wired"));
        m.createMultiWithdrawal(
            keccak256("nh"),
            address(0),
            recipients,
            amounts,
            delays
        );
    }

    function test_multiPath_setPaused_onlyOwner() public {
        MultiPathWithdrawal m = new MultiPathWithdrawal(FEE);
        vm.prank(ATTACKER);
        vm.expectRevert(bytes("Only owner"));
        m.setPaused(false);
        m.setPaused(false);
        assertFalse(m.paused());
    }

    // ── CrossAssetMixer ─────────────────────────────────────────

    function test_crossAsset_startsPaused() public {
        CrossAssetMixer c = new CrossAssetMixer(address(1), address(2), FEE);
        assertTrue(c.paused(), "CrossAssetMixer must start paused");
    }

    function test_crossAsset_withdraw_revertsWhenPaused() public {
        CrossAssetMixer c = new CrossAssetMixer(address(1), address(2), FEE);
        vm.expectRevert(bytes("Paused: ZK verifier not wired"));
        c.crossAssetWithdraw(
            keccak256("nh"),
            address(0),
            address(0xAB),
            1 ether,
            0,
            USER
        );
    }

    function test_crossAsset_setPaused_onlyAdmin() public {
        CrossAssetMixer c = new CrossAssetMixer(address(1), address(2), FEE);
        vm.prank(ATTACKER);
        vm.expectRevert(bytes("Only admin"));
        c.setPaused(false);
        c.setPaused(false);
        assertFalse(c.paused());
    }

    // ── ProofOfInnocence ────────────────────────────────────────

    function test_proofOfInnocence_startsPaused() public {
        ProofOfInnocence p = new ProofOfInnocence();
        assertTrue(p.paused(), "ProofOfInnocence must start paused");
    }

    function test_proofOfInnocence_proveInnocence_revertsWhenPaused() public {
        ProofOfInnocence p = new ProofOfInnocence();
        vm.expectRevert(bytes("Paused: ZK verifier not wired"));
        p.proveInnocence(hex"00", keccak256("root"));
    }

    function test_proofOfInnocence_setPaused_onlyOwner() public {
        ProofOfInnocence p = new ProofOfInnocence();
        vm.prank(ATTACKER);
        vm.expectRevert(ProofOfInnocence.NotOwner.selector);
        p.setPaused(false);
        p.setPaused(false);
        assertFalse(p.paused());
    }

    // ── PrivateDeFiRouter ───────────────────────────────────────

    function test_privateDeFi_startsPaused() public {
        PrivateDeFiRouter r = new PrivateDeFiRouter(address(0x100));
        assertTrue(r.paused(), "PrivateDeFiRouter must start paused");
    }

    function test_privateDeFi_execute_revertsWhenPaused() public {
        PrivateDeFiRouter r = new PrivateDeFiRouter(address(0x100));
        PrivateDeFiRouter.DeFiAction memory action = PrivateDeFiRouter.DeFiAction({
            actionType: PrivateDeFiRouter.ActionType.SWAP,
            tokenIn: address(0xA),
            tokenOut: address(0xB),
            amountIn: 1 ether,
            minAmountOut: 0,
            extraData: ""
        });
        vm.expectRevert(bytes("Paused: ZK verifier not wired"));
        r.executePrivateAction(
            hex"00",
            keccak256("root"),
            keccak256("nh"),
            action,
            keccak256("o1"),
            keccak256("o2")
        );
    }

    function test_privateDeFi_setPaused_onlyOwner() public {
        PrivateDeFiRouter r = new PrivateDeFiRouter(address(0x100));
        vm.prank(ATTACKER);
        vm.expectRevert(PrivateDeFiRouter.NotOwner.selector);
        r.setPaused(false);
        r.setPaused(false);
        assertFalse(r.paused());
    }

    // ── LoyaltyDiscount (auth-gated, not paused) ────────────────
    // recordUsage must reject every caller until the owner whitelists
    // them. Otherwise anyone can grind their loyalty commitment to
    // Platinum (50 cheap calls) and unlock 75% fee discounts.

    function test_loyalty_recordUsage_unauthorizedReverts() public {
        LoyaltyDiscount l = new LoyaltyDiscount();
        vm.prank(ATTACKER);
        vm.expectRevert(bytes("Not authorized"));
        l.recordUsage(keccak256("commitment"));
    }

    function test_loyalty_setAuthorizedCaller_onlyOwner() public {
        LoyaltyDiscount l = new LoyaltyDiscount();
        vm.prank(ATTACKER);
        vm.expectRevert(bytes("Only owner"));
        l.setAuthorizedCaller(ATTACKER, true);
    }

    function test_loyalty_authorizedCallerCanRecord() public {
        LoyaltyDiscount l = new LoyaltyDiscount();
        // Owner whitelists a mixer-style caller (here the test
        // contract acts as the mixer)
        l.setAuthorizedCaller(address(this), true);
        l.recordUsage(keccak256("commitment"));
        assertEq(l.loyaltyPoints(keccak256("commitment")), 1);
    }

    // ── AntiSurveillance (auth-gated decoy spam) ────────────────

    function test_antiSurveillance_generateDecoys_unauthorizedReverts() public {
        AntiSurveillance a = new AntiSurveillance();
        vm.prank(ATTACKER);
        vm.expectRevert(bytes("Not authorized"));
        a.generateDecoys(1, AntiSurveillance.DecoyType.FAKE_DEPOSIT);
    }

    function test_antiSurveillance_setAuthorizedCaller_onlyOwner() public {
        AntiSurveillance a = new AntiSurveillance();
        vm.prank(ATTACKER);
        vm.expectRevert(bytes("Only owner"));
        a.setAuthorizedCaller(ATTACKER, true);
    }

    function test_antiSurveillance_authorizedCallerCanGenerate() public {
        AntiSurveillance a = new AntiSurveillance();
        a.setAuthorizedCaller(address(this), true);
        a.generateDecoys(1, AntiSurveillance.DecoyType.FAKE_DEPOSIT);
        assertEq(a.totalDecoysGenerated(), 1);
    }
}
