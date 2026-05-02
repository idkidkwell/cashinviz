// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IncrementalMerkleTree} from "./IncrementalMerkleTree.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IVerifier} from "./Verifier.sol";

/// @title ERC20Mixer
/// @notice Privacy mixer for ANY ERC-20 token. Same ZK proof system as the
///         ETH mixer but handles token approvals and transfers.
///         Tornado Cash never properly supported ERC-20s — this does.
contract ERC20Mixer is IncrementalMerkleTree {
    // ── Constants ────────────────────────────────────────────

    uint256 public constant FEE_BPS = 100; // 1%
    uint256 public constant BASIS_POINTS = 10_000;

    // ── Immutables ───────────────────────────────────────────

    /// The ERC-20 token for this pool.
    IERC20 public immutable token;

    /// The exact token amount for this pool.
    uint256 public immutable denomination;

    // ── State ────────────────────────────────────────────────

    address public owner;
    /// Pending owner in the two-step ownership-transfer flow.
    address public pendingOwner;
    IVerifier public verifier;
    mapping(bytes32 => bool) public nullifierHashes;
    mapping(bytes32 => bool) public commitments;

    /// Total number of deposits (used for anonymity set size).
    uint256 public depositCount;

    // ── Events ───────────────────────────────────────────────

    event Deposit(
        bytes32 indexed commitment,
        uint32 leafIndex,
        uint256 timestamp,
        address indexed token,
        uint256 denomination
    );
    event Withdrawal(
        address to,
        bytes32 nullifierHash,
        address indexed relayer,
        uint256 fee,
        address indexed token
    );
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
    error MustSendZeroETH();
    error ZeroVerifier();
    error ZeroOwner();
    error NotPendingOwner();

    // ── Modifiers ────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    constructor(
        address _token,
        uint256 _denomination,
        address _owner
    ) IncrementalMerkleTree() {
        token = IERC20(_token);
        denomination = _denomination;
        owner = _owner;
    }

    // ── Deposit ──────────────────────────────────────────────

    /// @notice Deposit tokens into the mixer.
    ///         User must first call token.approve(mixer, denomination).
    /// @param commitment Poseidon2(secret, nullifier)
    function deposit(bytes32 commitment) external {
        if (commitments[commitment]) revert CommitmentAlreadyExists();

        // Pull tokens from user (requires prior approval)
        bool ok = token.transferFrom(msg.sender, address(this), denomination);
        if (!ok) revert TransferFailed();

        commitments[commitment] = true;
        depositCount++;
        uint32 leafIndex = insert(commitment);

        emit Deposit(commitment, leafIndex, block.timestamp, address(token), denomination);
    }

    // ── Withdraw ─────────────────────────────────────────────

    /// @notice Withdraw tokens by proving knowledge of a valid deposit.
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        address relayer,
        uint256 relayerFee
    ) external {
        if (!isKnownRoot(root)) revert UnknownRoot();
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadySpent();
        if (!_verifyProof(proof, root, nullifierHash, recipient, relayer, relayerFee))
            revert InvalidProof();

        nullifierHashes[nullifierHash] = true;

        // Calculate fees
        uint256 protocolFee = (denomination * FEE_BPS) / BASIS_POINTS;
        uint256 payout = denomination - protocolFee - relayerFee;

        // Transfer protocol fee
        bool feeOk = token.transfer(owner, protocolFee);
        if (!feeOk) revert TransferFailed();

        // Transfer relayer fee
        if (relayerFee > 0) {
            bool relayerOk = token.transfer(relayer, relayerFee);
            if (!relayerOk) revert TransferFailed();
        }

        // Transfer payout to recipient
        bool payoutOk = token.transfer(recipient, payout);
        if (!payoutOk) revert TransferFailed();

        emit Withdrawal(recipient, nullifierHash, relayer, relayerFee, address(token));
    }

    // ── Owner ────────────────────────────────────────────────

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

    /// @notice Wire in the Noir-generated Verifier contract.
    /// @dev Setting to address(0) is rejected — that would re-enable
    ///      stub mode where any proof verifies, which is a pool-drain
    ///      vector if ownership is ever compromised.
    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroVerifier();
        emit VerifierUpdated(address(verifier), _verifier);
        verifier = IVerifier(_verifier);
    }

    // ── Views ────────────────────────────────────────────────

    /// @notice Returns the anonymity set size (number of deposits in pool).
    function anonymitySetSize() external view returns (uint256) {
        return depositCount;
    }

    // ── Proof verification ───────────────────────────────────

    /// @dev 7 public inputs matching the Noir withdraw circuit:
    ///      (root, nullifierHash, recipient, token, denomination, relayer, relayerFee).
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
        publicInputs[3] = bytes32(uint256(uint160(address(token))));
        publicInputs[4] = bytes32(denomination);
        publicInputs[5] = bytes32(uint256(uint160(relayer)));
        publicInputs[6] = bytes32(relayerFee);

        return verifier.verify(proof, publicInputs);
    }
}
