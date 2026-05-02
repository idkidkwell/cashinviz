// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IncrementalMerkleTree
/// @notice Gas-efficient incremental Merkle tree, Tornado-style. Only
///         the path from the new leaf to the root is recomputed on each
///         insert. Stores the last `ROOT_HISTORY_SIZE` roots so in-flight
///         proofs don't become invalid when another user deposits.
///
///          🚨 PRODUCTION-BLOCKER 🚨
///          `_treeHash` below is a keccak256 placeholder. The Noir
///          withdrawal circuit computes its Merkle root with `pedersen_hash`
///          (`circuit/src/main.nr`). As long as the EVM-side hash is keccak,
///          on-chain roots will NEVER match circuit-derived roots, so
///          NO real ZK withdrawal will ever pass `isKnownRoot()` once
///          a real verifier is wired. Two paths to fix:
///            1. Implement Pedersen on BN254 in Solidity (expensive — needs
///               EC point multiplication, possibly a precompile).
///            2. Wait for Noir 1.x to expose Poseidon2 publicly, then
///               migrate BOTH sides to Poseidon2 (we already have audited
///               Solidity Poseidon2 libraries to drop in).
///          Path 2 is cheaper, faster, and lands a battle-tested hash on
///          both sides. Until either lands, the system runs in stub mode
///          (verifier == address(0)), which is locked in via the
///          `setVerifier(0)` revert in every pool contract.
contract IncrementalMerkleTree {
    // ── Constants ────────────────────────────────────────────

    uint32 public constant TREE_DEPTH = 20;
    uint32 public constant ROOT_HISTORY_SIZE = 30;

    // ── State ────────────────────────────────────────────────

    /// Zero values for each level (precomputed `_treeHash` of zero-pairs).
    /// Index 0 = leaf level, index 20 = root level.
    bytes32[21] public zeros;

    /// filledSubtrees[i] = the latest non-zero hash at level i on the left spine.
    bytes32[20] public filledSubtrees;

    /// Ring buffer of recent roots.
    bytes32[ROOT_HISTORY_SIZE] public roots;
    uint32 public currentRootIndex;

    /// Next leaf index to insert at.
    uint32 public nextIndex;

    // ── Events ───────────────────────────────────────────────

    event LeafInserted(bytes32 indexed leaf, uint32 leafIndex, bytes32 newRoot);

    // ── Constructor ──────────────────────────────────────────

    constructor() {
        // Precompute zero hashes for empty tree.
        // zeros[0] = 0 (empty leaf)
        bytes32 current = bytes32(0);
        zeros[0] = current;

        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            bytes32 z = _treeHash(current, current);
            zeros[i + 1] = z;
            filledSubtrees[i] = current;
            current = z;
        }

        // Initial root = hash of a completely empty tree.
        roots[0] = current;
    }

    // ── Public API ───────────────────────────────────────────

    /// @notice Insert a new leaf (commitment) into the tree.
    /// @return index The leaf position in the tree.
    function insert(bytes32 leaf) internal returns (uint32 index) {
        require(nextIndex < 2 ** TREE_DEPTH, "Tree is full");

        index = nextIndex;
        uint32 idx = index;
        bytes32 current = leaf;

        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            if (idx % 2 == 0) {
                // We are the left child — sibling is the zero at this level.
                filledSubtrees[i] = current;
                current = _treeHash(current, zeros[i]);
            } else {
                // We are the right child — sibling is the last filled subtree.
                current = _treeHash(filledSubtrees[i], current);
            }
            idx /= 2;
        }

        // Store new root in ring buffer.
        currentRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        roots[currentRootIndex] = current;
        nextIndex = index + 1;

        emit LeafInserted(leaf, index, current);
    }

    /// @notice Check if `root` is one of the last ROOT_HISTORY_SIZE roots.
    function isKnownRoot(bytes32 root) public view returns (bool) {
        if (root == bytes32(0)) return false;
        for (uint32 i = 0; i < ROOT_HISTORY_SIZE; i++) {
            if (roots[i] == root) return true;
        }
        return false;
    }

    /// @notice Return the current (latest) root.
    function getLastRoot() public view returns (bytes32) {
        return roots[currentRootIndex];
    }

    // ── Tree hash (placeholder) ──────────────────────────────
    // The Noir circuit currently uses Pedersen; once Noir 1.x makes
    // Poseidon2 public, both sides should migrate to Poseidon2 (a
    // Solidity poseidon2 library is the drop-in replacement here).
    // Until then the keccak256 stand-in lets the contract compile and
    // run unit tests, but cannot validate real ZK proofs.

    function _treeHash(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        // 🚨 PRODUCTION-BLOCKER — see contract NatSpec. This MUST match
        // whatever hash the Noir circuit uses for its Merkle tree, or
        // every on-chain root will diverge from the circuit's root and
        // no withdrawal will verify (denial of service for honest users
        // who already deposited). The path of least resistance is to
        // wait for Noir's Poseidon2 to go public, then drop in a
        // Solidity Poseidon2 library here (and update the circuit's
        // pedersen_hash calls to poseidon2 in lockstep).
        return keccak256(abi.encodePacked(a, b));
    }
}
