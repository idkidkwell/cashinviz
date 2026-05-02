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

run_attempt() {
    local name="$1"
    shift
    echo "============================================"
    echo "== $name"
    echo "============================================"
    cat > src/main.nr
    set +e
    OUT=$(nargo check 2>&1)
    set -e
    if echo "$OUT" | grep -q "error:"; then
        echo "FAIL:"
        echo "$OUT" | grep -E "(error|--->)" | head -8
    else
        echo "OK (no errors)"
    fi
    echo
}

run_attempt "E. pedersen_hash" <<'EOF'
fn main(a: pub Field, b: pub Field) -> pub Field {
    std::hash::pedersen_hash([a, b])
}
EOF

run_attempt "F. std::hash::poseidon2 as function" <<'EOF'
fn main(a: pub Field, b: pub Field) -> pub Field {
    std::hash::poseidon2([a, b])
}
EOF

run_attempt "G. keccak256" <<'EOF'
fn main(a: pub Field, b: pub Field) -> pub Field {
    let bytes = std::hash::keccak256([a as u8, b as u8], 2);
    bytes[0] as Field
}
EOF

run_attempt "H. Poseidon2 via fully-qualified function" <<'EOF'
fn main(a: pub Field, b: pub Field) -> pub Field {
    std::hash::poseidon::bn254::hash_2([a, b])
}
EOF
