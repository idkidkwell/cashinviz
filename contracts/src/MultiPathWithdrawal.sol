// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";

/**
 * @title MultiPathWithdrawal
 * @notice Split a single withdrawal across multiple recipient addresses.
 *
 * Instead of withdrawing 10 ETH to one address (easy to trace),
 * split it into 3 ETH + 2 ETH + 5 ETH across 3 different wallets.
 * Each sub-withdrawal can have different delays for maximum obfuscation.
 *
 * UNIQUE FEATURE: No other mixer offers atomic multi-path withdrawals.
 *
 *  ⚠️ NOT PRODUCTION READY — `createMultiWithdrawal` does NOT verify
 *  a ZK proof (TODO at line ~85). Anyone can mint a multi-path
 *  withdrawal of any amount and drain whatever ETH this contract
 *  holds. The killswitch (paused = true by default) keeps both
 *  entry points fail-closed until the verifier is wired and
 *  `setPaused(false)` is called.
 */
contract MultiPathWithdrawal {
    // ── Types ────────────────────────────────────────────
    struct WithdrawalPath {
        address recipient;
        uint256 amount;
        uint256 delay; // 0 = immediate, otherwise seconds to wait
        bool executed;
    }

    struct MultiWithdrawal {
        bytes32 nullifierHash;
        uint256 totalAmount;
        address token;
        uint256 pathCount;
        uint256 executedCount;
        uint256 createdAt;
        bool cancelled;
    }

    // ── State ────────────────────────────────────────────
    mapping(bytes32 => MultiWithdrawal) public multiWithdrawals;
    mapping(bytes32 => mapping(uint256 => WithdrawalPath)) public paths;
    mapping(bytes32 => bool) public nullifierUsed;

    uint256 public constant MAX_PATHS = 10;
    uint256 public constant MAX_DELAY = 7 days;
    uint256 public protocolFeeBps = 100; // 1%
    address public feeRecipient;

    uint256 public totalMultiWithdrawals;

    address public owner;
    /// Killswitch — see contract NatSpec. Fail-closed by default.
    bool public paused = true;

    // ── Events ───────────────────────────────────────────
    event MultiWithdrawalCreated(
        bytes32 indexed id,
        uint256 totalAmount,
        address token,
        uint256 pathCount
    );
    event PathExecuted(bytes32 indexed id, uint256 pathIndex, address recipient, uint256 amount);

    // ── Constructor ──────────────────────────────────────
    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused: ZK verifier not wired");
        _;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        owner = newOwner;
    }

    // ── Create multi-path withdrawal ─────────────────────
    /**
     * @notice Create a withdrawal split across multiple addresses.
     * @param _nullifierHash Nullifier from ZK proof
     * @param _token Token address (address(0) for ETH)
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts for each recipient
     * @param _delays Array of delays for each path (in seconds)
     *
     * Sum of _amounts must equal the note value minus fees.
     * Each path can have a different delay for timing obfuscation.
     */
    function createMultiWithdrawal(
        bytes32 _nullifierHash,
        address _token,
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        uint256[] calldata _delays
    ) external whenNotPaused returns (bytes32 id) {
        require(!nullifierUsed[_nullifierHash], "Nullifier already used");
        require(_recipients.length == _amounts.length, "Length mismatch");
        require(_recipients.length == _delays.length, "Length mismatch");
        require(_recipients.length > 0 && _recipients.length <= MAX_PATHS, "Invalid path count");

        // TODO: Verify ZK proof here

        nullifierUsed[_nullifierHash] = true;

        uint256 totalAmount;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_recipients[i] != address(0), "Invalid recipient");
            require(_amounts[i] > 0, "Zero amount");
            require(_delays[i] <= MAX_DELAY, "Delay too long");
            totalAmount += _amounts[i];
        }

        id = keccak256(abi.encodePacked(_nullifierHash, msg.sender, block.timestamp));

        multiWithdrawals[id] = MultiWithdrawal({
            nullifierHash: _nullifierHash,
            totalAmount: totalAmount,
            token: _token,
            pathCount: _recipients.length,
            executedCount: 0,
            createdAt: block.timestamp,
            cancelled: false
        });

        for (uint256 i = 0; i < _recipients.length; i++) {
            paths[id][i] = WithdrawalPath({
                recipient: _recipients[i],
                amount: _amounts[i],
                delay: _delays[i],
                executed: false
            });
        }

        totalMultiWithdrawals++;

        emit MultiWithdrawalCreated(id, totalAmount, _token, _recipients.length);
    }

    // ── Execute a single path ────────────────────────────
    /**
     * @notice Execute one path of a multi-withdrawal after its delay.
     * Anyone can call this to execute matured paths.
     */
    function executePath(bytes32 _id, uint256 _pathIndex) external whenNotPaused {
        MultiWithdrawal storage mw = multiWithdrawals[_id];
        require(!mw.cancelled, "Cancelled");
        require(_pathIndex < mw.pathCount, "Invalid path index");

        WithdrawalPath storage path = paths[_id][_pathIndex];
        require(!path.executed, "Path already executed");
        require(block.timestamp >= mw.createdAt + path.delay, "Path still locked");

        path.executed = true;
        mw.executedCount++;

        uint256 fee = (path.amount * protocolFeeBps) / 10000;
        uint256 payout = path.amount - fee;

        if (mw.token == address(0)) {
            (bool ok, ) = path.recipient.call{value: payout}("");
            require(ok, "ETH transfer failed");
            if (fee > 0) {
                (bool feeOk, ) = feeRecipient.call{value: fee}("");
                require(feeOk, "Fee transfer failed");
            }
        } else {
            // Check the bool — non-spec ERC-20s like USDT can return false
            // instead of reverting, and an unchecked call would silently
            // record the path as `executed=true` while the funds never moved.
            require(IERC20(mw.token).transfer(path.recipient, payout), "ERC20 transfer failed");
            if (fee > 0) {
                require(IERC20(mw.token).transfer(feeRecipient, fee), "ERC20 fee transfer failed");
            }
        }

        emit PathExecuted(_id, _pathIndex, path.recipient, payout);
    }

    // ── Execute all ready paths at once ──────────────────
    function executeAllReady(bytes32 _id) external whenNotPaused {
        MultiWithdrawal storage mw = multiWithdrawals[_id];
        require(!mw.cancelled, "Cancelled");

        for (uint256 i = 0; i < mw.pathCount; i++) {
            WithdrawalPath storage path = paths[_id][i];
            if (!path.executed && block.timestamp >= mw.createdAt + path.delay) {
                path.executed = true;
                mw.executedCount++;

                uint256 fee = (path.amount * protocolFeeBps) / 10000;
                uint256 payout = path.amount - fee;

                if (mw.token == address(0)) {
                    (bool ok, ) = path.recipient.call{value: payout}("");
                    require(ok, "ETH transfer failed");
                    if (fee > 0) {
                        (bool feeOk, ) = feeRecipient.call{value: fee}("");
                        require(feeOk, "Fee transfer failed");
                    }
                } else {
                    require(IERC20(mw.token).transfer(path.recipient, payout), "ERC20 transfer failed");
                    if (fee > 0) {
                        require(IERC20(mw.token).transfer(feeRecipient, fee), "ERC20 fee transfer failed");
                    }
                }

                emit PathExecuted(_id, i, path.recipient, payout);
            }
        }
    }

    // ── View helpers ─────────────────────────────────────
    function getReadyPaths(bytes32 _id) external view returns (uint256[] memory) {
        MultiWithdrawal storage mw = multiWithdrawals[_id];
        uint256[] memory ready = new uint256[](mw.pathCount);
        uint256 count;

        for (uint256 i = 0; i < mw.pathCount; i++) {
            WithdrawalPath storage path = paths[_id][i];
            if (!path.executed && block.timestamp >= mw.createdAt + path.delay) {
                ready[count++] = i;
            }
        }

        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) result[i] = ready[i];
        return result;
    }

    function isComplete(bytes32 _id) external view returns (bool) {
        MultiWithdrawal storage mw = multiWithdrawals[_id];
        return mw.executedCount == mw.pathCount;
    }

    receive() external payable {}
}
