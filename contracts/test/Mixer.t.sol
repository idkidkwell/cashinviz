// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Mixer} from "../src/Mixer.sol";
import {ERC20Mixer} from "../src/ERC20Mixer.sol";
import {ShieldedPool} from "../src/ShieldedPool.sol";
import {CrossChainBridge} from "../src/CrossChainBridge.sol";
import {MixerFactory} from "../src/MixerFactory.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

// ── Mock ERC-20 for testing ──────────────────────────────────

contract MockERC20 is IERC20 {
    string public name = "Mock USDC";
    string public symbol = "USDC";
    uint8 public decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient");
        require(allowance[from][msg.sender] >= amount, "Not approved");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}

// ── Mock Verifier for testing ────────────────────────────────
// Stand-in for the Noir-generated verifier so tests can exercise
// contract plumbing (root sync, nullifier replay, fee math) without
// also pulling in a full proving setup. Always returns true.

contract MockVerifier {
    function verify(bytes calldata, bytes32[] calldata) external pure returns (bool) {
        return true;
    }
}

// ── ETH Mixer Tests ──────────────────────────────────────────

contract MixerTest is Test {
    Mixer public mixer;
    address public owner = address(0xBEEF);
    address payable public recipient = payable(address(0xCAFE));
    address payable public relayer = payable(address(0xFACE));

    uint256 constant DENOMINATION = 1 ether;

    function setUp() public {
        vm.deal(owner, 1000 ether);
        vm.deal(address(this), 1000 ether);
        mixer = new Mixer(DENOMINATION, owner);
    }

    function test_deposit_success() public {
        bytes32 commitment = keccak256("test_1");
        mixer.deposit{value: DENOMINATION}(commitment);

        assertTrue(mixer.commitments(commitment));
        assertEq(mixer.nextIndex(), 1);
        assertEq(mixer.depositCount(), 1);
    }

    function test_deposit_wrong_amount_reverts() public {
        vm.expectRevert(Mixer.IncorrectDepositAmount.selector);
        mixer.deposit{value: 0.5 ether}(keccak256("x"));
    }

    function test_deposit_duplicate_reverts() public {
        bytes32 c = keccak256("dup");
        mixer.deposit{value: DENOMINATION}(c);
        vm.expectRevert(Mixer.CommitmentAlreadyExists.selector);
        mixer.deposit{value: DENOMINATION}(c);
    }

    function test_multiple_deposits() public {
        for (uint256 i = 0; i < 5; i++) {
            mixer.deposit{value: DENOMINATION}(keccak256(abi.encodePacked(i)));
        }
        assertEq(mixer.nextIndex(), 5);
        assertEq(mixer.depositCount(), 5);
        assertEq(address(mixer).balance, 5 ether);
    }

    function test_withdraw_success() public {
        mixer.deposit{value: DENOMINATION}(keccak256("w"));
        bytes32 root = mixer.getLastRoot();
        bytes32 nh = keccak256("null_1");

        uint256 ownerBefore = owner.balance;
        uint256 recipientBefore = recipient.balance;

        mixer.withdraw("", root, nh, recipient, payable(address(0)), 0);

        uint256 fee = (DENOMINATION * 100) / 10_000;
        assertEq(owner.balance - ownerBefore, fee);
        assertEq(recipient.balance - recipientBefore, DENOMINATION - fee);
    }

    function test_withdraw_with_relayer_fee() public {
        mixer.deposit{value: DENOMINATION}(keccak256("r"));
        bytes32 root = mixer.getLastRoot();
        uint256 relayerFee = 0.001 ether;

        uint256 relayerBefore = relayer.balance;
        uint256 recipientBefore = recipient.balance;

        mixer.withdraw("", root, keccak256("nr"), recipient, relayer, relayerFee);

        uint256 protocolFee = (DENOMINATION * 100) / 10_000;
        assertEq(relayer.balance - relayerBefore, relayerFee);
        assertEq(recipient.balance - recipientBefore, DENOMINATION - protocolFee - relayerFee);
    }

    function test_withdraw_double_spend_reverts() public {
        mixer.deposit{value: DENOMINATION}(keccak256("ds"));
        bytes32 root = mixer.getLastRoot();
        bytes32 nh = keccak256("nds");

        mixer.withdraw("", root, nh, recipient, payable(address(0)), 0);
        vm.expectRevert(Mixer.NullifierAlreadySpent.selector);
        mixer.withdraw("", root, nh, recipient, payable(address(0)), 0);
    }

    function test_withdraw_unknown_root_reverts() public {
        mixer.deposit{value: DENOMINATION}(keccak256("ur"));
        vm.expectRevert(Mixer.UnknownRoot.selector);
        mixer.withdraw("", keccak256("fake"), keccak256("n"), recipient, payable(address(0)), 0);
    }

    function test_root_changes_after_deposit() public {
        bytes32 rootBefore = mixer.getLastRoot();
        mixer.deposit{value: DENOMINATION}(keccak256("rc"));
        assertTrue(rootBefore != mixer.getLastRoot());
    }

    function test_old_root_still_known() public {
        mixer.deposit{value: DENOMINATION}(keccak256("old1"));
        bytes32 root1 = mixer.getLastRoot();
        mixer.deposit{value: DENOMINATION}(keccak256("old2"));
        assertTrue(mixer.isKnownRoot(root1));
    }

    function test_transfer_ownership_two_step() public {
        Mixer m = new Mixer(1 ether, address(this));
        address newOwner = address(0xDEAD);

        // Step 1: outgoing owner records the successor.
        m.transferOwnership(newOwner);
        assertEq(m.pendingOwner(), newOwner);
        // Owner does NOT change yet — that's the whole point.
        assertEq(m.owner(), address(this));

        // Step 2: successor accepts from their own address.
        vm.prank(newOwner);
        m.acceptOwnership();
        assertEq(m.owner(), newOwner);
        assertEq(m.pendingOwner(), address(0));
    }

    function test_transfer_ownership_zero_reverts() public {
        Mixer m = new Mixer(1 ether, address(this));
        vm.expectRevert(Mixer.ZeroOwner.selector);
        m.transferOwnership(address(0));
    }

    function test_accept_ownership_wrong_caller_reverts() public {
        Mixer m = new Mixer(1 ether, address(this));
        m.transferOwnership(address(0xDEAD));
        vm.prank(address(0xBEEF));
        vm.expectRevert(Mixer.NotPendingOwner.selector);
        m.acceptOwnership();
    }

    receive() external payable {}
}

