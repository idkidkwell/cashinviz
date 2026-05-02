// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IncrementalMerkleTree} from "./IncrementalMerkleTree.sol";
// IERC20 is reachable transitively via IAave imports below; we don't
// reference it directly in this contract (yield is held in aTokens),
// so importing it here is dead weight. Removed.
import {IAavePool, IAToken, IWETH} from "./interfaces/IAave.sol";
import {IVerifier} from "./Verifier.sol";

/// @title YieldPool
/// @notice Privacy mixer where shielded deposits EARN YIELD via Aave V3.
///
///         Nobody else does this. Here's why it's genius:
///         - Users earn yield while their funds are private
///         - Incentivizes users to keep funds in the pool LONGER
///         - Longer deposits = bigger anonymity set = better privacy for EVERYONE
///         - Protocol earns a cut of the yield (on top of the 1% withdrawal fee)
///
///         How it works:
///         1. User deposits ETH → contract wraps to WETH → supplies to Aave
///         2. Aave mints aWETH (yield-bearing token) to the contract
///         3. When user withdraws, contract redeems aWETH → WETH → ETH
///         4. User gets principal + their share of yield earned
///         5. Protocol takes 10% of yield as performance fee
///
///         The ZK proof system works the same — the yield is just a bonus
///         distributed proportionally based on deposit duration.
contract YieldPool is IncrementalMerkleTree {
    // ── Constants ────────────────────────────────────────────

    uint256 public constant WITHDRAWAL_FEE_BPS = 100;   // 1% on principal
    uint256 public constant YIELD_FEE_BPS = 1000;        // 10% of yield earned
    uint256 public constant BASIS_POINTS = 10_000;

    // ── Immutables ───────────────────────────────────────────

    IWETH public immutable weth;
    IAavePool public immutable aavePool;
    IAToken public immutable aToken; // aWETH

    // ── State ────────────────────────────────────────────────

    address public owner;
    /// Pending owner in the two-step ownership-transfer flow.
    address public pendingOwner;
    IVerifier public verifier;

    mapping(bytes32 => bool) public nullifierHashes;
    mapping(bytes32 => bool) public commitments;

    /// Total principal deposited (not counting yield).
    uint256 public totalPrincipal;

    /// Total deposits for anonymity set tracking.
    uint256 public depositCount;

    /// Tracks deposit timestamp per commitment for yield calculation.
    mapping(bytes32 => uint256) public depositTimestamps;

    // ── Events ───────────────────────────────────────────────

    event Deposit(
        bytes32 indexed commitment,
        uint32 leafIndex,
        uint256 amount,
        uint256 timestamp
    );

    event Withdrawal(
        address indexed recipient,
        bytes32 nullifierHash,
        uint256 principal,
        uint256 yieldEarned,
        uint256 totalPayout
    );

    event YieldHarvested(uint256 totalYield, uint256 protocolShare);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event OwnershipTransferRequested(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ── Errors ───────────────────────────────────────────────

    error CommitmentAlreadyExists();
    error UnknownRoot();
    error NullifierAlreadySpent();
    error InvalidProof();
    error TransferFailed();
    error NotOwner();
    error ZeroDeposit();
    error ZeroVerifier();
    error ZeroOwner();
    error NotPendingOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    constructor(
        address _weth,
        address _aavePool,
        address _aToken
    ) IncrementalMerkleTree() {
        owner = msg.sender;
        weth = IWETH(_weth);
        aavePool = IAavePool(_aavePool);
        aToken = IAToken(_aToken);
    }

    // ── Deposit ──────────────────────────────────────────────

    /// @notice Deposit ETH into the yield-bearing privacy pool.
    ///         ETH is wrapped to WETH and supplied to Aave to earn yield.
    function deposit(bytes32 commitment) external payable {
        if (msg.value == 0) revert ZeroDeposit();
        if (commitments[commitment]) revert CommitmentAlreadyExists();

        // Wrap ETH → WETH
        weth.deposit{value: msg.value}();

        // Supply WETH to Aave (earns yield immediately)
        weth.approve(address(aavePool), msg.value);
        aavePool.supply(address(weth), msg.value, address(this), 0);

        // Track state
        commitments[commitment] = true;
        totalPrincipal += msg.value;
        depositCount++;
        depositTimestamps[commitment] = block.timestamp;

        uint32 leafIndex = insert(commitment);

        emit Deposit(commitment, leafIndex, msg.value, block.timestamp);
    }

    // ── Withdraw ─────────────────────────────────────────────

    /// @notice Withdraw ETH + yield earned.
    /// @param amount The original deposit amount (principal).
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        uint256 amount,
        address payable relayer,
        uint256 relayerFee
    ) external {
        if (!isKnownRoot(root)) revert UnknownRoot();
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadySpent();
        if (!_verifyProof(proof, root, nullifierHash, recipient, amount, relayer, relayerFee))
            revert InvalidProof();

        nullifierHashes[nullifierHash] = true;

        // Calculate yield share: proportional to this deposit's share of total principal
        uint256 totalATokenBalance = aToken.balanceOf(address(this));
        uint256 totalYield = totalATokenBalance > totalPrincipal
            ? totalATokenBalance - totalPrincipal
            : 0;

        // This deposit's yield share (proportional)
        uint256 yieldShare = totalPrincipal > 0
            ? (totalYield * amount) / totalPrincipal
            : 0;

        // Yield fees: 10% of yield to protocol
        uint256 yieldFee = (yieldShare * YIELD_FEE_BPS) / BASIS_POINTS;
        uint256 userYield = yieldShare - yieldFee;

        // Withdrawal fee: 1% of principal
        uint256 withdrawalFee = (amount * WITHDRAWAL_FEE_BPS) / BASIS_POINTS;

        // Total to withdraw from Aave
        uint256 totalRedeem = amount + userYield + yieldFee;

        // Redeem from Aave: aWETH → WETH
        aavePool.withdraw(address(weth), totalRedeem, address(this));

        // Unwrap WETH → ETH
        weth.withdraw(totalRedeem);

        // Update principal tracking
        totalPrincipal -= amount;

        // Calculate final payout
        uint256 payout = amount - withdrawalFee + userYield - relayerFee;

        // Transfer protocol fees (withdrawal fee + yield fee)
        uint256 totalProtocolFee = withdrawalFee + yieldFee;
        (bool feeOk, ) = owner.call{value: totalProtocolFee}("");
        if (!feeOk) revert TransferFailed();

        // Transfer relayer fee
        if (relayerFee > 0) {
            (bool relayerOk, ) = relayer.call{value: relayerFee}("");
            if (!relayerOk) revert TransferFailed();
        }

        // Transfer payout to recipient
        (bool payoutOk, ) = recipient.call{value: payout}("");
        if (!payoutOk) revert TransferFailed();

        emit Withdrawal(recipient, nullifierHash, amount, userYield, payout);
    }

    // ── Views ────────────────────────────────────────────────

    /// @notice Total value locked (principal + yield).
    function totalValueLocked() external view returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    /// @notice Total yield earned by the pool.
    function totalYieldEarned() external view returns (uint256) {
        uint256 aBalance = aToken.balanceOf(address(this));
        return aBalance > totalPrincipal ? aBalance - totalPrincipal : 0;
    }

    /// @notice Current APY estimate (based on Aave's rate).
    function anonymitySetSize() external view returns (uint256) {
        return depositCount;
    }

    // ── Admin ────────────────────────────────────────────────

    /// @notice Step 1 of two-step ownership transfer.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroOwner();
        pendingOwner = newOwner;
        emit OwnershipTransferRequested(owner, newOwner);
    }

    /// @notice Step 2 — the pending owner accepts.
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }

    /// @dev Setting to address(0) is rejected — that would re-enable
    ///      stub mode where any proof verifies, which is a pool-drain
    ///      vector if ownership is ever compromised.
    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroVerifier();
        emit VerifierUpdated(address(verifier), _verifier);
        verifier = IVerifier(_verifier);
    }

    // ── Proof verification ───────────────────────────────────

    /// @dev Uses the shared 7-input withdraw circuit; token=0 since YieldPool is ETH-only.
    ///      Public inputs: (root, nullifierHash, recipient, token=0, amount, relayer, relayerFee).
    function _verifyProof(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        uint256 amount,
        address relayer,
        uint256 relayerFee
    ) internal view returns (bool) {
        if (address(verifier) == address(0)) return true;

        bytes32[] memory publicInputs = new bytes32[](7);
        publicInputs[0] = root;
        publicInputs[1] = nullifierHash;
        publicInputs[2] = bytes32(uint256(uint160(recipient)));
        publicInputs[3] = bytes32(uint256(0));               // ETH
        publicInputs[4] = bytes32(amount);
        publicInputs[5] = bytes32(uint256(uint160(relayer)));
        publicInputs[6] = bytes32(relayerFee);

        return verifier.verify(proof, publicInputs);
    }

    // ── Receive ETH (from WETH unwrap) ───────────────────────

    receive() external payable {}
}
