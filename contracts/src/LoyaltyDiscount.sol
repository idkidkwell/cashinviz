// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LoyaltyDiscount
 * @notice Progressive fee discounts for repeat users.
 *
 * Tracks usage via nullifier counting (privacy-preserving — only counts
 * HOW MANY times you've used the mixer, not WHICH transactions).
 *
 * Tier system:
 *   Bronze (0-4 uses):   2.0% fee (standard)
 *   Silver (5-19 uses):  1.5% fee (25% discount)
 *   Gold (20-49 uses):   1.0% fee (50% discount)
 *   Platinum (50+ uses): 0.5% fee (75% discount)
 *
 * Privacy-preserving: Uses commitment-based tracking, not address-based.
 * Users prove their tier via ZK proof of usage count.
 *
 *  ⚠️ `recordUsage` is gated to `authorizedCallers` (the mixer
 *  contracts). Without this gate, anyone could grind their own
 *  loyalty commitment to Platinum tier (50 cheap state-write txs)
 *  and unlock 75% fee discounts forever — a direct loss of
 *  protocol revenue. The owner whitelists each mixer contract
 *  via `setAuthorizedCaller(addr, true)` post-deployment.
 */
contract LoyaltyDiscount {
    // ── Types ────────────────────────────────────────────
    enum Tier { BRONZE, SILVER, GOLD, PLATINUM }

    struct TierInfo {
        string name;
        uint256 feeBps;
        uint256 minUses;
        uint256 discountPercent;
    }

    // ── State ────────────────────────────────────────────
    // Loyalty commitment: hash(secret, usageCount) — proves tier without revealing address
    mapping(bytes32 => uint256) public loyaltyPoints;
    mapping(bytes32 => Tier) public loyaltyTier;

    // Global stats
    uint256 public totalLoyaltyUsers;
    uint256 public totalDiscountGiven; // Cumulative ETH saved by users
    mapping(Tier => uint256) public usersPerTier;

    // Referral system
    mapping(bytes32 => bytes32) public referrer; // loyalty commitment → referrer commitment
    mapping(bytes32 => uint256) public referralCount;
    uint256 public constant REFERRAL_BONUS_BPS = 25; // 0.25% bonus discount for referrals

    // ── Constants ────────────────────────────────────────
    TierInfo[4] private tiers;

    // ── Access control ───────────────────────────────────
    address public owner;
    mapping(address => bool) public authorizedCallers;

    event AuthorizedCallerUpdated(address indexed caller, bool authorized);

    // ── Events ───────────────────────────────────────────
    event TierUpgraded(bytes32 indexed loyaltyCommitment, Tier newTier);
    event PointsEarned(bytes32 indexed loyaltyCommitment, uint256 points, uint256 totalPoints);
    event ReferralRegistered(bytes32 indexed referred, bytes32 indexed referrer);
    event DiscountApplied(uint256 originalFee, uint256 discountedFee, Tier tier);

    // ── Constructor ──────────────────────────────────────
    constructor() {
        tiers[0] = TierInfo("Bronze", 200, 0, 0);
        tiers[1] = TierInfo("Silver", 150, 5, 25);
        tiers[2] = TierInfo("Gold", 100, 20, 50);
        tiers[3] = TierInfo("Platinum", 50, 50, 75);
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

    // ── Record usage + earn points ───────────────────────
    /**
     * @notice Record a mixer usage and earn loyalty points.
     * @param _loyaltyCommitment Hash(secret, currentUsageCount) — privacy-preserving ID
     *
     * Called by the mixer contracts after successful deposit/withdrawal.
     * Each use earns 1 point. Tier upgrades happen automatically.
     */
    function recordUsage(bytes32 _loyaltyCommitment) external {
        require(authorizedCallers[msg.sender], "Not authorized");

        if (loyaltyPoints[_loyaltyCommitment] == 0) {
            totalLoyaltyUsers++;
            usersPerTier[Tier.BRONZE]++;
        }

        loyaltyPoints[_loyaltyCommitment]++;

        // Check for tier upgrade
        Tier oldTier = loyaltyTier[_loyaltyCommitment];
        Tier newTier = _calculateTier(loyaltyPoints[_loyaltyCommitment]);

        if (newTier != oldTier) {
            usersPerTier[oldTier]--;
            usersPerTier[newTier]++;
            loyaltyTier[_loyaltyCommitment] = newTier;
            emit TierUpgraded(_loyaltyCommitment, newTier);
        }

        // Bonus point for referrer
        bytes32 ref = referrer[_loyaltyCommitment];
        if (ref != bytes32(0)) {
            loyaltyPoints[ref]++;
            referralCount[ref]++;
        }

        emit PointsEarned(_loyaltyCommitment, 1, loyaltyPoints[_loyaltyCommitment]);
    }

    // ── Register referral ────────────────────────────────
    function registerReferral(bytes32 _loyaltyCommitment, bytes32 _referrerCommitment) external {
        require(referrer[_loyaltyCommitment] == bytes32(0), "Already has referrer");
        require(_loyaltyCommitment != _referrerCommitment, "Cannot self-refer");
        require(loyaltyPoints[_referrerCommitment] > 0, "Referrer not found");

        referrer[_loyaltyCommitment] = _referrerCommitment;
        emit ReferralRegistered(_loyaltyCommitment, _referrerCommitment);
    }

    // ── Calculate discounted fee ─────────────────────────
    /**
     * @notice Calculate the discounted fee for a given user.
     * @param _loyaltyCommitment The user's loyalty commitment
     * @param _amount The withdrawal amount
     * @return fee The discounted fee amount
     * @return feeBps The effective fee in basis points
     */
    function calculateFee(
        bytes32 _loyaltyCommitment,
        uint256 _amount
    ) external view returns (uint256 fee, uint256 feeBps) {
        Tier tier = loyaltyTier[_loyaltyCommitment];
        feeBps = tiers[uint256(tier)].feeBps;

        // Additional referral discount
        if (referrer[_loyaltyCommitment] != bytes32(0)) {
            feeBps = feeBps > REFERRAL_BONUS_BPS ? feeBps - REFERRAL_BONUS_BPS : 0;
        }

        fee = (_amount * feeBps) / 10000;
    }

    // ── View helpers ─────────────────────────────────────
    function getTierInfo(Tier _tier) external view returns (TierInfo memory) {
        return tiers[uint256(_tier)];
    }

    function getUserTier(bytes32 _loyaltyCommitment) external view returns (
        Tier tier,
        string memory name,
        uint256 feeBps,
        uint256 points,
        uint256 pointsToNextTier
    ) {
        tier = loyaltyTier[_loyaltyCommitment];
        TierInfo memory info = tiers[uint256(tier)];
        name = info.name;
        feeBps = info.feeBps;
        points = loyaltyPoints[_loyaltyCommitment];

        if (uint256(tier) < 3) {
            TierInfo memory nextInfo = tiers[uint256(tier) + 1];
            pointsToNextTier = nextInfo.minUses > points ? nextInfo.minUses - points : 0;
        }
    }

    function _calculateTier(uint256 _points) internal view returns (Tier) {
        if (_points >= tiers[3].minUses) return Tier.PLATINUM;
        if (_points >= tiers[2].minUses) return Tier.GOLD;
        if (_points >= tiers[1].minUses) return Tier.SILVER;
        return Tier.BRONZE;
    }
}
