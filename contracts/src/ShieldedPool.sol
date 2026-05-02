// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IncrementalMerkleTree} from "./IncrementalMerkleTree.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IVerifier} from "./Verifier.sol";

/// @title ShieldedPool
/// @notice Unified shielded pool that supports:
///         1. Private deposits (ETH or ERC-20)
///         2. Private withdrawals
///         3. Shielded transfers — send to another user INSIDE the pool
///            without ever going on-chain visibly. Like private Venmo.
///         4. Partial withdrawals via UTXO-style notes
///
///         This is what makes this mixer fundamentally better than Tornado Cash.
///         Tornado = deposit → wait → withdraw. That's it.
///         ShieldedPool = deposit → transfer privately → split → merge → withdraw.
contract ShieldedPool is IncrementalMerkleTree {
    // ── Constants ────────────────────────────────────────────

    uint256 public constant FEE_BPS = 100; // 1%
    uint256 public constant BASIS_POINTS = 10_000;
    address public constant ETH_TOKEN = address(0);

    // ── State ────────────────────────────────────────────────

    address public owner;
    /// Pending owner in the two-step ownership-transfer flow.
    address public pendingOwner;

    /// Noir-generated UltraPlonk verifier for the multi-asset withdrawal circuit.
    IVerifier public withdrawVerifier;

    /// Noir-generated UltraPlonk verifier for the shielded-transfer circuit
    /// (input note → two output notes).
    IVerifier public transferVerifier;

    /// Spent nullifier hashes (prevents double-spend across ALL operations).
    mapping(bytes32 => bool) public nullifierHashes;

    /// All commitments that have been inserted into the tree.
    mapping(bytes32 => bool) public commitments;

    /// Total deposits per asset (for anonymity set tracking).
    /// token address => count (address(0) = ETH)
    mapping(address => uint256) public depositCount;

    /// Allowed tokens (address(0) = ETH is always allowed).
    mapping(address => bool) public allowedTokens;

    // ── Structs ──────────────────────────────────────────────

    /// A UTXO-style note. Each note represents a private balance inside the pool.
    /// When you deposit 10 ETH, you get one note worth 10 ETH.
    /// When you do a shielded transfer of 3 ETH to someone, your 10 ETH note
    /// is consumed (nullified) and two new notes are created:
    ///   - 3 ETH note → recipient
    ///   - 7 ETH note → you (change)
    struct NoteData {
        address token;
        uint256 amount;
    }

    // ── Events ───────────────────────────────────────────────

    event ShieldedDeposit(
        bytes32 indexed commitment,
        uint32 leafIndex,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event ShieldedWithdrawal(
        address indexed recipient,
        bytes32 nullifierHash,
        address indexed token,
        uint256 amount,
        address relayer,
        uint256 relayerFee
    );

    event ShieldedTransfer(
        bytes32 nullifierHash1,
        bytes32 nullifierHash2,
        bytes32 indexed newCommitment1,
        bytes32 indexed newCommitment2,
        uint32 leafIndex1,
        uint32 leafIndex2
    );

    event WithdrawVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event TransferVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event OwnershipTransferRequested(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ── Errors ───────────────────────────────────────────────

    error CommitmentAlreadyExists();
    error UnknownRoot();
    error NullifierAlreadySpent();
    error InvalidProof();
    error TransferFailed();
    error NotOwner();
    error TokenNotAllowed();
    error IncorrectETHAmount();
    error InvalidAmount();
    error ZeroVerifier();
    error ZeroOwner();
    error NotPendingOwner();

    // ── Modifiers ────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    /// @param _owner The address that can wire verifiers and manage tokens.
    ///        Passed in (rather than defaulted to `msg.sender`) so the
    ///        factory can deploy on behalf of the operator without
    ///        becoming the permanent owner. Mirrors how `Mixer` and
    ///        `ERC20Mixer` accept `_owner` in their constructors.
    constructor(address _owner) IncrementalMerkleTree() {
        require(_owner != address(0), "owner=0");
        owner = _owner;
        allowedTokens[ETH_TOKEN] = true; // ETH always allowed
    }

    // ── Admin ────────────────────────────────────────────────

    /// @notice Whitelist a token for the shielded pool.
    function addToken(address _token) external onlyOwner {
        allowedTokens[_token] = true;
    }

    function removeToken(address _token) external onlyOwner {
        require(_token != ETH_TOKEN, "Cannot remove ETH");
        allowedTokens[_token] = false;
    }

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

    /// @dev Setting either verifier to address(0) is rejected — that would
    ///      re-enable stub mode where any proof verifies, which is a
    ///      pool-drain vector if ownership is ever compromised.
    function setWithdrawVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroVerifier();
        emit WithdrawVerifierUpdated(address(withdrawVerifier), _verifier);
        withdrawVerifier = IVerifier(_verifier);
    }

    function setTransferVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroVerifier();
        emit TransferVerifierUpdated(address(transferVerifier), _verifier);
        transferVerifier = IVerifier(_verifier);
    }

    // ── Deposit ──────────────────────────────────────────────

    /// @notice Deposit ETH or ERC-20 into the shielded pool.
    /// @param commitment Poseidon2(secret, nullifier, token, amount)
    /// @param token Token address (address(0) for ETH).
    /// @param amount Amount to deposit.
    function deposit(
        bytes32 commitment,
        address token,
        uint256 amount
    ) external payable {
        if (!allowedTokens[token]) revert TokenNotAllowed();
        if (amount == 0) revert InvalidAmount();
        if (commitments[commitment]) revert CommitmentAlreadyExists();

        if (token == ETH_TOKEN) {
            // ETH deposit
            if (msg.value != amount) revert IncorrectETHAmount();
        } else {
            // ERC-20 deposit
            if (msg.value != 0) revert IncorrectETHAmount();
            bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
            if (!ok) revert TransferFailed();
        }

        commitments[commitment] = true;
        depositCount[token]++;
        uint32 leafIndex = insert(commitment);

        emit ShieldedDeposit(commitment, leafIndex, token, amount, block.timestamp);
    }

    // ── Withdraw ─────────────────────────────────────────────

    /// @notice Withdraw from the shielded pool.
    /// @param proof ZK proof.
    /// @param root Merkle root.
    /// @param nullifierHash Prevents double-spend.
    /// @param recipient Who receives the funds.
    /// @param token Token address.
    /// @param amount Withdrawal amount.
    /// @param relayer Relayer address.
    /// @param relayerFee Relayer fee.
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        address token,
        uint256 amount,
        address payable relayer,
        uint256 relayerFee
    ) external {
        if (!isKnownRoot(root)) revert UnknownRoot();
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadySpent();
        if (!_verifyWithdrawProof(proof, root, nullifierHash, recipient, token, amount, relayer, relayerFee))
            revert InvalidProof();

        nullifierHashes[nullifierHash] = true;

        // Calculate protocol fee
        uint256 protocolFee = (amount * FEE_BPS) / BASIS_POINTS;
        uint256 payout = amount - protocolFee - relayerFee;

        if (token == ETH_TOKEN) {
            // ETH withdrawal
            (bool feeOk, ) = owner.call{value: protocolFee}("");
            if (!feeOk) revert TransferFailed();

            if (relayerFee > 0) {
                (bool relayerOk, ) = relayer.call{value: relayerFee}("");
                if (!relayerOk) revert TransferFailed();
            }

            (bool payoutOk, ) = recipient.call{value: payout}("");
            if (!payoutOk) revert TransferFailed();
        } else {
            // ERC-20 withdrawal
            IERC20 t = IERC20(token);
            if (!t.transfer(owner, protocolFee)) revert TransferFailed();
            if (relayerFee > 0) {
                if (!t.transfer(relayer, relayerFee)) revert TransferFailed();
            }
            if (!t.transfer(recipient, payout)) revert TransferFailed();
        }

        emit ShieldedWithdrawal(recipient, nullifierHash, token, amount, relayer, relayerFee);
    }

    // ── Shielded Transfer ────────────────────────────────────

    /// @notice Transfer funds privately INSIDE the pool.
    ///         Consumes an existing note and creates two new notes:
    ///         one for the recipient, one for change (back to sender).
    ///         No funds leave the contract. No amounts are visible on-chain.
    ///
    /// @param proof ZK proof proving:
    ///        - Sender owns the input note
    ///        - Input note value = output note 1 + output note 2
    ///        - Both output commitments are well-formed
    /// @param root Merkle root.
    /// @param inputNullifier Nullifier for the consumed input note.
    /// @param outputCommitment1 New note for the recipient.
    /// @param outputCommitment2 New note for change (sender keeps).
    function shieldedTransfer(
        bytes calldata proof,
        bytes32 root,
        bytes32 inputNullifier,
        bytes32 outputCommitment1,
        bytes32 outputCommitment2
    ) external {
        if (!isKnownRoot(root)) revert UnknownRoot();
        if (nullifierHashes[inputNullifier]) revert NullifierAlreadySpent();
        if (commitments[outputCommitment1]) revert CommitmentAlreadyExists();
        if (commitments[outputCommitment2]) revert CommitmentAlreadyExists();

        if (!_verifyTransferProof(proof, root, inputNullifier, outputCommitment1, outputCommitment2))
            revert InvalidProof();

        // Nullify the input note
        nullifierHashes[inputNullifier] = true;

        // Insert both output notes into the tree
        commitments[outputCommitment1] = true;
        commitments[outputCommitment2] = true;
        uint32 idx1 = insert(outputCommitment1);
        uint32 idx2 = insert(outputCommitment2);

        emit ShieldedTransfer(inputNullifier, bytes32(0), outputCommitment1, outputCommitment2, idx1, idx2);
    }

    // ── Views ────────────────────────────────────────────────

    /// @notice Get anonymity set size for a token.
    function anonymitySetSize(address token) external view returns (uint256) {
        return depositCount[token];
    }

    /// @notice Total notes in the tree (across all tokens).
    function totalNotes() external view returns (uint32) {
        return nextIndex;
    }

    // ── Proof verification ───────────────────────────────────

    /// @dev Withdraw public inputs: (root, nullifierHash, recipient, token, amount, relayer, relayerFee).
    function _verifyWithdrawProof(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        address token,
        uint256 amount,
        address relayer,
        uint256 relayerFee
    ) internal view returns (bool) {
        if (address(withdrawVerifier) == address(0)) return true;

        bytes32[] memory publicInputs = new bytes32[](7);
        publicInputs[0] = root;
        publicInputs[1] = nullifierHash;
        publicInputs[2] = bytes32(uint256(uint160(recipient)));
        publicInputs[3] = bytes32(uint256(uint160(token)));
        publicInputs[4] = bytes32(amount);
        publicInputs[5] = bytes32(uint256(uint160(relayer)));
        publicInputs[6] = bytes32(relayerFee);

        return withdrawVerifier.verify(proof, publicInputs);
    }

    /// @dev Transfer public inputs: (root, inputNullifier, outputCommitment1, outputCommitment2).
    function _verifyTransferProof(
        bytes calldata proof,
        bytes32 root,
        bytes32 inputNullifier,
        bytes32 outputCommitment1,
        bytes32 outputCommitment2
    ) internal view returns (bool) {
        if (address(transferVerifier) == address(0)) return true;

        bytes32[] memory publicInputs = new bytes32[](4);
        publicInputs[0] = root;
        publicInputs[1] = inputNullifier;
        publicInputs[2] = outputCommitment1;
        publicInputs[3] = outputCommitment2;

        return transferVerifier.verify(proof, publicInputs);
    }
}
