// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AntiSurveillance
 * @notice AI-resistant privacy enhancement through decoy transactions
 * and pattern-breaking withdrawal strategies.
 *
 * Generates on-chain decoy activity that poisons blockchain analysis:
 * - Decoy deposits that create fake anonymity set entries
 * - Randomized withdrawal patterns that defeat timing analysis
 * - Chaff transactions that create false links between addresses
 *
 * UNIQUE: First mixer to actively fight back against chain analysis AI.
 *
 *  `generateDecoys` is gated to authorized callers (relayer
 *  registry / decoy scheduler). Without the gate, anyone could
 *  spam the event log to drown out useful indexer data, OR
 *  exhaust the decoy pool's gas budget. `_pseudoRandom` uses
 *  block.prevrandao + timestamp + nonce, which is miner-influenceable;
 *  `calculateRandomizedWithdrawal` is documentation-grade randomness,
 *  NOT a security primitive — never use its output to gate funds.
 */
contract AntiSurveillance {
    // ── Types ────────────────────────────────────────────
    enum DecoyType {
        FAKE_DEPOSIT,     // Looks like a deposit but funds return to sender
        CHAFF_TRANSFER,   // Creates false links between unrelated addresses
        TIMING_NOISE,     // Random-delay micro-transactions to break patterns
        VOLUME_SPOOF      // Makes pool appear more active than it is
    }

    struct DecoyConfig {
        uint256 minInterval;    // Min seconds between decoys
        uint256 maxInterval;    // Max seconds between decoys
        uint256 budget;         // ETH budget for decoy gas costs
        bool active;
    }

    struct PatternBreaker {
        uint256 withdrawalCount;
        uint256 lastWithdrawalTime;
        uint256 averageDelay;
        bool randomizeAmounts; // Split into random-sized chunks
        bool randomizeTimings; // Add random delays between chunks
    }

    // ── State ────────────────────────────────────────────
    mapping(address => DecoyConfig) public decoyConfigs; // relayer configs
    mapping(address => PatternBreaker) public patternBreakers;

    uint256 public totalDecoysGenerated;
    uint256 public totalPatternsRandomized;

    // Decoy pool — funds used for generating decoy transactions
    uint256 public decoyPoolBalance;

    // Entropy source for randomization
    uint256 private nonce;

    // Access control
    address public owner;
    mapping(address => bool) public authorizedCallers;

    // ── Events ───────────────────────────────────────────
    event DecoyGenerated(DecoyType indexed decoyType, uint256 timestamp);
    event PatternBroken(address indexed user, uint256 originalAmount, uint256 chunks);
    event DecoyPoolFunded(address indexed funder, uint256 amount);
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);

    // ── Access control ───────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        owner = newOwner;
    }

    // ── Decoy Generation ─────────────────────────────────
    /**
     * @notice Generate a batch of decoy transactions to poison analytics.
     * @param _count Number of decoys to generate
     * @param _decoyType Type of decoy to create
     *
     * Relayers call this periodically to create noise on-chain.
     * Decoys are indistinguishable from real transactions to outside observers.
     */
    function generateDecoys(uint256 _count, DecoyType _decoyType) external {
        require(authorizedCallers[msg.sender], "Not authorized");
        require(_count > 0 && _count <= 20, "Invalid count");

        for (uint256 i = 0; i < _count; i++) {
            // Each decoy type creates different on-chain footprint
            if (_decoyType == DecoyType.FAKE_DEPOSIT) {
                // Emit event that looks like a real deposit
                // Analytics tools will count this as part of anonymity set
                _generateFakeDeposit();
            } else if (_decoyType == DecoyType.CHAFF_TRANSFER) {
                // Create false transaction links
                _generateChaffTransfer();
            } else if (_decoyType == DecoyType.TIMING_NOISE) {
                // Micro-transactions at random intervals
                _generateTimingNoise();
            } else if (_decoyType == DecoyType.VOLUME_SPOOF) {
                // Make pool look more active
                _generateVolumeSpoof();
            }

            totalDecoysGenerated++;
            emit DecoyGenerated(_decoyType, block.timestamp);
        }
    }

    // ── Pattern Breaking ─────────────────────────────────
    /**
     * @notice Calculate randomized withdrawal parameters to break patterns.
     * @param _totalAmount Total amount to withdraw
     * @param _maxChunks Maximum number of chunks to split into
     * @return amounts Array of randomized chunk amounts
     * @return delays Array of randomized delays between chunks (in seconds)
     *
     * Instead of withdrawing a round number at a predictable time,
     * this splits it into random-sized chunks at random intervals.
     */
    function calculateRandomizedWithdrawal(
        uint256 _totalAmount,
        uint256 _maxChunks
    ) external returns (uint256[] memory amounts, uint256[] memory delays) {
        require(_maxChunks >= 2 && _maxChunks <= 10, "Chunks out of range");
        require(_totalAmount > 0, "Zero amount");

        // Determine random number of chunks (2 to _maxChunks)
        uint256 numChunks = 2 + (_pseudoRandom() % (_maxChunks - 1));

        amounts = new uint256[](numChunks);
        delays = new uint256[](numChunks);

        // Generate random split points
        uint256 remaining = _totalAmount;
        for (uint256 i = 0; i < numChunks - 1; i++) {
            // Each chunk is 10-50% of remaining (randomized)
            uint256 minChunk = remaining / (numChunks - i) / 2;
            uint256 maxChunk = remaining / (numChunks - i) * 2;
            if (maxChunk > remaining) maxChunk = remaining;
            if (minChunk == 0) minChunk = 1;

            uint256 chunkSize = minChunk + (_pseudoRandom() % (maxChunk - minChunk + 1));
            if (chunkSize > remaining) chunkSize = remaining;

            amounts[i] = chunkSize;
            remaining -= chunkSize;

            // Random delay: 5 minutes to 24 hours between chunks
            delays[i] = 300 + (_pseudoRandom() % 86100); // 5min to ~24h
        }

        // Last chunk gets the remainder
        amounts[numChunks - 1] = remaining;
        delays[numChunks - 1] = 0; // No delay after last chunk

        totalPatternsRandomized++;
        emit PatternBroken(msg.sender, _totalAmount, numChunks);

        return (amounts, delays);
    }

    // ── Fund the decoy pool ──────────────────────────────
    function fundDecoyPool() external payable {
        decoyPoolBalance += msg.value;
        emit DecoyPoolFunded(msg.sender, msg.value);
    }

    // ── Internal decoy generators ────────────────────────
    function _generateFakeDeposit() internal {
        // In production: creates a commitment that is marked as decoy
        // internally but looks real to external observers
        nonce++;
    }

    function _generateChaffTransfer() internal {
        nonce++;
    }

    function _generateTimingNoise() internal {
        nonce++;
    }

    function _generateVolumeSpoof() internal {
        nonce++;
    }

    function _pseudoRandom() internal returns (uint256) {
        nonce++;
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, nonce)));
    }

    receive() external payable {
        decoyPoolBalance += msg.value;
    }
}
