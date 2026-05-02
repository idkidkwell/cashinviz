#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/bin:$HOME/.bb:$HOME/.nargo/bin:/usr/local/bin:/usr/bin:/bin"
cd /mnt/d/CLAUDE/privacy-mixer/circuit

echo "==> nargo compile"
nargo compile

CIRCUIT_FILE="target/privacy_mixer.json"
[ -f "$CIRCUIT_FILE" ] || { echo "ERROR: $CIRCUIT_FILE missing"; exit 1; }

rm -f target/vk target/vk_hash target/Verifier.sol

echo "==> bb write_vk -t evm (Ethereum/Solidity keccak, ZK)"
bb write_vk -b "$CIRCUIT_FILE" -o target/ -t evm

echo "==> VK info:"
ls -la target/vk target/vk_hash

echo "==> bb write_solidity_verifier -t evm --optimized"
bb write_solidity_verifier -k target/vk -o target/Verifier.sol -t evm --optimized

echo "==> Verifier.sol generated:"
ls -la target/Verifier.sol
wc -l target/Verifier.sol
echo "--- first 40 lines ---"
head -40 target/Verifier.sol