// ── ERC-20 Mixer Tests ───────────────────────────────────────

contract ERC20MixerTest is Test {
    ERC20Mixer public mixer;
    MockERC20 public token;
    address public owner = address(0xBEEF);
    address public user = address(0xCAFE);
    address public recipient = address(0xFACE);

    uint256 constant DENOM = 1000e6; // 1000 USDC

    function setUp() public {
        token = new MockERC20();
        mixer = new ERC20Mixer(address(token), DENOM, owner);

        token.mint(user, 10_000e6);
        token.mint(address(this), 10_000e6);
    }

    function test_erc20_deposit() public {
        vm.startPrank(user);
        token.approve(address(mixer), DENOM);
        mixer.deposit(keccak256("erc20_1"));
        vm.stopPrank();

        assertTrue(mixer.commitments(keccak256("erc20_1")));
        assertEq(mixer.depositCount(), 1);
        assertEq(token.balanceOf(address(mixer)), DENOM);
    }

    function test_erc20_withdraw() public {
        vm.startPrank(user);
        token.approve(address(mixer), DENOM);
        mixer.deposit(keccak256("erc20_w"));
        vm.stopPrank();

        bytes32 root = mixer.getLastRoot();
        uint256 recipientBefore = token.balanceOf(recipient);
        uint256 ownerBefore = token.balanceOf(owner);

        mixer.withdraw("", root, keccak256("n_erc20"), recipient, address(0), 0);

        uint256 fee = (DENOM * 100) / 10_000;
        assertEq(token.balanceOf(owner) - ownerBefore, fee);
        assertEq(token.balanceOf(recipient) - recipientBefore, DENOM - fee);
    }

    function test_erc20_duplicate_deposit_reverts() public {
        vm.startPrank(user);
        token.approve(address(mixer), DENOM * 2);
        mixer.deposit(keccak256("dup_erc"));
        vm.expectRevert(ERC20Mixer.CommitmentAlreadyExists.selector);
        mixer.deposit(keccak256("dup_erc"));
        vm.stopPrank();
    }

    function test_erc20_anonymity_set() public {
        token.approve(address(mixer), DENOM * 3);
        for (uint256 i = 0; i < 3; i++) {
            mixer.deposit(keccak256(abi.encodePacked("set_", i)));
        }
        assertEq(mixer.anonymitySetSize(), 3);
    }
}

// ── Shielded Pool Tests ──────────────────────────────────────

