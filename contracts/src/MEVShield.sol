// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MEVShield
 * @notice Commit-reveal scheme to protect mixer transactions from MEV attacks.
 *
 * Problem: MEV bots can front-run withdrawals, sandwich deposits, or
 * use transaction ordering to deanonymize users.
 *
 * Solution: Two-phase commit-reveal:
 * 1. COMMIT: Submit encrypted withdrawal intent (hash only)
 * 2. REVEAL: Submit actual withdrawal after minimum delay
 *
 * MEV bots can't front-run what they can't see.
 * Combined with Flashbots Protect for private mempool submission.
 *
 * UNIQUE: First mixer with built-in MEV protection.
 */
contract MEVShield {
    // ── Types ────────────────────────────────────────────
    struct Commitment {
        bytes32 commitHash;
        uint256 commitBlock;
        uint256 commitTime;
        address committer;
        bool revealed;
        bool expired;
    }

    // ── State ────────────────────────────────────────────
    mapping(bytes32 => Commitment) public commitments;

    uint256 public constant MIN_REVEAL_DELAY = 2;   // Minimum 2 blocks between commit and reveal
    uint256 public constant MAX_REVEAL_WINDOW = 50;  // Must reveal within 50 blocks
    uint256 public constant COMMIT_EXPIRY = 1 hours; // Time-based expiry backup

    uint256 public totalCommitments;
    uint256 public totalReveals;
    uint256 public totalExpired;

    // ── Events ───────────────────────────────────────────
    event CommitmentMade(bytes32 indexed commitId, address indexed committer, uint256 blockNumber);
    event CommitmentRevealed(bytes32 indexed commitId, uint256 revealBlock, uint256 blockDelay);
    event CommitmentExpired(bytes32 indexed commitId);

    // ── Phase 1: Commit ──────────────────────────────────
    /**
     * @notice Submit an encrypted commitment for a future withdrawal.
     * @param _commitHash Hash of (nullifierHash, recipient, relayer, fee, nonce)
     * @return commitId Unique commitment identifier
     *
     * The commit hash reveals NOTHING about the withdrawal.
     * MEV bots see only an opaque hash — no recipient, no amount, nothing.
     *
     * Best practice: Submit via Flashbots Protect to keep even the commit
     * out of the public mempool.
     */
    function commit(bytes32 _commitHash) external returns (bytes32 commitId) {
        commitId = keccak256(abi.encodePacked(_commitHash, msg.sender, block.number));

        require(commitments[commitId].commitBlock == 0, "Commitment exists");

        commitments[commitId] = Commitment({
            commitHash: _commitHash,
            commitBlock: block.number,
            commitTime: block.timestamp,
            committer: msg.sender,
            revealed: false,
            expired: false
        });

        totalCommitments++;

        emit CommitmentMade(commitId, msg.sender, block.number);
    }

    // ── Phase 2: Reveal ──────────────────────────────────
    /**
     * @notice Reveal a previously committed withdrawal.
     * @param _commitId The commitment ID from phase 1
     * @param _nullifierHash Actual nullifier hash
     * @param _recipient Actual recipient address
     * @param _relayer Actual relayer address
     * @param _fee Actual relayer fee
     * @param _nonce Random nonce used in commitment
     *
     * Must be called after MIN_REVEAL_DELAY blocks but before MAX_REVEAL_WINDOW.
     * The reveal data must hash to the original commitment hash.
     */
    function reveal(
        bytes32 _commitId,
        bytes32 _nullifierHash,
        address _recipient,
        address _relayer,
        uint256 _fee,
        uint256 _nonce
    ) external returns (bool) {
        Commitment storage c = commitments[_commitId];

        require(c.commitBlock > 0, "Commitment not found");
        require(!c.revealed, "Already revealed");
        require(!c.expired, "Commitment expired");
        require(msg.sender == c.committer, "Not committer");

        // Timing checks
        uint256 blockDelay = block.number - c.commitBlock;
        require(blockDelay >= MIN_REVEAL_DELAY, "Too early - wait more blocks");
        require(blockDelay <= MAX_REVEAL_WINDOW, "Reveal window expired");

        // Verify hash matches commitment
        bytes32 expectedHash = keccak256(
            abi.encodePacked(_nullifierHash, _recipient, _relayer, _fee, _nonce)
        );
        require(expectedHash == c.commitHash, "Hash mismatch - reveal data doesn't match commit");

        c.revealed = true;
        totalReveals++;

        emit CommitmentRevealed(_commitId, block.number, blockDelay);

        // Now the actual withdrawal can proceed
        // The mixer contract checks isValidReveal() before executing
        return true;
    }

    // ── Expire stale commitments ─────────────────────────
    function expireCommitment(bytes32 _commitId) external {
        Commitment storage c = commitments[_commitId];
        require(c.commitBlock > 0, "Not found");
        require(!c.revealed, "Already revealed");
        require(!c.expired, "Already expired");

        bool blockExpired = block.number > c.commitBlock + MAX_REVEAL_WINDOW;
        bool timeExpired = block.timestamp > c.commitTime + COMMIT_EXPIRY;

        require(blockExpired || timeExpired, "Not yet expired");

        c.expired = true;
        totalExpired++;

        emit CommitmentExpired(_commitId);
    }

    // ── Validation for mixer contracts ───────────────────
    /**
     * @notice Check if a commitment has been validly revealed.
     * Called by mixer contracts before executing withdrawals.
     */
    function isValidReveal(bytes32 _commitId) external view returns (bool) {
        Commitment storage c = commitments[_commitId];
        return c.revealed && !c.expired;
    }

    /**
     * @notice Get the commit hash for verification.
     */
    function getCommitHash(bytes32 _commitId) external view returns (bytes32) {
        return commitments[_commitId].commitHash;
    }

    // ── View helpers ─────────────────────────────────────
    function getCommitmentStatus(bytes32 _commitId) external view returns (
        bool exists,
        bool revealed,
        bool expired,
        uint256 blocksUntilReveal,
        uint256 blocksUntilExpiry
    ) {
        Commitment storage c = commitments[_commitId];
        exists = c.commitBlock > 0;

        if (!exists) return (false, false, false, 0, 0);

        revealed = c.revealed;
        expired = c.expired || block.number > c.commitBlock + MAX_REVEAL_WINDOW;

        uint256 revealBlock = c.commitBlock + MIN_REVEAL_DELAY;
        blocksUntilReveal = block.number < revealBlock ? revealBlock - block.number : 0;

        uint256 expiryBlock = c.commitBlock + MAX_REVEAL_WINDOW;
        blocksUntilExpiry = block.number < expiryBlock ? expiryBlock - block.number : 0;
    }
}
