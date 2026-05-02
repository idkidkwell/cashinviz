// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RelayerRegistry
/// @notice Decentralized relayer network — anyone can become a relayer
///         by staking ETH. Relayers earn fees for submitting withdrawal
///         transactions on behalf of users.
///
///         Why this matters:
///         - One relayer = single point of failure + censorship
///         - Decentralized relayers = always available, censorship-resistant
///         - Staking prevents spam/griefing
///         - Reputation system rewards reliable relayers
///         - Users can choose their relayer (competition drives fees down)
///
///         How it works:
///         1. Anyone stakes minimum ETH to become a relayer
///         2. They run the relayer software (open source)
///         3. Users pick a relayer from the registry
///         4. Relayer submits withdrawal tx, earns the relayer fee
///         5. Bad relayers (failing txs, going offline) get slashed
///         6. Good relayers earn reputation points, get more traffic
contract RelayerRegistry {
    // ── Structs ──────────────────────────────────────────────

    struct Relayer {
        address addr;
        uint256 stake;
        uint256 fee;           // Fee in wei this relayer charges
        string url;            // HTTP endpoint for the relayer API
        uint256 reputation;    // Earned from successful relays
        uint256 totalRelayed;  // Total withdrawals relayed
        uint256 totalSlashed;  // Total times slashed
        uint256 registeredAt;
        bool active;
    }

    // ── Constants ────────────────────────────────────────────

    uint256 public constant MIN_STAKE = 0.1 ether;
    uint256 public constant SLASH_AMOUNT = 0.01 ether;
    uint256 public constant REPUTATION_PER_RELAY = 10;

    // ── State ────────────────────────────────────────────────

    address public owner;

    /// All registered relayers
    mapping(address => Relayer) public relayers;

    /// Active relayer addresses (for enumeration)
    address[] public activeRelayers;
    mapping(address => uint256) private relayerIndex; // address → index in activeRelayers

    /// Addresses authorized to report relay success/failure
    mapping(address => bool) public authorizedReporters;

    /// Total stats
    uint256 public totalRelayers;
    uint256 public totalStaked;

    // ── Events ───────────────────────────────────────────────

    event RelayerRegistered(address indexed relayer, uint256 stake, uint256 fee, string url);
    event RelayerDeactivated(address indexed relayer);
    event RelayerSlashed(address indexed relayer, uint256 amount, string reason);
    event RelaySuccess(address indexed relayer, uint256 newReputation);
    event StakeAdded(address indexed relayer, uint256 amount, uint256 newTotal);
    event StakeWithdrawn(address indexed relayer, uint256 amount);
    event FeeUpdated(address indexed relayer, uint256 newFee);

    // ── Errors ───────────────────────────────────────────────

    error NotOwner();
    error InsufficientStake();
    error AlreadyRegistered();
    error NotRegistered();
    error NotActive();
    error NotAuthorized();
    error WithdrawalWouldBreachMinimum();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        authorizedReporters[msg.sender] = true;
    }

    // ── Register as relayer ──────────────────────────────────

    /// @notice Stake ETH and register as a relayer.
    /// @param fee The fee (in wei) you charge per relay.
    /// @param url Your relayer API endpoint (e.g. "https://relay.example.com").
    function register(uint256 fee, string calldata url) external payable {
        if (msg.value < MIN_STAKE) revert InsufficientStake();
        if (relayers[msg.sender].registeredAt != 0) revert AlreadyRegistered();

        relayers[msg.sender] = Relayer({
            addr: msg.sender,
            stake: msg.value,
            fee: fee,
            url: url,
            reputation: 0,
            totalRelayed: 0,
            totalSlashed: 0,
            registeredAt: block.timestamp,
            active: true
        });

        relayerIndex[msg.sender] = activeRelayers.length;
        activeRelayers.push(msg.sender);
        totalRelayers++;
        totalStaked += msg.value;

        emit RelayerRegistered(msg.sender, msg.value, fee, url);
    }

    // ── Manage stake ─────────────────────────────────────────

    /// @notice Add more stake to increase trust.
    function addStake() external payable {
        if (relayers[msg.sender].registeredAt == 0) revert NotRegistered();

        relayers[msg.sender].stake += msg.value;
        totalStaked += msg.value;

        emit StakeAdded(msg.sender, msg.value, relayers[msg.sender].stake);
    }

    /// @notice Withdraw excess stake (must maintain MIN_STAKE if active).
    function withdrawStake(uint256 amount) external {
        Relayer storage r = relayers[msg.sender];
        if (r.registeredAt == 0) revert NotRegistered();

        if (r.active && r.stake - amount < MIN_STAKE)
            revert WithdrawalWouldBreachMinimum();

        r.stake -= amount;
        totalStaked -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit StakeWithdrawn(msg.sender, amount);
    }

    /// @notice Update your relay fee.
    function updateFee(uint256 newFee) external {
        if (relayers[msg.sender].registeredAt == 0) revert NotRegistered();
        relayers[msg.sender].fee = newFee;
        emit FeeUpdated(msg.sender, newFee);
    }

    /// @notice Deactivate yourself (stop accepting relays).
    function deactivate() external {
        Relayer storage r = relayers[msg.sender];
        if (!r.active) revert NotActive();

        r.active = false;
        _removeFromActive(msg.sender);

        emit RelayerDeactivated(msg.sender);
    }

    // ── Reporting (by mixer contracts) ───────────────────────

    /// @notice Report a successful relay (increases reputation).
    function reportSuccess(address relayer) external {
        if (!authorizedReporters[msg.sender]) revert NotAuthorized();
        Relayer storage r = relayers[relayer];
        if (r.registeredAt == 0) revert NotRegistered();

        r.totalRelayed++;
        r.reputation += REPUTATION_PER_RELAY;

        emit RelaySuccess(relayer, r.reputation);
    }

    /// @notice Slash a relayer for bad behavior.
    function slash(address relayer, string calldata reason) external onlyOwner {
        Relayer storage r = relayers[relayer];
        if (r.registeredAt == 0) revert NotRegistered();

        uint256 slashAmt = r.stake >= SLASH_AMOUNT ? SLASH_AMOUNT : r.stake;
        r.stake -= slashAmt;
        r.totalSlashed++;
        totalStaked -= slashAmt;

        // Slashed funds go to protocol
        (bool ok, ) = owner.call{value: slashAmt}("");
        if (!ok) revert TransferFailed();

        // Auto-deactivate if below min stake
        if (r.stake < MIN_STAKE && r.active) {
            r.active = false;
            _removeFromActive(relayer);
        }

        emit RelayerSlashed(relayer, slashAmt, reason);
    }

    // ── Admin ────────────────────────────────────────────────

    function setAuthorizedReporter(address reporter, bool authorized) external onlyOwner {
        authorizedReporters[reporter] = authorized;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ── Views ────────────────────────────────────────────────

    /// @notice Get all active relayers, sorted by reputation (off-chain sort).
    function getActiveRelayers() external view returns (Relayer[] memory) {
        Relayer[] memory result = new Relayer[](activeRelayers.length);
        for (uint256 i = 0; i < activeRelayers.length; i++) {
            result[i] = relayers[activeRelayers[i]];
        }
        return result;
    }

    /// @notice Get the number of active relayers.
    function activeRelayerCount() external view returns (uint256) {
        return activeRelayers.length;
    }

    /// @notice Get a relayer's info.
    function getRelayer(address addr) external view returns (Relayer memory) {
        return relayers[addr];
    }

    // ── Internal ─────────────────────────────────────────────

    function _removeFromActive(address relayer) internal {
        uint256 idx = relayerIndex[relayer];
        uint256 lastIdx = activeRelayers.length - 1;

        if (idx != lastIdx) {
            address last = activeRelayers[lastIdx];
            activeRelayers[idx] = last;
            relayerIndex[last] = idx;
        }

        activeRelayers.pop();
        delete relayerIndex[relayer];
    }
}
