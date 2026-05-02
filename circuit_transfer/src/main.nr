// ============================================================
// Cashinviz - Shielded Transfer Circuit
// Stack: Noir + Barretenberg (UltraPLONK)
//
// Proves: "I own a note in the pool, and I'm splitting it into
// two new notes whose values sum to the original."
//
// Public inputs (must match ShieldedPool._verifyTransferProof):
//   1. root              - the Merkle root the input note lives under
//   2. in_nullifier_hash - pedersen(in_nullifier), prevents double-spend
//   3. out1_commitment   - new note for the recipient
//   4. out2_commitment   - change note back to the sender
//
// Hash: pedersen_hash to match the rest of the protocol. When Noir
// 1.x makes Poseidon2 public the withdraw and transfer circuits
// migrate together (and the Solidity tree-hash flips with them).
// ============================================================

use std::hash::pedersen_hash;

global TREE_DEPTH: u32 = 20;

fn compute_commitment(
    secret: Field,
    nullifier: Field,
    token: Field,
    amount: Field,
) -> Field {
    pedersen_hash([secret, nullifier, token, amount])
}

fn compute_nullifier_hash(nullifier: Field) -> Field {
    pedersen_hash([nullifier])
}

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

fn main(
    // Private inputs - the input note + Merkle proof
    in_secret: Field,
    in_nullifier: Field,
    in_token: Field,
    in_amount: Field,
    in_leaf_index: u32,
    in_merkle_path: [Field; 20],

    // Private inputs - the two output notes (same token as input)
    out1_secret: Field,
    out1_nullifier: Field,
    out1_amount: Field,
    out2_secret: Field,
    out2_nullifier: Field,
    out2_amount: Field,

    // Public inputs (submitted on-chain to ShieldedPool)
    root: pub Field,
    in_nullifier_hash: pub Field,
    out1_commitment: pub Field,
    out2_commitment: pub Field,
) {
    // 1. The input note exists in the tree under `root`.
    let in_commitment = compute_commitment(in_secret, in_nullifier, in_token, in_amount);
    let computed_root = compute_merkle_root(in_commitment, in_leaf_index, in_merkle_path);
    assert(computed_root == root, "Input note not in tree");

    // 2. The publicly-visible nullifier hash is consistent with the
    //    private nullifier we know about. The pool stores this hash
    //    so the input note can never be transferred or withdrawn twice.
    let computed_nh = compute_nullifier_hash(in_nullifier);
    assert(computed_nh == in_nullifier_hash, "Nullifier hash mismatch");

    // 3. The two output commitments match what the user privately
    //    constructed. Note that out1 and out2 inherit the input's
    //    token - there's no cross-asset transfer in this circuit.
    let computed_out1 = compute_commitment(out1_secret, out1_nullifier, in_token, out1_amount);
    assert(computed_out1 == out1_commitment, "Output 1 commitment mismatch");

    let computed_out2 = compute_commitment(out2_secret, out2_nullifier, in_token, out2_amount);
    assert(computed_out2 == out2_commitment, "Output 2 commitment mismatch");

    // 4. Value conservation - the two output values sum to the input.
    //    Without this, anyone with a valid input note could mint
    //    arbitrary value into the pool.
    assert(in_amount == out1_amount + out2_amount, "Value not conserved");
}

// ---- Tests --------------------------------------------------

#[test]
fn test_transfer_value_conservation() {
    let in_secret = 111;
    let in_nullifier = 222;
    let in_token = 0;
    let in_amount = 1000;

    let in_commitment = compute_commitment(in_secret, in_nullifier, in_token, in_amount);
    let in_nh = compute_nullifier_hash(in_nullifier);
    let path = [0; 20];
    let root = compute_merkle_root(in_commitment, 0, path);

    let out1_amount = 700;
    let out2_amount = 300;

    let out1_commitment = compute_commitment(333, 444, in_token, out1_amount);
    let out2_commitment = compute_commitment(555, 666, in_token, out2_amount);

    main(
        in_secret, in_nullifier, in_token, in_amount, 0, path,
        333, 444, out1_amount,
        555, 666, out2_amount,
        root, in_nh, out1_commitment, out2_commitment,
    );
}
