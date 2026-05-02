#!/usr/bin/env bash
# Install nargo (Noir) in WSL. Run from WSL: bash /mnt/d/CLAUDE/privacy-mixer/scripts/wsl-install-nargo.sh
set -euo pipefail

export PATH="$HOME/.nargo/bin:$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin"

echo "==> Running noirup to install latest nargo..."
noirup

echo "==> Verifying nargo install..."
nargo --version
