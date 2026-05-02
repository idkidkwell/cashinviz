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

for ATTEMPT in "poseidon::bn254::hash_2" "poseidon2::Poseidon2::hash" "poseidon2_permutation"; do
    echo "======================================"
    echo "ATTEMPT: $ATTEMPT"
    echo "======================================"
    case "$ATTEMPT" in
        "poseidon::bn254::hash_2")
            cat > src/main.nr <<'EOF'
fn main(a: pub Field, b: pub Field) -> pub Field {
    std::hash::poseidon::bn254::hash_2([a, b])
}
EOF
            ;;
        "poseidon2::Poseidon2::hash")
            cat > src/main.nr <<'EOF'
use std::hash::poseidon2::Poseidon2;
fn main(a: pub Field, b: pub Field) -> pub Field {
    Poseidon2::hash([a, b], 2)
}
EOF
            ;;
        "poseidon2_permutation")
            cat > src/main.nr <<'EOF'
fn main(a: pub Field, b: pub Field) -> pub Field {
    let r = std::hash::poseidon2_permutation([a, b, 0, 0], 4);
    r[0]
}
EOF
            ;;
    esac
    nargo check 2>&1 | tail -5 || true
    echo
done
