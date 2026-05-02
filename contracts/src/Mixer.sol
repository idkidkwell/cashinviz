// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IncrementalMerkleTree} from "./IncrementalMerkleTree.sol";
import {IVerifier} from "./Verifier.sol";

/// @title Mixer
/// @notice Single-denomination privacy mixer with ZK proof verification.
///         Users deposit a fixed amount of ETH and later withdraw to a
///         different address by submitting a Noir-generated ZK proof.
///         A 1% protocol fee is taken on every withdrawal.
contract Mixer is IncrementalMerkleTree {
    // ── Constants ────────────────────────────────────────────

    uint256 public constant FEE_BPS = 100; // 1% = 100 basis points
    uint256 public constant MAX_FEE_BPS = 100; // hard cap - never above 1%
    uint256 public constant BASIS_POINTS = 10_000;

    // ── Immutables ───────────────────────────────────────────

    /// The exact ETH amount for this pool (e.g. 0.1, 1, 10, 100 ether).
    uint256 public immutable denomination;

    // ── State ────────────────────────────────────────────────

    /// Protocol fee recipient.
    address public owner;

    /// Pending owner in the two-step ownership-transfer flow. The
    /// outgoing owner sets this via `transferOwnership`; the incoming
    /// owner then calls `acceptOwnership` to promote themselves. This
    /// prevents the entire pool from being locked up by typo'ing into
    /// a wrong / unrecoverable address.
    address public pendingOwner;

    /// Noir-generated UltraPlonk verifier. When unset (address(0)) the
    /// contract runs in "stub" mode for local test suites; production
    /// deployments MUST call `setVerifier` before opening deposits.
    IVerifier public verifier;

    /// Spent nullifier hashes — prevents double-withdrawal.
    mapping(bytes32 => bool) public nullifierHashes;

    /// Commitments that have been deposited.
    mapping(bytes32 => bool) public commitments;

    /// Total deposits (anonymity set size).
    uint256 public depositCount;

    // ── Events ───────────────────────────────────────────────

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address to, bytes32 nullifierHash, address indexed relayer, uint256 fee);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event OwnershipTransferRequested(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ── Errors ───────────────────────────────────────────────

    error IncorrectDepositAmount();
    error CommitmentAlreadyExists();
    error UnknownRoot();
    error NullifierAlreadySpent();
    error InvalidProof();
    error TransferFailed();
    error NotOwner();
    error FeeExceedsMax();
    error ZeroVerifier();
    error ZeroOwner();
    error NotPendingOwner();

    // ── Modifiers ────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    constructor(uint256 _denomination, address _owner) IncrementalMerkleTree() {
        denomination = _denomination;
        owner = _owner;
    }

    // ── Deposit ──────────────────────────────────────────────

    /// @notice Deposit ETH into the mixer.
    /// @param commitment Poseidon2(secret, nullifier) — computed client-side.
    function deposit(bytes32 commitment) external payable {
        if (msg.value != denomination) revert IncorrectDepositAmount();
        if (commitments[commitment]) revert CommitmentAlreadyExists();

        commitments[commitment] = true;
        depositCount++;
        uint32 leafIndex = insert(commitment);

        emit Deposit(commitment, leafIndex, block.timestamp);
    }

    // ── Withdraw ─────────────────────────────────────────────

    /// @notice Withdraw ETH by proving knowledge of a valid deposit.
    /// @param proof       The serialized ZK proof (from Barretenberg).
    /// @param root        A recent Merkle root the proof is anchored to.
    /// @param nullifierHash  Poseidon2(nullifier) — recorded to prevent reuse.
    /// @param recipient   Address to send the withdrawn ETH to.
    /// @param relayer     Relayer address that submitted the tx (or address(0)).
    /// @param relayerFee  Fee paid to the relayer from the withdrawal amount.
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        address payable relayer,
        uint256 relayerFee
    ) external {
        if (!isKnownRoot(root)) revert UnknownRoot();
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadySpent();
        if (!_verifyProof(proof, root, nullifierHash, recipient, relayer, relayerFee))
            revert InvalidProof();

        // Mark nullifier as spent.
        nullifierHashes[nullifierHash] = true;

        // Calculate protocol fee (1%).
        uint256 protocolFee = (denomination * FEE_BPS) / BASIS_POINTS;
        uint256 payout = denomination - protocolFee - relayerFee;

        // Transfer protocol fee to owner.
        (bool feeOk, ) = owner.call{value: protocolFee}("");
        if (!feeOk) revert TransferFailed();

        // Transfer relayer fee (if any).
        if (relayerFee > 0) {
            (bool relayerOk, ) = relayer.call{value: relayerFee}("");
            if (!relayerOk) revert TransferFailed();
        }

        // Transfer remaining payout to recipient.
        (bool payoutOk, ) = recipient.call{value: payout}("");
        if (!payoutOk) revert TransferFailed();

        emit Withdrawal(recipient, nullifierHash, relayer, relayerFee);
    }

    // ── Owner functions ──────────────────────────────────────

    /// @notice Step 1 of two-step ownership transfer — record the
    ///         intended successor. Nothing changes for the live
    ///         `owner` until step 2 (`acceptOwnership`) runs from
    ///         the new address.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroOwner();
        pendingOwner = newOwner;
        emit OwnershipTransferRequested(owner, newOwner);
    }

    /// @notice Step 2 — the pending owner accepts the role. Has to
    ///         be called from the new owner's address, which proves
    ///         the key is recoverable / not a typo. Clears `pendingOwner`.
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }

    /// @notice Wire in the Noir-generated Verifier contract.
    /// @dev Settable post-deploy so we can deploy the pool, then upload the
    ///      Verifier as a separate tx (the compiled bytecode is large).
    ///      Setting to address(0) is rejected — that would re-enable stub
    ///      mode where any proof verifies, which is a pool-drain vector
    ///      if ownership is ever compromised.
    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroVerifier();
        emit VerifierUpdated(address(verifier), _verifier);
        verifier = IVerifier(_verifier);
    }

    // ── Proof verification ───────────────────────────────────

    /// @dev Verifier wiring:
    ///      - If `verifier` is unset, return true (local test mode only).
    ///      - If set, forward to the Noir-generated UltraHonk verifier.
    ///      Circuit public inputs (7):
    ///      (root, nullifierHash, recipient, token=0 for ETH, denomination, relayer, relayerFee).
    function _verifyProof(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        address relayer,
        uint256 relayerFee
    ) internal view returns (bool) {
        if (address(verifier) == address(0)) return true;

        bytes32[] memory publicInputs = new bytes32[](7);
        publicInputs[0] = root;
        publicInputs[1] = nullifierHash;
        publicInputs[2] = bytes32(uint256(uint160(recipient)));
        publicInputs[3] = bytes32(uint256(0));              // token = 0 (ETH)
        publicInputs[4] = bytes32(denomination);             // fixed denomination
        publicInputs[5] = bytes32(uint256(uint160(relayer)));
        publicInputs[6] = bytes32(relayerFee);

        return verifier.verify(proof, publicInputs);
    }
}
