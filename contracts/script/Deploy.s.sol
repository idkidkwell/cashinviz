// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import {MixerFactory} from "../src/MixerFactory.sol";
import {Mixer} from "../src/Mixer.sol";
import {ERC20Mixer} from "../src/ERC20Mixer.sol";
import {ShieldedPool} from "../src/ShieldedPool.sol";
import {YieldPool} from "../src/YieldPool.sol";
import {CrossChainBridge} from "../src/CrossChainBridge.sol";

/// @title DeployScript
/// @notice End-to-end deployment of the Privacy Mixer protocol. One
///         broadcast deploys:
///           1. The Noir-generated `HonkVerifier` (7 public inputs)
///           2. The `MixerFactory`
///           3. Default ETH pools (0.1 / 1 / 10 / 100 ETH)
///           4. The unified `ShieldedPool`
///           5. The `YieldPool` (Aave-backed) — only on chains where we
///              know canonical Aave V3 + WETH addresses
///           6. The `CrossChainBridge` (deploys everywhere; operator
///              wires up trusted relayers + counterparty chains)
///           7. Stablecoin pools on chains where those addresses are known
///
///         After deploying, the verifier is wired into every pool by
///         calling `setVerifier()` (or `setWithdrawVerifier()` on the
///         shielded pool) so that proofs are actually enforced.
///
///         Finally, all addresses are printed + written to
///         `deployments/<chainId>.json` for the frontend to read.
///
/// Usage:
///   forge script script/Deploy.s.sol:DeployScript \
///     --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
contract DeployScript is Script {
    // ── Known stablecoin addresses ──────────────────────────────

    // Ethereum mainnet
    address constant USDC_MAINNET = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant USDT_MAINNET = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant DAI_MAINNET  = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    // Sepolia (Circle's native USDC testnet address)
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    // ── Aave V3 + WETH addresses (for YieldPool) ────────────────
    // These are the canonical Aave V3 deployment addresses. If they
    // change (Aave upgrades a market), update here. Verified against
    // https://aave.com/docs/resources/addresses

    // Mainnet
    address constant WETH_MAINNET      = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant AAVE_POOL_MAINNET = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    address constant AWETH_MAINNET     = 0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8;

    // Sepolia (Aave V3 testnet)
    address constant WETH_SEPOLIA      = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    address constant AAVE_POOL_SEPOLIA = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    address constant AWETH_SEPOLIA     = 0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830;

    // Chain IDs we recognize for auto-wiring
    uint256 constant CHAIN_MAINNET = 1;
    uint256 constant CHAIN_SEPOLIA = 11155111;

    // ── Project receiving wallet (EVM) ──────────────────────────
    // Owner + protocol-fee recipient on every deployed pool. Source
    // of truth: /dev-wallets.json (`evm.address`). After this script
    // runs, the operator MUST broadcast `acceptOwnership()` on every
    // pool from this address — that's the second half of the 2-step
    // ownership transfer pattern. Until they do, the deployer is
    // still the live owner (transferOwnership only sets pendingOwner).
    address constant DEV_WALLET_EVM = 0xf815919520F422Ca76AAF0333f3C810CBD30BCDc;

    // ── Deployment result struct ────────────────────────────────
    // Bundled to keep `_writeDeploymentArtifact` under the stack
    // depth limit — the function does enough JSON serialization
    // that adding two more positional addresses tipped it over.
    struct Deployed {
        uint256 chainId;
        address deployer;
        address verifier;
        address factory;
        address shieldedPool;
        address yieldPool;        // address(0) on chains without Aave V3 wiring
        address crossChainBridge;
        address eth01;
        address eth1;
        address eth10;
        address eth100;
        address[] tokens;
        uint256[] denoms;
        address[] tokenPools;
    }

    // ── Entry point ─────────────────────────────────────────────

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 chainId = block.chainid;

        console.log("=== Privacy Mixer Deployment ===");
        console.log("Chain ID :", chainId);
        console.log("Deployer :", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ── 1. Verifier (Noir-generated) ────────────────────────
        HonkVerifier verifier = new HonkVerifier();
        console.log("HonkVerifier :", address(verifier));

        // ── 2. Factory ──────────────────────────────────────────
        MixerFactory factory = new MixerFactory();
        console.log("MixerFactory :", address(factory));

        // ── 3. ETH pools ────────────────────────────────────────
        factory.createDefaultETHPools();
        address eth01  = factory.ethMixers(0.1 ether);
        address eth1   = factory.ethMixers(1 ether);
        address eth10  = factory.ethMixers(10 ether);
        address eth100 = factory.ethMixers(100 ether);
        console.log("Mixer 0.1ETH :", eth01);
        console.log("Mixer 1ETH   :", eth1);
        console.log("Mixer 10ETH  :", eth10);
        console.log("Mixer 100ETH :", eth100);

        // Wire the verifier into each ETH pool.
        Mixer(payable(eth01)).setVerifier(address(verifier));
        Mixer(payable(eth1)).setVerifier(address(verifier));
        Mixer(payable(eth10)).setVerifier(address(verifier));
        Mixer(payable(eth100)).setVerifier(address(verifier));

        // ── 4. Shielded pool ────────────────────────────────────
        address shieldedPool = factory.deployShieldedPool();
        console.log("ShieldedPool :", shieldedPool);

        // Withdraw circuit is the current verifier. The transfer
        // circuit will live in its own Noir project (circuit/transfer)
        // — wire it here once deployed.
        ShieldedPool(shieldedPool).setWithdrawVerifier(address(verifier));
        // ShieldedPool(shieldedPool).setTransferVerifier(<transferVerifier>);

        // ── 5. Yield pool (Aave-backed) ─────────────────────────
        // Only deploy on chains where we know the canonical Aave V3
        // pool + aWETH addresses. On other chains the operator can
        // deploy YieldPool manually with the right wiring.
        address yieldPool = _deployYieldPool(chainId, address(verifier));

        // ── 6. Cross-chain bridge ───────────────────────────────
        // Generic — deploys on every chain. The deployer becomes the
        // initial trusted relayer; counterparty chains must be wired
        // post-deployment via `connectChain(chainId)`.
        CrossChainBridge bridge = new CrossChainBridge(shieldedPool);
        console.log("CrossChainBridge:", address(bridge));

        // ── 7. Chain-specific stablecoin pools ──────────────────
        // We only auto-wire pools on chains where we know the canonical
        // stablecoin addresses. On other chains the operator can call
        // `factory.createTokenPool(token, denom)` manually.
        address[] memory tokenPools;
        uint256[] memory tokenDenoms;
        address[] memory tokenAddrs;

        if (chainId == CHAIN_MAINNET) {
            (tokenPools, tokenAddrs, tokenDenoms) = _createStablecoinPools(
                factory,
                verifier,
                USDC_MAINNET,
                USDT_MAINNET,
                DAI_MAINNET
            );
        } else if (chainId == CHAIN_SEPOLIA) {
            address[] memory tokens = new address[](1);
            uint256[] memory denoms = new uint256[](1);
            tokens[0] = USDC_SEPOLIA;
            denoms[0] = 100e6; // 100 USDC testnet
            (tokenPools, tokenAddrs, tokenDenoms) = _createAndWire(
                factory,
                verifier,
                tokens,
                denoms
            );
        } else {
            tokenPools = new address[](0);
            tokenAddrs = new address[](0);
            tokenDenoms = new uint256[](0);
        }

        // ── 8. Hand off ownership to the dev wallet ─────────────
        // The deployer was a temporary admin so it could wire verifiers
        // (sections 3-6) without round-tripping signatures. Now we
        // transfer ownership of every fund-holding pool to the
        // configured DEV_WALLET_EVM. The transfer is two-step: this
        // script only records `pendingOwner`; DEV_WALLET_EVM must
        // broadcast `acceptOwnership()` from its own key on each pool
        // to finalise. Console output below lists every contract that
        // needs an accept call.
        Mixer(payable(eth01)).transferOwnership(DEV_WALLET_EVM);
        Mixer(payable(eth1)).transferOwnership(DEV_WALLET_EVM);
        Mixer(payable(eth10)).transferOwnership(DEV_WALLET_EVM);
        Mixer(payable(eth100)).transferOwnership(DEV_WALLET_EVM);
        ShieldedPool(shieldedPool).transferOwnership(DEV_WALLET_EVM);
        if (yieldPool != address(0)) {
            YieldPool(payable(yieldPool)).transferOwnership(DEV_WALLET_EVM);
        }
        bridge.transferOwnership(DEV_WALLET_EVM);
        for (uint256 i = 0; i < tokenPools.length; i++) {
            ERC20Mixer(tokenPools[i]).transferOwnership(DEV_WALLET_EVM);
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== Pending ownership transfers ===");
        console.log("From DEV_WALLET_EVM, broadcast `acceptOwnership()` on:");
        console.log("  Mixer 0.1ETH    :", eth01);
        console.log("  Mixer 1ETH      :", eth1);
        console.log("  Mixer 10ETH     :", eth10);
        console.log("  Mixer 100ETH    :", eth100);
        console.log("  ShieldedPool    :", shieldedPool);
        if (yieldPool != address(0)) {
            console.log("  YieldPool       :", yieldPool);
        }
        console.log("  CrossChainBridge:", address(bridge));
        for (uint256 i = 0; i < tokenPools.length; i++) {
            console.log("  ERC20 pool      :", tokenPools[i]);
        }
        console.log("DEV_WALLET_EVM   :", DEV_WALLET_EVM);

        // ── 8. Write deployments/<chainId>.json ─────────────────
        Deployed memory result = Deployed({
            chainId: chainId,
            deployer: deployer,
            verifier: address(verifier),
            factory: address(factory),
            shieldedPool: shieldedPool,
            yieldPool: yieldPool,
            crossChainBridge: address(bridge),
            eth01: eth01,
            eth1: eth1,
            eth10: eth10,
            eth100: eth100,
            tokens: tokenAddrs,
            denoms: tokenDenoms,
            tokenPools: tokenPools
        });
        _writeDeploymentArtifact(result);

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Artifact written to: deployments/", chainId, ".json");
    }

    // ── YieldPool deployment helper ─────────────────────────────
    /// Deploys a YieldPool wired to the canonical Aave V3 deployment
    /// on supported chains. Returns address(0) on chains where we
    /// don't know the right Aave addresses — caller can deploy by
    /// hand on those.
    function _deployYieldPool(
        uint256 chainId,
        address verifier
    ) internal returns (address) {
        address weth;
        address aavePool;
        address aWETH;

        if (chainId == CHAIN_MAINNET) {
            weth = WETH_MAINNET;
            aavePool = AAVE_POOL_MAINNET;
            aWETH = AWETH_MAINNET;
        } else if (chainId == CHAIN_SEPOLIA) {
            weth = WETH_SEPOLIA;
            aavePool = AAVE_POOL_SEPOLIA;
            aWETH = AWETH_SEPOLIA;
        } else {
            console.log("YieldPool    : skipped (no Aave V3 wiring for chain)");
            return address(0);
        }

        YieldPool pool = new YieldPool(weth, aavePool, aWETH);
        pool.setVerifier(verifier);
        console.log("YieldPool    :", address(pool));
        return address(pool);
    }

    // ── Helpers ─────────────────────────────────────────────────

    /// Creates the three canonical stablecoin pools for Ethereum mainnet
    /// and wires the verifier into each.
    function _createStablecoinPools(
        MixerFactory factory,
        HonkVerifier verifier,
        address usdc,
        address usdt,
        address dai
    ) internal returns (
        address[] memory pools,
        address[] memory tokens,
        uint256[] memory denoms
    ) {
        address[] memory ts = new address[](7);
        uint256[] memory ds = new uint256[](7);
        ts[0] = usdc; ds[0] = 100e6;      // 100 USDC
        ts[1] = usdc; ds[1] = 1000e6;     // 1k USDC
        ts[2] = usdc; ds[2] = 10000e6;    // 10k USDC
        ts[3] = usdt; ds[3] = 100e6;
        ts[4] = usdt; ds[4] = 1000e6;
        ts[5] = dai;  ds[5] = 100e18;
        ts[6] = dai;  ds[6] = 1000e18;
        return _createAndWire(factory, verifier, ts, ds);
    }

    /// For each (token, denomination) tuple: create the ERC20Mixer pool
    /// via the factory, then call setVerifier on the resulting contract.
    function _createAndWire(
        MixerFactory factory,
        HonkVerifier verifier,
        address[] memory tokens,
        uint256[] memory denoms
    ) internal returns (
        address[] memory pools,
        address[] memory tokensOut,
        uint256[] memory denomsOut
    ) {
        pools = new address[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            address pool = factory.createTokenPool(tokens[i], denoms[i]);
            ERC20Mixer(pool).setVerifier(address(verifier));
            pools[i] = pool;
            console.log("ERC20 pool   :", pool);
        }
        tokensOut = tokens;
        denomsOut = denoms;
    }

    /// Writes the full set of deployed addresses to a JSON artifact that
    /// the frontend and relayer can read. One file per chain ID lets us
    /// deploy to many chains without stomping each other.
    function _writeDeploymentArtifact(Deployed memory r) internal {
        string memory root = "deployment";

        vm.serializeUint(root, "chainId", r.chainId);
        vm.serializeAddress(root, "deployer", r.deployer);
        vm.serializeAddress(root, "verifier", r.verifier);
        vm.serializeAddress(root, "factory", r.factory);
        vm.serializeAddress(root, "shieldedPool", r.shieldedPool);
        vm.serializeAddress(root, "yieldPool", r.yieldPool);
        vm.serializeAddress(root, "crossChainBridge", r.crossChainBridge);

        string memory ethPools = "ethPools";
        vm.serializeAddress(ethPools, "0.1", r.eth01);
        vm.serializeAddress(ethPools, "1", r.eth1);
        vm.serializeAddress(ethPools, "10", r.eth10);
        string memory ethPoolsJson = vm.serializeAddress(ethPools, "100", r.eth100);
        vm.serializeString(root, "ethPools", ethPoolsJson);

        // Three parallel JSON arrays — index `i` of each describes one
        // ERC-20 pool. Foundry's vm.serialize* can't emit an array of
        // objects directly; the original implementation produced a
        // stringified pseudo-object keyed by index, which the frontend
        // then had to JSON.parse twice. Parallel primitive arrays are
        // the idiomatic foundry-vm shape and decode cleanly.
        vm.serializeAddress(root, "tokenAddresses", r.tokens);
        vm.serializeUint(root, "tokenDenominations", r.denoms);
        vm.serializeAddress(root, "tokenPools", r.tokenPools);

        string memory final_ = vm.serializeUint(root, "deployedAt", block.timestamp);

        string memory path = string(
            abi.encodePacked(
                "deployments/",
                vm.toString(r.chainId),
                ".json"
            )
        );
        vm.writeJson(final_, path);
    }
}
