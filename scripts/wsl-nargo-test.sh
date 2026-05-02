#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/bin:$HOME/.bb:$HOME/.nargo/bin:/usr/local/bin:/usr/bin:/bin"
cd /mnt/d/CLAUDE/privacy-mixer/circuit
echo "==> nargo test"
nargo test
echo "==> nargo test: DONE"
