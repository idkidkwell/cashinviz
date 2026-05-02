// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";

/**
 * @title BitcoinBridge
 * @notice Trustless Bitcoin integration via Hash Time-Locked Contracts (HTLCs).
 *
 * Users deposit BTC on the Bitcoin network, which gets atomically swapped
 * to WBTC on EVM, then mixed through our privacy pool.
 *
 * Flow:
 * 1. User generates a secret + hash
 * 2. User locks BTC in a Bitcoin HTLC (using our BTC script)
 * 3. Liquidity provider locks equivalent WBTC in this contract
 * 4. User reveals secret to claim WBTC → enters mixer
 * 5. LP uses revealed secret to claim BTC on Bitcoin network
 *
 * Also supports direct WBTC deposits for users who already have it.
 * Beats Tumblio because: fully trustless, no custodian, atomic swaps.
 */
contract BitcoinBridge {
    // ── Types ────────────────────────────────────────────
    struct HTLCSwap {
        address initiator;       // User who wants to swap BTC → WBTC
        address liquidityProvider;
        bytes32 hashLock;        // SHA256 hash of the secret
        uint256 wbtcAmount;      // WBTC locked by LP
        uint256 timelock;        // Expiry timestamp
        bool claimed;
        bool refunded;
    }

    struct LiquidityProvider {
        uint256 wbtcBalance;     // Available WBTC for swaps
        uint256 feeBps;          // LP's fee in basis points
        uint256 totalSwaps;
        bool active;
    }

    // ── State ────────────────────────────────────────────
    IERC20 public immutable WBTC;

    mapping(bytes32 => HTLCSwap) public swaps;
    mapping(address => LiquidityProvider) public liquidityProviders;

    address[] public activeLPs;

    uint256 public constant MIN_TIMELOCK = 2 hours;
    uint256 public constant MAX_TIMELOCK = 48 hours;
    uint256 public constant BTC_CONFIRMATIONS_REQUIRED = 3;

    uint256 public totalSwapsCompleted;
    uint256 public totalBTCBridged; // In satoshis equivalent

    // ── Events ───────────────────────────────────────────
    event SwapCreated(bytes32 indexed swapId, address indexed initiator, uint256 wbtcAmount, bytes32 hashLock);
    event SwapClaimed(bytes32 indexed swapId, bytes32 secret);
    event SwapRefunded(bytes32 indexed swapId);
    event LPRegistered(address indexed lp, uint256 wbtcDeposit);
    event LPWithdrew(address indexed lp, uint256 amount);

    // ── Constructor ──────────────────────────────────────
    constructor(address _wbtc) {
        WBTC = IERC20(_wbtc);
    }

    // ── LP Management ────────────────────────────────────
    /**
     * @notice Register as a liquidity provider for BTC↔WBTC swaps.
     * LPs earn fees for providing WBTC liquidity.
     */
    function registerLP(uint256 _wbtcAmount, uint256 _feeBps) external {
        require(_wbtcAmount > 0, "Zero deposit");
        require(_feeBps <= 100, "Fee too high"); // Max 1%

        // WBTC is spec-compliant (returns bool), but other future
        // wrapped-BTC variants might not be. Check the return value
        // so a silently-failing transfer doesn't credit an LP balance
        // they didn't actually fund.
        require(WBTC.transferFrom(msg.sender, address(this), _wbtcAmount), "WBTC pull failed");

        if (!liquidityProviders[msg.sender].active) {
            activeLPs.push(msg.sender);
        }

        liquidityProviders[msg.sender] = LiquidityProvider({
            wbtcBalance: liquidityProviders[msg.sender].wbtcBalance + _wbtcAmount,
            feeBps: _feeBps,
            totalSwaps: liquidityProviders[msg.sender].totalSwaps,
            active: true
        });

        emit LPRegistered(msg.sender, _wbtcAmount);
    }

    // ── Atomic Swap: Step 1 — LP locks WBTC ─────────────
    /**
     * @notice LP locks WBTC for an incoming BTC swap.
     * Called after user has locked BTC on Bitcoin network.
     * @param _hashLock SHA256 hash of the secret (same as Bitcoin HTLC)
     * @param _wbtcAmount Amount of WBTC to lock
     * @param _initiator The user's EVM address
     * @param _timelock Expiry time for the swap
     */
    function lockWBTC(
        bytes32 _hashLock,
        uint256 _wbtcAmount,
        address _initiator,
        uint256 _timelock
    ) external returns (bytes32 swapId) {
        require(liquidityProviders[msg.sender].active, "Not an LP");
        require(liquidityProviders[msg.sender].wbtcBalance >= _wbtcAmount, "Insufficient balance");
        require(_timelock >= block.timestamp + MIN_TIMELOCK, "Timelock too short");
        require(_timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too long");

        swapId = keccak256(abi.encodePacked(_hashLock, msg.sender, _initiator, block.timestamp));
        require(swaps[swapId].timelock == 0, "Swap exists");

        liquidityProviders[msg.sender].wbtcBalance -= _wbtcAmount;

        swaps[swapId] = HTLCSwap({
            initiator: _initiator,
            liquidityProvider: msg.sender,
            hashLock: _hashLock,
            wbtcAmount: _wbtcAmount,
            timelock: _timelock,
            claimed: false,
            refunded: false
        });

        emit SwapCreated(swapId, _initiator, _wbtcAmount, _hashLock);
    }

    // ── Atomic Swap: Step 2 — User claims WBTC ──────────
    /**
     * @notice User reveals the secret to claim WBTC.
     * The revealed secret can then be used by the LP to claim BTC on Bitcoin.
     */
    function claimWBTC(bytes32 _swapId, bytes32 _secret) external {
        HTLCSwap storage swap = swaps[_swapId];
        require(!swap.claimed, "Already claimed");
        require(!swap.refunded, "Already refunded");
        require(block.timestamp < swap.timelock, "Swap expired");

        // Verify secret matches hash lock
        require(sha256(abi.encodePacked(_secret)) == swap.hashLock, "Invalid secret");

        swap.claimed = true;
        totalSwapsCompleted++;

        // Transfer WBTC to user. Same reasoning as registerLP — bail
        // out hard rather than silently completing the HTLC if the
        // ERC-20 reports failure.
        require(WBTC.transfer(swap.initiator, swap.wbtcAmount), "WBTC payout failed");

        // LP can now use _secret to claim BTC on Bitcoin network
        emit SwapClaimed(_swapId, _secret);
    }

    // ── Atomic Swap: Refund (if user doesn't claim) ─────
    function refundWBTC(bytes32 _swapId) external {
        HTLCSwap storage swap = swaps[_swapId];
        require(!swap.claimed, "Already claimed");
        require(!swap.refunded, "Already refunded");
        require(block.timestamp >= swap.timelock, "Not expired yet");
        require(msg.sender == swap.liquidityProvider, "Not LP");

        swap.refunded = true;
        liquidityProviders[swap.liquidityProvider].wbtcBalance += swap.wbtcAmount;

        emit SwapRefunded(_swapId);
    }

    // ── View helpers ─────────────────────────────────────
    function getActiveLPs() external view returns (address[] memory) {
        return activeLPs;
    }

    function getBestLP(uint256 _wbtcAmount) external view returns (address bestLP, uint256 bestFee) {
        bestFee = type(uint256).max;
        for (uint256 i = 0; i < activeLPs.length; i++) {
            LiquidityProvider storage lp = liquidityProviders[activeLPs[i]];
            if (lp.active && lp.wbtcBalance >= _wbtcAmount && lp.feeBps < bestFee) {
                bestLP = activeLPs[i];
                bestFee = lp.feeBps;
            }
        }
    }
}
