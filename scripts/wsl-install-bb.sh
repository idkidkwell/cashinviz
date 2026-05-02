#!/usr/bin/env bash
# Install bb (Barretenberg) in WSL via bbup.
set -euo pipefail

export PATH="$HOME/.bb:$HOME/.nargo/bin:$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin"

echo "==> Downloading bbup installer..."
curl -L -o /tmp/bbup_install.sh https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/bbup/install

echo "==> Running bbup installer..."
bash /tmp/bbup_install.sh

export PATH="$HOME/.bb:$PATH"

echo "==> Running bbup to install latest bb..."
if command -v bbup >/dev/null 2>&1; then
    bbup
else
    echo "bbup not on PATH after install. Searching..."
    find "$HOME" -name bbup -type f 2>/dev/null | head -5
fi

echo "==> Verifying bb install..."
which bb || true
bb --version 2>&1 || true