contract ShieldedPoolTest is Test {
    ShieldedPool public pool;
    MockERC20 public usdc;
    address public user = address(0xCAFE);
    address payable public recipient = payable(address(0xFACE));

    function setUp() public {
        // Test-as-owner so we can call addToken / setVerifier without
        // pranking. The factory test below covers the factory path
        // (deployer-as-owner via the factory).
        pool = new ShieldedPool(address(this));
        usdc = new MockERC20();

        pool.addToken(address(usdc));

        vm.deal(user, 100 ether);
        vm.deal(address(this), 100 ether);
        usdc.mint(user, 1_000_000e6);
    }

    function test_eth_deposit() public {
        bytes32 c = keccak256("shielded_eth");
        pool.deposit{value: 1 ether}(c, address(0), 1 ether);

        assertTrue(pool.commitments(c));
        assertEq(pool.depositCount(address(0)), 1);
        assertEq(pool.totalNotes(), 1);
    }

    function test_erc20_deposit() public {
        vm.startPrank(user);
        usdc.approve(address(pool), 1000e6);
        pool.deposit(keccak256("shielded_usdc"), address(usdc), 1000e6);
        vm.stopPrank();

        assertEq(pool.depositCount(address(usdc)), 1);
        assertEq(usdc.balanceOf(address(pool)), 1000e6);
    }

    function test_disallowed_token_reverts() public {
        MockERC20 badToken = new MockERC20();
        vm.expectRevert(ShieldedPool.TokenNotAllowed.selector);
        pool.deposit(keccak256("bad"), address(badToken), 100);
    }

    function test_eth_wrong_amount_reverts() public {
        vm.expectRevert(ShieldedPool.IncorrectETHAmount.selector);
        pool.deposit{value: 0.5 ether}(keccak256("wrong"), address(0), 1 ether);
    }

    function test_zero_amount_reverts() public {
        vm.expectRevert(ShieldedPool.InvalidAmount.selector);
        pool.deposit(keccak256("zero"), address(0), 0);
    }

    function test_eth_withdraw() public {
        pool.deposit{value: 5 ether}(keccak256("w_eth"), address(0), 5 ether);
        bytes32 root = pool.getLastRoot();

        uint256 recipientBefore = recipient.balance;

        pool.withdraw(
            "", root, keccak256("nh_eth"), recipient,
            address(0), 5 ether, payable(address(0)), 0
        );

        uint256 fee = (5 ether * 100) / 10_000;
        assertEq(recipient.balance - recipientBefore, 5 ether - fee);
    }

    function test_shielded_transfer() public {
        bytes32 inputCommitment = keccak256("transfer_in");
        pool.deposit{value: 10 ether}(inputCommitment, address(0), 10 ether);

        bytes32 root = pool.getLastRoot();
        bytes32 nullifier = keccak256("tn");
        bytes32 out1 = keccak256("out1");
        bytes32 out2 = keccak256("out2");

        pool.shieldedTransfer("", root, nullifier, out1, out2);

        // Input nullifier is spent
        assertTrue(pool.nullifierHashes(nullifier));
        // Both outputs are inserted
        assertTrue(pool.commitments(out1));
        assertTrue(pool.commitments(out2));
        // Tree advanced by 2 (the 2 new notes)
        assertEq(pool.totalNotes(), 3); // 1 deposit + 2 transfer outputs
    }

    function test_shielded_transfer_double_spend_reverts() public {
        pool.deposit{value: 1 ether}(keccak256("ds_in"), address(0), 1 ether);
        bytes32 root = pool.getLastRoot();
        bytes32 nullifier = keccak256("ds_null");

        pool.shieldedTransfer("", root, nullifier, keccak256("a"), keccak256("b"));

        vm.expectRevert(ShieldedPool.NullifierAlreadySpent.selector);
        pool.shieldedTransfer("", root, nullifier, keccak256("c"), keccak256("d"));
    }

    function test_anonymity_set_per_token() public {
        pool.deposit{value: 1 ether}(keccak256("anon1"), address(0), 1 ether);
        pool.deposit{value: 2 ether}(keccak256("anon2"), address(0), 2 ether);

        vm.startPrank(user);
        usdc.approve(address(pool), 1000e6);
        pool.deposit(keccak256("anon3"), address(usdc), 1000e6);
        vm.stopPrank();

        assertEq(pool.anonymitySetSize(address(0)), 2);
        assertEq(pool.anonymitySetSize(address(usdc)), 1);
    }

    function test_add_remove_token() public {
        MockERC20 newToken = new MockERC20();
        pool.addToken(address(newToken));
        assertTrue(pool.allowedTokens(address(newToken)));

        pool.removeToken(address(newToken));
        assertFalse(pool.allowedTokens(address(newToken)));
    }

    receive() external payable {}
}

// ── Cross-Chain Bridge Tests ─────────────────────────────────

