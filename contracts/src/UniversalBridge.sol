// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";

/**
 * @title UniversalBridge
 * @notice Accept deposits from ANY blockchain and route them into the mixer.
 *
 * Supports:
 * - Bitcoin (via BitcoinBridge HTLC atomic swaps)
 * - Solana (via Wormhole bridge)
 * - Monero (via XMR↔WETH atomic swaps with privacy intermediary)
 * - Any EVM chain (via native cross-chain bridge)
 * - Cosmos chains (via IBC + Axelar)
 * - Tron, TON, etc. (via Wormhole)
 *
 * The "privacy intermediary" feature optionally routes through XMR:
 * Deposit ANY token → Convert to XMR → XMR mixing → Convert back → Withdraw
 * This adds Monero's native privacy on top of our ZK privacy.
 *
 * No other mixer supports this many chains with a unified interface.
 *
 *  ⚠️ NOT PRODUCTION READY
 *  - `receiveBridgedDeposit` does NOT verify Wormhole VAAs or other
 *    bridge messages — anyone can call it with arbitrary parameters
 *    and pollute the bridge state / event log.
 *  - `_processDeposit` does NOT actually generate a real commitment
 *    or deposit into the ShieldedPool — it emits a placeholder
 *    `bytes32(0)` and flips a boolean. No funds move on the EVM side.
 *  Pause state defaults to true. The admin must explicitly call
 *  `setPaused(false)` after wiring real Wormhole / bridge verification
 *  AND a real `_processDeposit` that calls into ShieldedPool. Until
 *  then `receiveBridgedDeposit` and `completeMoneroRoute` revert.
 */
