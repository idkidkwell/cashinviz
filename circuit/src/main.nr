// ============================================================
// Privacy Mixer - ZK Circuits
// Stack: Noir + Barretenberg (UltraPLONK)
// Proving: Client-side via WASM
//
// Hash: std::hash::pedersen_hash (ZK-friendly, public in Noir 1.0.0-beta.20).
// The Poseidon2 module is private in this release; we'll migrate when it
// becomes public. Pedersen is constraint-efficient and battle-tested.
//
// Circuits:
//   1. main (withdrawal) - proves you own a deposit and can withdraw it
//   2. shielded_transfer - lives in circuit/transfer/ (separate Noir project)
// ============================================================

use std::hash::pedersen_hash;

global TREE_DEPTH: u32 = 20;

// ---- Shared helpers -----------------------------------------

/// Compute a note commitment: pedersen_hash(secret, nullifier, token, amount).
/// Including token + amount in the commitment lets us have variable-amount
/// notes and multi-token support in a single unified pool.
fn compute_commitment(
    secret: Field,
    nullifier: Field,
    token: Field,
    amount: Field,
) -> Field {
    pedersen_hash([secret, nullifier, token, amount])
}

/// Compute nullifier hash from nullifier value.
fn compute_nullifier_hash(nullifier: Field) -> Field {
    pedersen_hash([nullifier])
}

/// Recompute Merkle root from a leaf and its authentication path.
fn compute_merkle_root(
    leaf: Field,
    leaf_index: u32,
    path: [Field; 20],
) -> Field {
    let mut current = leaf;
    let mut idx = leaf_index;

    for i in 0..TREE_DEPTH {
        let is_right = (idx & 1) == 1;
        let left  = if is_right { path[i] } else { current };
        let right = if is_right { current } else { path[i] };
        current = pedersen_hash([left, right]);
        idx >>= 1;
    }

    current
}

// ---- Circuit 1: Withdrawal ----------------------------------
// Proves: "I own a note in the tree and I want to withdraw it."

fn main(
    // Private inputs (never leave browser)
    secret: Field,
    nullifier: Field,
    token: Field,
    amount: Field,
    leaf_index: u32,
    merkle_path: [Field; 20],

    // Public inputs (submitted on-chain)
    root: pub Field,
    nullifier_hash: pub Field,
    recipient: pub Field,
    pub_token: pub Field,
    pub_amount: pub Field,
    relayer: pub Field,
    fee: pub u64,
) {
    // 1. Verify the private token/amount match public declarations
    assert(token == pub_token, "Token mismatch");
    assert(amount == pub_amount, "Amount mismatch");

    // 2. Compute commitment from private inputs
    let commitment = compute_commitment(secret, nullifier, token, amount);

    // 3. Verify nullifier hash
    let computed_nh = compute_nullifier_hash(nullifier);
    assert(computed_nh == nullifier_hash, "Nullifier hash mismatch");

    // 4. Verify commitment is in the Merkle tree
    let computed_root = compute_merkle_root(commitment, leaf_index, merkle_path);
    assert(computed_root == root, "Merkle root mismatch");

    // 5. Bind recipient, relayer, fee into proof (prevents malleability)
    let _r = recipient;
    let _rel = relayer;
    let _f = fee;
}

// ---- Internal helper (non-entry, so no pub params) ----------
// The shielded-transfer circuit lives in circuit/transfer/ as a separate
// Noir project with its own main(). This copy here exists only so tests
// can exercise the logic without compiling a second circuit.

fn shielded_transfer_helper(
    in_secret: Field,
    in_nullifier: Field,
    in_token: Field,
    in_amount: Field,
    in_leaf_index: u32,
    in_merkle_path: [Field; 20],
    out1_secret: Field,
    out1_nullifier: Field,
    out1_amount: Field,
    out2_secret: Field,
    out2_nullifier: Field,
    out2_amount: Field,
    root: Field,
    in_nullifier_hash: Field,
    out1_commitment: Field,
    out2_commitment: Field,
) {
    let in_commitment = compute_commitment(in_secret, in_nullifier, in_token, in_amount);
    let computed_root = compute_merkle_root(in_commitment, in_leaf_index, in_merkle_path);
    assert(computed_root == root, "Input note not in tree");

    let computed_nh = compute_nullifier_hash(in_nullifier);
    assert(computed_nh == in_nullifier_hash, "Nullifier hash mismatch");

    let computed_out1 = compute_commitment(out1_secret, out1_nullifier, in_token, out1_amount);
    assert(computed_out1 == out1_commitment, "Output 1 commitment mismatch");

    let computed_out2 = compute_commitment(out2_secret, out2_nullifier, in_token, out2_amount);
    assert(computed_out2 == out2_commitment, "Output 2 commitment mismatch");

    assert(in_amount == out1_amount + out2_amount, "Value not conserved");
}

// ---- Tests --------------------------------------------------

#[test]
fn test_commitment_deterministic() {
    let c1 = compute_commitment(1, 2, 3, 4);
    let c2 = compute_commitment(1, 2, 3, 4);
    assert(c1 == c2);
}

#[test]
fn test_commitment_different_inputs() {
    let c1 = compute_commitment(1, 2, 3, 100);
    let c2 = compute_commitment(1, 2, 3, 200);
    assert(c1 != c2);
}

#[test]
fn test_merkle_root_deterministic() {
    let leaf = compute_commitment(1, 2, 0, 1000);
    let path = [0; 20];
    let root = compute_merkle_root(leaf, 0, path);
    assert(root != 0);
}

#[test]
fn test_full_withdrawal_circuit() {
    let secret = 12345;
    let nullifier = 67890;
    let token = 0; // ETH
    let amount = 1000000000000000000; // 1 ETH in wei

    let commitment = compute_commitment(secret, nullifier, token, amount);
    let nullifier_hash = compute_nullifier_hash(nullifier);
    let path = [0; 20];
    let root = compute_merkle_root(commitment, 0, path);

    main(
        secret, nullifier, token, amount,
        0, path,
        root, nullifier_hash,
        0x1234567890123456789012345678901234567890,
        token, amount,
        0, 0,
    );
}

#[test]
fn test_shielded_transfer_helper() {
    let in_secret = 111;
    let in_nullifier = 222;
    let in_token = 0;
    let in_amount = 1000;

    let in_commitment = compute_commitment(in_secret, in_nullifier, in_token, in_amount);
    let in_nh = compute_nullifier_hash(in_nullifier);
    let path = [0; 20];
    let root = compute_merkle_root(in_commitment, 0, path);

    // Split: 700 to recipient, 300 change
    let out1_secret = 333;
    let out1_nullifier = 444;
    let out1_amount = 700;

    let out2_secret = 555;
    let out2_nullifier = 666;
    let out2_amount = 300;

    let out1_commitment = compute_commitment(out1_secret, out1_nullifier, in_token, out1_amount);
    let out2_commitment = compute_commitment(out2_secret, out2_nullifier, in_token, out2_amount);

    shielded_transfer_helper(
        in_secret, in_nullifier, in_token, in_amount, 0, path,
        out1_secret, out1_nullifier, out1_amount,
        out2_secret, out2_nullifier, out2_amount,
        root, in_nh, out1_commitment, out2_commitment,
    );
}