contract CrossChainBridgeTest is Test {
    CrossChainBridge public bridge;
    address public relayerAddr = address(0xDEAD);

    function setUp() public {
        bridge = new CrossChainBridge(address(0x1));
        bridge.connectChain(42161); // Arbitrum
        bridge.connectChain(10);    // Optimism
        bridge.setRelayer(relayerAddr, true);

        // Wire a mock verifier and flip the killswitch — without these
        // the bridge stays fail-closed (proofs never verify, root sync
        // reverts) per the security hardening in CrossChainBridge.sol.
        MockVerifier mock = new MockVerifier();
        bridge.setCrossChainVerifier(address(mock));
        bridge.enableBridge();

        vm.deal(address(bridge), 100 ether);
    }

    function test_sync_root() public {
        bytes32 root = keccak256("arb_root_1");
        vm.prank(relayerAddr);
        bridge.syncRoot(42161, root);

        assertTrue(bridge.isForeignRootKnown(42161, root));
    }

    function test_sync_root_batch() public {
        bytes32[] memory roots = new bytes32[](3);
        roots[0] = keccak256("r1");
        roots[1] = keccak256("r2");
        roots[2] = keccak256("r3");

        vm.prank(relayerAddr);
        bridge.syncRootsBatch(42161, roots);

        assertTrue(bridge.isForeignRootKnown(42161, roots[0]));
        assertTrue(bridge.isForeignRootKnown(42161, roots[1]));
        assertTrue(bridge.isForeignRootKnown(42161, roots[2]));
    }

    function test_untrusted_relayer_reverts() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(CrossChainBridge.NotTrustedRelayer.selector);
        bridge.syncRoot(42161, keccak256("x"));
    }

    function test_unconnected_chain_reverts() public {
        vm.prank(relayerAddr);
        vm.expectRevert(CrossChainBridge.ChainNotConnected.selector);
        bridge.syncRoot(999, keccak256("x"));
    }

    function test_cross_chain_withdraw() public {
        bytes32 root = keccak256("cc_root");
        vm.prank(relayerAddr);
        bridge.syncRoot(42161, root);

        address payable recipient = payable(address(0xCAFE));
        uint256 recipientBefore = recipient.balance;

        bridge.crossChainWithdraw(
            "", 42161, root, keccak256("cc_null"),
            recipient, address(0), 1 ether,
            payable(address(0)), 0
        );

        uint256 fee = (1 ether * 100) / 10_000;
        assertEq(recipient.balance - recipientBefore, 1 ether - fee);
    }

    function test_cross_chain_double_spend_reverts() public {
        bytes32 root = keccak256("cc_ds_root");
        vm.prank(relayerAddr);
        bridge.syncRoot(42161, root);

        bytes32 nh = keccak256("cc_ds_null");
        bridge.crossChainWithdraw(
            "", 42161, root, nh,
            payable(address(0xCAFE)), address(0), 1 ether,
            payable(address(0)), 0
        );

        vm.expectRevert(CrossChainBridge.NullifierAlreadySpent.selector);
        bridge.crossChainWithdraw(
            "", 42161, root, nh,
            payable(address(0xCAFE)), address(0), 1 ether,
            payable(address(0)), 0
        );
    }

    function test_connected_chains() public view {
        uint256[] memory chains = bridge.getConnectedChains();
        assertEq(chains.length, 2);
        assertEq(chains[0], 42161);
        assertEq(chains[1], 10);
    }

    function test_duplicate_chain_reverts() public {
        vm.expectRevert(CrossChainBridge.ChainAlreadyConnected.selector);
        bridge.connectChain(42161);
    }

    receive() external payable {}
}

// ── Factory Tests ────────────────────────────────────────────

contract MixerFactoryTest is Test {
    MixerFactory public factory;
    MockERC20 public usdc;

    function setUp() public {
        factory = new MixerFactory();
        usdc = new MockERC20();
    }

    function test_create_default_eth_pools() public {
        factory.createDefaultETHPools();

        assertTrue(factory.ethMixers(0.1 ether) != address(0));
        assertTrue(factory.ethMixers(1 ether) != address(0));
        assertTrue(factory.ethMixers(10 ether) != address(0));
        assertTrue(factory.ethMixers(100 ether) != address(0));
    }

    function test_create_token_pool() public {
        address pool = factory.createTokenPool(address(usdc), 1000e6);
        assertEq(factory.getTokenPool(address(usdc), 1000e6), pool);
    }

    function test_duplicate_eth_pool_reverts() public {
        factory.createETHPool(1 ether);
        vm.expectRevert(MixerFactory.PoolAlreadyExists.selector);
        factory.createETHPool(1 ether);
    }

    function test_duplicate_token_pool_reverts() public {
        factory.createTokenPool(address(usdc), 1000e6);
        vm.expectRevert(MixerFactory.PoolAlreadyExists.selector);
        factory.createTokenPool(address(usdc), 1000e6);
    }

    function test_deploy_shielded_pool() public {
        address pool = factory.deployShieldedPool();
        assertEq(factory.shieldedPool(), pool);
        assertTrue(pool != address(0));
    }

    function test_duplicate_shielded_pool_reverts() public {
        factory.deployShieldedPool();
        vm.expectRevert(MixerFactory.ShieldedPoolAlreadyDeployed.selector);
        factory.deployShieldedPool();
    }

    function test_not_owner_reverts() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(MixerFactory.NotOwner.selector);
        factory.createETHPool(1 ether);
    }
}