contract UniversalBridge {
    // ── Types ────────────────────────────────────────────
    enum SourceChain {
        BITCOIN,
        SOLANA,
        MONERO,
        EVM,
        COSMOS,
        TRON,
        TON
    }

    struct BridgeDeposit {
        SourceChain sourceChain;
        bytes32 sourceTxHash;    // TX hash on the source chain
        address evmRecipient;    // Where to credit on EVM
        address token;           // EVM token received
        uint256 amount;
        bool processed;
        bool useMoneroRoute;     // Route through XMR for extra privacy
        uint256 timestamp;
    }

    // ── State ────────────────────────────────────────────
    address public immutable wormholeBridge;  // Wormhole core bridge
    address public immutable bitcoinBridge;   // Our BitcoinBridge contract
    address public immutable mixerPool;       // ShieldedPool to deposit into

    mapping(bytes32 => BridgeDeposit) public deposits;
    mapping(SourceChain => bool) public supportedChains;
    mapping(SourceChain => uint256) public chainDeposits; // Total deposits per chain

    // Monero atomic swap relayers
    mapping(address => bool) public xmrRelayers;

    address public admin;

    /// Killswitch — see contract NatSpec. Fail-closed by default until
    /// the bridge VAA verification + ShieldedPool integration ship.
    bool public paused = true;

    uint256 public totalBridgeDeposits;
    uint256 public totalMoneroRouted; // Deposits that went through XMR intermediary

    // ── Events ───────────────────────────────────────────
    event BridgeDepositReceived(
        bytes32 indexed depositId,
        SourceChain sourceChain,
        address evmRecipient,
        uint256 amount,
        bool useMoneroRoute
    );
    event DepositProcessed(bytes32 indexed depositId, bytes32 mixerCommitment);
    event MoneroRouteCompleted(bytes32 indexed depositId, uint256 xmrAmount, uint256 evmAmount);
    event ChainAdded(SourceChain chain);

    // ── Constructor ──────────────────────────────────────
    constructor(
        address _wormholeBridge,
        address _bitcoinBridge,
        address _mixerPool
    ) {
        wormholeBridge = _wormholeBridge;
        bitcoinBridge = _bitcoinBridge;
        mixerPool = _mixerPool;
        admin = msg.sender;

        // Enable all chains
        supportedChains[SourceChain.BITCOIN] = true;
        supportedChains[SourceChain.SOLANA] = true;
        supportedChains[SourceChain.MONERO] = true;
        supportedChains[SourceChain.EVM] = true;
        supportedChains[SourceChain.COSMOS] = true;
        supportedChains[SourceChain.TRON] = true;
        supportedChains[SourceChain.TON] = true;
    }

    // ── Receive bridged assets from Wormhole ─────────────
    /**
     * @notice Called by Wormhole bridge when assets arrive from Solana/Cosmos/Tron/TON.
     * @param _sourceChain Origin chain identifier
     * @param _sourceTxHash Transaction hash on the source chain
     * @param _recipient EVM address to credit
     * @param _token EVM token address
     * @param _amount Amount received
     * @param _useMoneroRoute Whether to route through XMR for extra privacy
     */
    function receiveBridgedDeposit(
        SourceChain _sourceChain,
        bytes32 _sourceTxHash,
        address _recipient,
        address _token,
        uint256 _amount,
        bool _useMoneroRoute
    ) external returns (bytes32 depositId) {
        require(!paused, "Paused: bridge verification not wired");
        require(supportedChains[_sourceChain], "Chain not supported");
        // In production: verify Wormhole VAA or bridge message

        depositId = keccak256(abi.encodePacked(_sourceTxHash, _sourceChain, block.timestamp));

        deposits[depositId] = BridgeDeposit({
            sourceChain: _sourceChain,
            sourceTxHash: _sourceTxHash,
            evmRecipient: _recipient,
            token: _token,
            amount: _amount,
            processed: false,
            useMoneroRoute: _useMoneroRoute,
            timestamp: block.timestamp
        });

        chainDeposits[_sourceChain]++;
        totalBridgeDeposits++;

        emit BridgeDepositReceived(depositId, _sourceChain, _recipient, _amount, _useMoneroRoute);

        // Auto-process if not using Monero route
        if (!_useMoneroRoute) {
            _processDeposit(depositId);
        }
    }

    // ── Monero Privacy Route ─────────────────────────────
    /**
     * @notice Complete the Monero intermediary route.
     *
     * Flow: User's token → XMR (via atomic swap) → wait → XMR → WETH → mixer
     * This adds Monero's ring signatures + stealth addresses on top of our ZK proofs.
     * Double privacy layer: Monero privacy + ZK privacy.
     *
     * Called by authorized XMR relayers after the XMR leg completes.
     */
    function completeMoneroRoute(
        bytes32 _depositId,
        uint256 _xmrAmount,
        uint256 _evmAmount
    ) external {
        require(!paused, "Paused: bridge verification not wired");
        require(xmrRelayers[msg.sender], "Not authorized XMR relayer");

        BridgeDeposit storage dep = deposits[_depositId];
        require(!dep.processed, "Already processed");
        require(dep.useMoneroRoute, "Not a Monero route");

        dep.amount = _evmAmount; // Update with actual amount after XMR round-trip
        totalMoneroRouted++;

        emit MoneroRouteCompleted(_depositId, _xmrAmount, _evmAmount);

        _processDeposit(_depositId);
    }

    // ── Internal: Route deposit into mixer ───────────────
    function _processDeposit(bytes32 _depositId) internal {
        BridgeDeposit storage dep = deposits[_depositId];
        require(!dep.processed, "Already processed");

        dep.processed = true;

        // In production: generate commitment and deposit into ShieldedPool
        // The user's funds are now in the mixer's anonymity set

        emit DepositProcessed(_depositId, bytes32(0)); // placeholder commitment
    }

    // ── Admin ────────────────────────────────────────────
    function addXMRRelayer(address _relayer) external {
        require(msg.sender == admin, "Only admin");
        xmrRelayers[_relayer] = true;
    }

    function setPaused(bool _paused) external {
        require(msg.sender == admin, "Only admin");
        paused = _paused;
    }

    // ── View helpers ─────────────────────────────────────
    function getChainStats() external view returns (uint256[7] memory stats) {
        stats[0] = chainDeposits[SourceChain.BITCOIN];
        stats[1] = chainDeposits[SourceChain.SOLANA];
        stats[2] = chainDeposits[SourceChain.MONERO];
        stats[3] = chainDeposits[SourceChain.EVM];
        stats[4] = chainDeposits[SourceChain.COSMOS];
        stats[5] = chainDeposits[SourceChain.TRON];
        stats[6] = chainDeposits[SourceChain.TON];
    }

    receive() external payable {}
}
