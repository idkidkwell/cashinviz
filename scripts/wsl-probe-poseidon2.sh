#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/bin:$HOME/.bb:$HOME/.nargo/bin:/usr/local/bin:/usr/bin:/bin"

WORK=/tmp/noir_probe
rm -rf "$WORK"
mkdir -p "$WORK/src"
cd "$WORK"

cat > Nargo.toml <<'EOF'
[package]
name = "probe"
type = "bin"
authors = [""]
compiler_version = ">=1.0.0"
EOF

echo "== A. Poseidon2Hasher + Hasher trait =="
cat > src/main.nr <<'EOF'
use std::hash::poseidon2::Poseidon2Hasher;
use std::hash::Hasher;

fn main(a: pub Field, b: pub Field) -> pub Field {
    let mut h: Poseidon2Hasher = std::default::Default::default();
    h.write(a);
    h.write(b);
    h.finish()
}
EOF
nargo check 2>&1 | tail -5 || true
echo

echo "== B. via BuildHasher / Hash trait =="
cat > src/main.nr <<'EOF'
use std::hash::{Hash, BuildHasher, Hasher};
use std::hash::poseidon2::Poseidon2Hasher;

fn main(a: pub Field, b: pub Field) -> pub Field {
    let mut h: Poseidon2Hasher = std::default::Default::default();
    (a, b).hash(&mut h);
    h.finish()
}
EOF
nargo check 2>&1 | tail -5 || true
echo

echo "== C. hash_to_field =="
cat > src/main.nr <<'EOF'
fn main(a: pub Field, b: pub Field) -> pub Field {
    std::hash::pedersen_hash([a, b])
}
EOF
nargo check 2>&1 | tail -5 || true
echo

echo "== D. typed poseidon2_permutation =="
cat > src/main.nr <<'EOF'
fn main(a: pub Field, b: pub Field) -> pub Field {
    let inp: [Field; 4] = [a, b, 0, 0];
    let r: [Field; 4] = std::hash::poseidon2_permutation(inp, 4);
    r[0]
}
EOF
nargo check 2>&1 | tail -5 || true
echo
