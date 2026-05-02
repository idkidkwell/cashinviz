#!/bin/bash
# ============================================================
# IPFS Deployment — Uncensorable Frontend
#
# Tornado Cash's frontend was taken down because it was hosted
# on a regular domain. This script deploys to IPFS so nobody
# can seize or censor the frontend.
#
# The smart contracts are already unstoppable (on-chain).
# With IPFS + ENS, the entire stack is censorship-resistant.
#
# Prerequisites:
#   npm install -g @fleek/cli    # or use Pinata/web3.storage
#   npm install -g ipfs-deploy
# ============================================================

set -e

echo "Building frontend..."
npm run build
npx next export  # generates static HTML in /out

echo ""
echo "Deploying to IPFS..."

# Option 1: Using ipfs-deploy (pins to Pinata + Infura IPFS)
# ipd -p pinata -p infura out/

# Option 2: Using Fleek CLI
# fleek sites deploy --source out/

# Option 3: Using web3.storage
# w3 up out/

# Option 4: Manual — using local IPFS node
if command -v ipfs &> /dev/null; then
    CID=$(ipfs add -r -Q out/)
    echo ""
    echo "=========================================="
    echo "  Deployed to IPFS!"
    echo "  CID: $CID"
    echo ""
    echo "  Access via:"
    echo "  https://ipfs.io/ipfs/$CID"
    echo "  https://$CID.ipfs.dweb.link"
    echo "  https://$CID.ipfs.cf-ipfs.com"
    echo ""
    echo "  To link to ENS name:"
    echo "  1. Go to app.ens.domains"
    echo "  2. Set Content Hash to: ipfs://$CID"
    echo "  3. Users access via: privacymixer.eth"
    echo "=========================================="
else
    echo "IPFS not installed. Install with:"
    echo "  https://docs.ipfs.tech/install/"
    echo ""
    echo "Or use a pinning service:"
    echo "  npx ipfs-deploy out/ -p pinata"
fi
