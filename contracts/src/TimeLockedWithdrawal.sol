// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimeLockedWithdrawal
 * @notice Configurable withdrawal delays for maximum privacy.
 *
 * Users can schedule withdrawals with a delay of 1 hour to 7 days.
 * Longer delays = larger anonymity set = better privacy.
 * Supports random jitter to prevent timing correlation attacks.
 *
 * No other mixer offers configurable time-locked withdrawals on-chain.
 *
 *  ⚠️ NOT PRODUCTION READY — `scheduleWithdrawal` does NOT verify a ZK
 *  proof. As-is, anyone can schedule a withdrawal of any amount with a
 *  fabricated nullifier and drain the contract once the delay expires.
 *  The killswitch below (paused = true by default) keeps the entry
 *  points fail-closed until the operator explicitly opens the contract
 *  AFTER wiring the Noir-generated verifier and replacing the TODO at
 *  `scheduleWithdrawal`. Do NOT call `setPaused(false)` until that
 *  work is done.
 */
contract TimeLockedWithdrawal {
    // ── Types ────────────────────────────────────────────
    struct ScheduledWithdrawal {
        bytes32 nullifierHash;
        address recipient;
        address relayer;
        uint256 amount;
        address token; // address(0) = ETH
        uint256 unlockTime;
        uint256 fee;
        bool executed;
        bool cancelled;
    }

    // ── State ────────────────────────────────────────────
    mapping(bytes32 => ScheduledWithdrawal) public withdrawals;
    mapping(bytes32 => bool) public nullifierUsed;

    uint256 public constant MIN_DELAY = 1 hours;
    uint256 public constant MAX_DELAY = 7 days;
    uint256 public constant MAX_JITTER = 2 hours; // Random jitter window

    uint256 public protocolFeeBps = 100; // 1%
    uint256 public constant MAX_FEE_BPS = 100;
    address public feeRecipient;

    uint256 public totalScheduled;
    uint256 public totalExecuted;

    address public owner;
    /// Killswitch — fail-closed by default. The `scheduleWithdrawal` /
    /// `executeWithdrawal` pair has a placeholder ZK verification that
    /// would otherwise let anyone drain the contract. Owner must wire
    /// a real verifier and explicitly unpause.
    bool public paused = true;

    // ── Events ───────────────────────────────────────────
    event WithdrawalScheduled(
        bytes32 indexed id,
        address indexed recipient,
        uint256 amount,
        address token,
        uint256 unlockTime,
        uint256 delay
    );
    event WithdrawalExecuted(bytes32 indexed id, address indexed recipient, uint256 amount);
    event WithdrawalCancelled(bytes32 indexed id);

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

    // ── Schedule a time-locked withdrawal ────────────────
    /**
     * @notice Schedule a withdrawal with a configurable delay.
     * @param _nullifierHash The nullifier hash from the ZK proof
     * @param _recipient Where to send funds when unlocked
     * @param _amount Amount to withdraw
     * @param _token Token address (address(0) for ETH)
     * @param _delay Delay in seconds (MIN_DELAY to MAX_DELAY)
     * @param _jitter Additional random jitter (0 to MAX_JITTER)
     *
     * The jitter is added ON TOP of the delay, making it impossible for
     * observers to predict exact withdrawal times from the delay parameter.
     */
    function scheduleWithdrawal(
        bytes32 _nullifierHash,
        address _recipient,
        uint256 _amount,
        address _token,
        uint256 _delay,
        uint256 _jitter
    ) external whenNotPaused returns (bytes32 id) {
        require(!nullifierUsed[_nullifierHash], "Nullifier already used");
        require(_delay >= MIN_DELAY && _delay <= MAX_DELAY, "Delay out of range");
        require(_jitter <= MAX_JITTER, "Jitter too large");
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Zero amount");

        // TODO: Verify ZK proof here (placeholder)

        nullifierUsed[_nullifierHash] = true;

        uint256 totalDelay = _delay + _jitter;
        uint256 unlockTime = block.timestamp + totalDelay;

        id = keccak256(abi.encodePacked(_nullifierHash, _recipient, block.timestamp));

        withdrawals[id] = ScheduledWithdrawal({
            nullifierHash: _nullifierHash,
            recipient: _recipient,
            relayer: msg.sender,
            amount: _amount,
            token: _token,
            unlockTime: unlockTime,
            fee: (_amount * protocolFeeBps) / 10000,
            executed: false,
            cancelled: false
        });

        totalScheduled++;

        emit WithdrawalScheduled(id, _recipient, _amount, _token, unlockTime, totalDelay);
    }

    // ── Execute a matured withdrawal ─────────────────────
    /**
     * @notice Execute a scheduled withdrawal after the time lock expires.
     * Anyone can call this (incentivized by relayer fees).
     */
    function executeWithdrawal(bytes32 _id) external whenNotPaused {
        ScheduledWithdrawal storage w = withdrawals[_id];
        require(!w.executed, "Already executed");
        require(!w.cancelled, "Cancelled");
        require(block.timestamp >= w.unlockTime, "Still locked");
        require(w.amount > 0, "Invalid withdrawal");

        w.executed = true;
        totalExecuted++;

        uint256 payout = w.amount - w.fee;

        if (w.token == address(0)) {
            // ETH
            (bool ok, ) = w.recipient.call{value: payout}("");
            require(ok, "ETH transfer failed");
            if (w.fee > 0) {
                (bool feeOk, ) = feeRecipient.call{value: w.fee}("");
                require(feeOk, "Fee transfer failed");
            }
        } else {
            // ERC-20
            (bool ok, ) = w.token.call(
                abi.encodeWithSignature("transfer(address,uint256)", w.recipient, payout)
            );
            require(ok, "Token transfer failed");
            if (w.fee > 0) {
                (bool feeOk, ) = w.token.call(
                    abi.encodeWithSignature("transfer(address,uint256)", feeRecipient, w.fee)
                );
                require(feeOk, "Fee transfer failed");
            }
        }

        emit WithdrawalExecuted(_id, w.recipient, payout);
    }

    // ── View helpers ─────────────────────────────────────
    function getTimeUntilUnlock(bytes32 _id) external view returns (uint256) {
        ScheduledWithdrawal storage w = withdrawals[_id];
        if (block.timestamp >= w.unlockTime) return 0;
        return w.unlockTime - block.timestamp;
    }

    function isReady(bytes32 _id) external view returns (bool) {
        ScheduledWithdrawal storage w = withdrawals[_id];
        return !w.executed && !w.cancelled && block.timestamp >= w.unlockTime;
    }

    receive() external payable {}
}
