#!/usr/bin/env bash
# Install jq as a static user-local binary (no sudo), then run bbup.
set -euo pipefail

mkdir -p "$HOME/.local/bin"

if ! command -v jq >/dev/null 2>&1; then
    echo "==> Downloading jq 1.7.1 (static binary)..."
    curl -L -o "$HOME/.local/bin/jq" \
        https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-amd64
    chmod +x "$HOME/.local/bin/jq"
fi

export PATH="$HOME/.local/bin:$HOME/.bb:$HOME/.nargo/bin:/usr/local/bin:/usr/bin:/bin"

echo "==> Verifying jq..."
jq --version

echo "==> Running bbup..."
bbup

echo "==> Verifying bb..."
which bb
bb --version 2>&1 || true
