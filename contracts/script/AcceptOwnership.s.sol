// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

interface ITwoStep {
    function acceptOwnership() external;
    function pendingOwner() external view returns (address);
    function owner() external view returns (address);
}

/// @title AcceptOwnershipScript
/// @notice Step 2 of the deploy workflow. Reads
///         `deployments/<chainId>.json` (written by Deploy.s.sol),
///         and broadcasts `acceptOwnership()` on every pool from the
///         dev wallet's key. Skips contracts that are already owned
///         by the dev wallet (idempotent — re-runs are safe).
///
///         Usage (PowerShell):
///             $env:DEV_KEY = "0x..."   // private key of DEV_WALLET_EVM
///             $env:RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"
///             forge script script/AcceptOwnership.s.sol:AcceptOwnershipScript `
///                 --rpc-url $env:RPC_URL --broadcast
contract AcceptOwnershipScript is Script {
    function run() external {
        uint256 devKey = vm.envUint("DEV_KEY");
        address devWallet = vm.addr(devKey);

        // Sanity-check: the deploy script's DEV_WALLET_EVM constant
        // must match the address derived from $DEV_KEY. Otherwise
        // we'd broadcast acceptOwnership() from a key that isn't
        // the pendingOwner of any pool, and every call would revert.
        address expectedDev = 0xf815919520F422Ca76AAF0333f3C810CBD30BCDc;
        require(
            devWallet == expectedDev,
            "DEV_KEY does not derive to DEV_WALLET_EVM"
        );

        uint256 chainId = block.chainid;
        string memory artifact = vm.readFile(
            string(abi.encodePacked("deployments/", vm.toString(chainId), ".json"))
        );

        // Pull each address out of the JSON. parseJsonAddress reverts
        // if the key is missing, which is what we want — better to
        // fail loud than to silently skip a pool.
        address[8] memory contracts;
        contracts[0] = vm.parseJsonAddress(artifact, ".ethPools.0\\.1");
        contracts[1] = vm.parseJsonAddress(artifact, ".ethPools.1");
        contracts[2] = vm.parseJsonAddress(artifact, ".ethPools.10");
        contracts[3] = vm.parseJsonAddress(artifact, ".ethPools.100");
        contracts[4] = vm.parseJsonAddress(artifact, ".shieldedPool");
        contracts[5] = vm.parseJsonAddress(artifact, ".yieldPool");
        contracts[6] = vm.parseJsonAddress(artifact, ".crossChainBridge");
        // ERC-20 pools live in a parallel array. We only know the
        // count from the deployments file; for now grab the first
        // entry (Sepolia ships exactly one stablecoin pool: USDC).
        address[] memory tokenPools = vm.parseJsonAddressArray(artifact, ".tokenPools");
        contracts[7] = tokenPools.length > 0 ? tokenPools[0] : address(0);

        console.log("=== Accepting ownership on chain", chainId, "===");
        console.log("Dev wallet:", devWallet);
        console.log("");

        vm.startBroadcast(devKey);

        for (uint256 i = 0; i < contracts.length; i++) {
            address c = contracts[i];
            if (c == address(0)) {
                continue; // YieldPool is address(0) on chains without Aave wiring
            }

            ITwoStep pool = ITwoStep(c);

            // Idempotent: if we're already the owner, skip.
            try pool.owner() returns (address current) {
                if (current == devWallet) {
                    console.log(unicode"  ✓ already owned:", c);
                    continue;
                }
            } catch {
                // No owner() getter — fall through and try the call
            }

            // Verify we are the pendingOwner before calling, so the
            // revert reason is more informative if the wiring is off.
            try pool.pendingOwner() returns (address pending) {
                require(
                    pending == devWallet,
                    string(
                        abi.encodePacked(
                            "DEV_KEY is not pendingOwner of ",
                            vm.toString(c)
                        )
                    )
                );
            } catch {
                // No pendingOwner() — odd, but still try the accept
            }

            pool.acceptOwnership();
            console.log(unicode"  ✓ accepted:", c);
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== Done. All pools now owned by", devWallet, "===");
    }
}
