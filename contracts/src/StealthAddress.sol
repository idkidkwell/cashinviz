// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title StealthAddress
/// @notice Stealth address system that turns the mixer into a PRIVATE PAYMENT NETWORK.
///
///         Instead of deposit → wait → withdraw (mixer pattern), users can:
///         - Publish a stealth meta-address (public)
///         - Anyone sends them ETH/tokens to a one-time stealth address
///         - Only the recipient can detect and spend from that address
///         - Sender and recipient are NEVER linked on-chain
///
///         This is like Umbra Protocol but integrated into our mixer's ZK system.
///
///         How stealth addresses work:
///         1. Recipient generates a spending key (s) and viewing key (v)
///         2. Recipient publishes stealth meta-address: (S, V) = (s*G, v*G)
///         3. Sender generates random ephemeral key r
///         4. Sender computes stealth address: P = S + hash(r*V)*G
///         5. Sender sends funds to P and publishes R = r*G (ephemeral pubkey)
///         6. Recipient scans announcements, tries: P' = S + hash(v*R)*G
///         7. If P' == P, recipient found their payment and can spend with s + hash(v*R)
///
///         Nobody can link sender to recipient without the viewing key.
contract StealthAddress {
    // ── Structs ──────────────────────────────────────────────

    /// A registered stealth meta-address.
    struct StealthMetaAddress {
        bytes spendingPubKey; // Compressed EC point (33 bytes)
        bytes viewingPubKey;  // Compressed EC point (33 bytes)
    }

    /// An announcement that a stealth payment was made.
    struct Announcement {
        address stealthAddress;  // The one-time address funds were sent to
        bytes ephemeralPubKey;   // R = r*G (for recipient to detect)
        bytes32 viewingTag;      // First 32 bytes of hash(r*V) — for fast scanning
        address token;           // address(0) for ETH
        uint256 amount;
        uint256 timestamp;
    }

    // ── State ────────────────────────────────────────────────

    /// ENS name or address → stealth meta-address
    mapping(address => StealthMetaAddress) public metaAddresses;

    /// All announcements (recipients scan these)
    Announcement[] public announcements;

    /// Number of stealth payments made
    uint256 public totalPayments;

    // ── Events ───────────────────────────────────────────────

    event StealthMetaAddressRegistered(
        address indexed registrant,
        bytes spendingPubKey,
        bytes viewingPubKey
    );

    event StealthPayment(
        address indexed stealthAddress,
        bytes ephemeralPubKey,
        bytes32 indexed viewingTag,
        address indexed token,
        uint256 amount
    );

    // ── Errors ───────────────────────────────────────────────

    error InvalidPubKeyLength();
    error NoMetaAddress();
    error PaymentFailed();

    // ── Register ─────────────────────────────────────────────

    /// @notice Register your stealth meta-address so others can pay you privately.
    /// @param spendingPubKey Your spending public key (33 bytes compressed).
    /// @param viewingPubKey Your viewing public key (33 bytes compressed).
    function registerMetaAddress(
        bytes calldata spendingPubKey,
        bytes calldata viewingPubKey
    ) external {
        if (spendingPubKey.length != 33 || viewingPubKey.length != 33)
            revert InvalidPubKeyLength();

        metaAddresses[msg.sender] = StealthMetaAddress({
            spendingPubKey: spendingPubKey,
            viewingPubKey: viewingPubKey
        });

        emit StealthMetaAddressRegistered(msg.sender, spendingPubKey, viewingPubKey);
    }

    // ── Send (ETH) ───────────────────────────────────────────

    /// @notice Send ETH to someone's stealth address.
    ///         The sender computes the stealth address off-chain using the
    ///         recipient's meta-address, then sends funds here with the
    ///         ephemeral public key for the recipient to detect.
    /// @param stealthAddress The one-time stealth address.
    /// @param ephemeralPubKey R = r*G (33 bytes compressed).
    /// @param viewingTag First 32 bytes of hash(r*V) for fast scanning.
    function sendETH(
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes32 viewingTag
    ) external payable {
        if (ephemeralPubKey.length != 33) revert InvalidPubKeyLength();

        // Forward ETH to the stealth address
        (bool ok, ) = stealthAddress.call{value: msg.value}("");
        if (!ok) revert PaymentFailed();

        // Store announcement for recipient to scan
        announcements.push(Announcement({
            stealthAddress: stealthAddress,
            ephemeralPubKey: ephemeralPubKey,
            viewingTag: viewingTag,
            token: address(0),
            amount: msg.value,
            timestamp: block.timestamp
        }));

        totalPayments++;

        emit StealthPayment(stealthAddress, ephemeralPubKey, viewingTag, address(0), msg.value);
    }

    // ── Send (ERC-20) ────────────────────────────────────────

    /// @notice Send ERC-20 tokens to someone's stealth address.
    function sendToken(
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes32 viewingTag,
        address token,
        uint256 amount
    ) external {
        if (ephemeralPubKey.length != 33) revert InvalidPubKeyLength();

        // Transfer tokens directly to the stealth address
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, stealthAddress, amount)
        );
        if (!ok || (data.length > 0 && !abi.decode(data, (bool)))) revert PaymentFailed();

        announcements.push(Announcement({
            stealthAddress: stealthAddress,
            ephemeralPubKey: ephemeralPubKey,
            viewingTag: viewingTag,
            token: token,
            amount: amount,
            timestamp: block.timestamp
        }));

        totalPayments++;

        emit StealthPayment(stealthAddress, ephemeralPubKey, viewingTag, token, amount);
    }

    // ── Scanning ─────────────────────────────────────────────

    /// @notice Get announcements in a range (for recipient scanning).
    ///         Recipients call this off-chain to find their payments.
    function getAnnouncements(
        uint256 fromIndex,
        uint256 count
    ) external view returns (Announcement[] memory) {
        uint256 end = fromIndex + count;
        if (end > announcements.length) end = announcements.length;

        uint256 len = end - fromIndex;
        Announcement[] memory result = new Announcement[](len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = announcements[fromIndex + i];
        }
        return result;
    }

    /// @notice Filter announcements by viewing tag (fast scan).
    ///         Recipient computes expected tags and matches against these.
    function getAnnouncementsByTag(
        bytes32 tag,
        uint256 fromIndex,
        uint256 maxResults
    ) external view returns (Announcement[] memory) {
        Announcement[] memory temp = new Announcement[](maxResults);
        uint256 found = 0;

        for (uint256 i = fromIndex; i < announcements.length && found < maxResults; i++) {
            if (announcements[i].viewingTag == tag) {
                temp[found] = announcements[i];
                found++;
            }
        }

        // Trim to actual size
        Announcement[] memory result = new Announcement[](found);
        for (uint256 i = 0; i < found; i++) {
            result[i] = temp[i];
        }
        return result;
    }

    /// @notice Get a recipient's stealth meta-address.
    function getMetaAddress(address user) external view returns (
        bytes memory spendingPubKey,
        bytes memory viewingPubKey
    ) {
        StealthMetaAddress storage meta = metaAddresses[user];
        if (meta.spendingPubKey.length == 0) revert NoMetaAddress();
        return (meta.spendingPubKey, meta.viewingPubKey);
    }

    /// @notice Total number of announcements.
    function announcementCount() external view returns (uint256) {
        return announcements.length;
    }
}
