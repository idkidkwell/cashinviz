// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProofOfInnocence
/// @notice Allows users to prove their funds are NOT from sanctioned sources
///         WITHOUT revealing their identity or transaction history.
///
///         This is the feature that keeps you from getting Tornado Cash'd.
///
///         How it works:
///         1. An on-chain sanctioned addresses set is maintained (from OFAC/Chainalysis)
///         2. When a user wants to prove innocence, they generate a ZK proof that:
///            - "I have a valid deposit in the mixer" (proves they're a real user)
///            - "My deposit came from address X" (private input)
///            - "Address X is NOT in the sanctioned set" (proven via Merkle exclusion)
///         3. The proof is verified on-chain — no identity revealed
///         4. User gets a "compliance token" (non-transferable) proving clean funds
///         5. DeFi protocols can check: "does this address have a compliance token?"
///
///         This gives users OPTIONAL compliance without sacrificing privacy.
///         Compliant users are protected. Non-compliant users just don't generate the proof.
///
///          ⚠️ NOT PRODUCTION READY — `_verifyInnocenceProof` always
///          returns true (placeholder). Until the Noir-generated
///          innocence verifier is wired, this contract would issue
///          "compliance tokens" to anyone who calls `proveInnocence`,
///          which is WORSE than no compliance system because it
///          actively launders sanctioned addresses. The killswitch
///          (paused = true by default) keeps `proveInnocence`
///          fail-closed until `setPaused(false)` is called.
contract ProofOfInnocence {
    // ── State ────────────────────────────────────────────────

    address public owner;
    address public oracleUpdater; // Address allowed to update sanctioned set

    /// Merkle root of the sanctioned addresses set.
    /// Updated periodically by the oracle from OFAC/Chainalysis data.
    bytes32 public sanctionedSetRoot;
    uint256 public lastUpdated;

    /// Addresses that have proven innocence.
    /// address => expiry timestamp (proofs expire after 30 days)
    mapping(address => uint256) public innocenceProofs;

    /// How long a proof of innocence is valid.
    uint256 public constant PROOF_VALIDITY = 30 days;

    /// Total proofs generated (metric).
    uint256 public totalProofsGenerated;

    /// Killswitch — see contract NatSpec. Fail-closed by default.
    bool public paused = true;

    // ── Events ───────────────────────────────────────────────

    event SanctionedSetUpdated(bytes32 newRoot, uint256 timestamp);
    event InnocenceProven(address indexed user, uint256 expiry);
    event InnocenceRevoked(address indexed user);

    // ── Errors ───────────────────────────────────────────────

    error NotOwner();
    error NotOracle();
    error InvalidProof();
    error ProofExpired();
    error AlreadyProven();

    // ── Modifiers ────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracleUpdater) revert NotOracle();
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        oracleUpdater = msg.sender;
    }

    // ── Oracle: Update sanctioned set ────────────────────────

    /// @notice Update the Merkle root of sanctioned addresses.
    ///         Called by the oracle when OFAC list changes.
    function updateSanctionedSet(bytes32 newRoot) external onlyOracle {
        sanctionedSetRoot = newRoot;
        lastUpdated = block.timestamp;
        emit SanctionedSetUpdated(newRoot, block.timestamp);
    }

    function setOracle(address newOracle) external onlyOwner {
        oracleUpdater = newOracle;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    // ── Prove innocence ──────────────────────────────────────

    /// @notice Submit a ZK proof that your funds are clean.
    ///         The proof demonstrates:
    ///         1. You have a valid commitment in the mixer's Merkle tree
    ///         2. The depositing address is NOT in the sanctioned set
    ///         Without revealing which commitment or address is yours.
    /// @param proof The ZK proof (Noir-generated).
    /// @param mixerRoot The mixer's Merkle root your deposit is in.
    function proveInnocence(
        bytes calldata proof,
        bytes32 mixerRoot
    ) external {
        require(!paused, "Paused: ZK verifier not wired");
        // Verify the ZK proof
        if (!_verifyInnocenceProof(proof, mixerRoot, sanctionedSetRoot, msg.sender))
            revert InvalidProof();

        // Issue compliance token (expiring)
        uint256 expiry = block.timestamp + PROOF_VALIDITY;
        innocenceProofs[msg.sender] = expiry;
        totalProofsGenerated++;

        emit InnocenceProven(msg.sender, expiry);
    }

    // ── Check compliance ─────────────────────────────────────

    /// @notice Check if an address has a valid proof of innocence.
    ///         DeFi protocols can call this to verify compliance.
    function isInnocent(address user) external view returns (bool) {
        return innocenceProofs[user] > block.timestamp;
    }

    /// @notice Get the expiry time of a proof.
    function proofExpiry(address user) external view returns (uint256) {
        return innocenceProofs[user];
    }

    /// @notice Check how many seconds until a proof expires.
    function timeUntilExpiry(address user) external view returns (uint256) {
        if (innocenceProofs[user] <= block.timestamp) return 0;
        return innocenceProofs[user] - block.timestamp;
    }

    // ── Admin ────────────────────────────────────────────────

    /// @notice Revoke a proof (in case of new sanctions info).
    function revokeProof(address user) external onlyOwner {
        innocenceProofs[user] = 0;
        emit InnocenceRevoked(user);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ── Proof verification placeholder ───────────────────────

    function _verifyInnocenceProof(
        bytes calldata, bytes32, bytes32, address
    ) internal pure returns (bool) {
        return true; // TODO: Noir-generated innocence verifier
    }
}
