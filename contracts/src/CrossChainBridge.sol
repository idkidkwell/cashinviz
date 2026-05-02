// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "./Verifier.sol";

/// @title CrossChainBridge
/// @notice Enables cross-chain private transfers: deposit on Chain A, withdraw
///         on Chain B. This breaks even more tracing links than same-chain mixing.
///
///         Architecture:
///         - Each chain has a ShieldedPool + this Bridge contract
///         - Bridge listens for deposit events and relays Merkle roots cross-chain
///         - User deposits on cheap L2 (Arbitrum), withdraws on mainnet
///         - ZK proof is verified on the withdrawal chain
///
///         Uses a simple oracle/relayer pattern for root syncing.
///         In production, replace with LayerZero, Hyperlane, or Axelar for
///         trustless cross-chain messaging.
contract CrossChainBridge {
    // ── State ────────────────────────────────────────────────

    address public owner;
    /// Pending owner in the two-step ownership-transfer flow.
    address public pendingOwner;
    address public shieldedPool;

    /// Killswitch. The cross-chain proof verifier in `_verifyCrossChainProof`
    /// is a placeholder that returns true for any input. Until the real
    /// Noir-generated cross-chain verifier is deployed and wired into
    /// `crossChainVerifier`, every entry point that moves money or
    /// accepts foreign roots reverts. Owner must explicitly call
    /// `enableBridge()` after `setCrossChainVerifier()`. This prevents
    /// an accidentally-deployed bridge from being drained by anyone
    /// who passes random bytes as a proof.
    bool public bridgeEnabled;

    /// Cross-chain verifier (Noir-generated). Until set, the bridge stays
    /// disabled regardless of `bridgeEnabled` because `_verifyCrossChainProof`
    /// would otherwise fall through the placeholder.
    address public crossChainVerifier;

    /// Mapping of source chain ID → synced Merkle roots.
    /// chainId => root => isValid
    mapping(uint256 => mapping(bytes32 => bool)) public foreignRoots;

    /// Trusted relayers that can sync roots cross-chain.
    mapping(address => bool) public trustedRelayers;

    /// Nullifiers spent via cross-chain withdrawals (prevents replay).
    mapping(bytes32 => bool) public crossChainNullifiers;

    /// Chain IDs that are connected to this bridge.
    uint256[] public connectedChains;
    mapping(uint256 => bool) public isConnectedChain;

    // ── Events ───────────────────────────────────────────────

    event RootSynced(uint256 indexed sourceChain, bytes32 root, uint256 timestamp);
    event CrossChainWithdrawal(
        uint256 indexed sourceChain,
        address indexed recipient,
        bytes32 nullifierHash,
        address token,
        uint256 amount
    );
    event ChainConnected(uint256 indexed chainId);
    event RelayerUpdated(address indexed relayer, bool trusted);
    event BridgeEnabled();
    event CrossChainVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event OwnershipTransferRequested(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ── Errors ───────────────────────────────────────────────

    error NotOwner();
    error NotTrustedRelayer();
    error UnknownForeignRoot();
    error NullifierAlreadySpent();
    error InvalidProof();
    error ChainNotConnected();
    error ChainAlreadyConnected();
    error TransferFailed();
    error BridgeNotEnabled();
    error VerifierNotSet();
    error ZeroVerifier();
    error ZeroOwner();
    error NotPendingOwner();

    // ── Modifiers ────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (!trustedRelayers[msg.sender]) revert NotTrustedRelayer();
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    constructor(address _shieldedPool) {
        owner = msg.sender;
        shieldedPool = _shieldedPool;
        trustedRelayers[msg.sender] = true;
    }

    // ── Admin ────────────────────────────────────────────────

    function connectChain(uint256 chainId) external onlyOwner {
        if (isConnectedChain[chainId]) revert ChainAlreadyConnected();
        connectedChains.push(chainId);
        isConnectedChain[chainId] = true;
        emit ChainConnected(chainId);
    }

    function setRelayer(address relayer, bool trusted) external onlyOwner {
        trustedRelayers[relayer] = trusted;
        emit RelayerUpdated(relayer, trusted);
    }

    /// @notice Step 1 of two-step ownership transfer.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroOwner();
        pendingOwner = newOwner;
        emit OwnershipTransferRequested(owner, newOwner);
    }

    /// @notice Step 2 — the pending owner accepts.
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }

    /// @notice Wire the Noir cross-chain verifier. Must be called before
    ///         `enableBridge()`. address(0) is rejected — once set, the
    ///         verifier can be rotated to another non-zero address but
    ///         not unset, otherwise an attacker who compromised owner
    ///         could fall back to the placeholder verifier.
    function setCrossChainVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroVerifier();
        emit CrossChainVerifierUpdated(crossChainVerifier, _verifier);
        crossChainVerifier = _verifier;
    }

    /// @notice Open the bridge for use. One-way switch: the bridge stays
    ///         locked until the cross-chain verifier is wired AND the
    ///         operator explicitly opts in.
    function enableBridge() external onlyOwner {
        if (crossChainVerifier == address(0)) revert VerifierNotSet();
        bridgeEnabled = true;
        emit BridgeEnabled();
    }

    // ── Root syncing ─────────────────────────────────────────

    /// @notice Called by trusted relayer to sync a Merkle root from another chain.
    ///         In production, this would be called by LayerZero/Hyperlane endpoint.
    /// @param sourceChain The chain ID where the deposit was made.
    /// @param root The Merkle root from the source chain's ShieldedPool.
    function syncRoot(uint256 sourceChain, bytes32 root) external onlyRelayer {
        if (!bridgeEnabled) revert BridgeNotEnabled();
        if (!isConnectedChain[sourceChain]) revert ChainNotConnected();
        foreignRoots[sourceChain][root] = true;
        emit RootSynced(sourceChain, root, block.timestamp);
    }

    /// @notice Batch sync multiple roots at once (gas efficient).
    function syncRootsBatch(
        uint256 sourceChain,
        bytes32[] calldata roots_
    ) external onlyRelayer {
        if (!bridgeEnabled) revert BridgeNotEnabled();
        if (!isConnectedChain[sourceChain]) revert ChainNotConnected();
        for (uint256 i = 0; i < roots_.length; i++) {
            foreignRoots[sourceChain][roots_[i]] = true;
            emit RootSynced(sourceChain, roots_[i], block.timestamp);
        }
    }

    // ── Cross-chain withdrawal ───────────────────────────────

    /// @notice Withdraw funds that were deposited on another chain.
    ///         The ZK proof proves the user's commitment exists in the
    ///         source chain's Merkle tree (whose root was synced here).
    function crossChainWithdraw(
        bytes calldata proof,
        uint256 sourceChain,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        address token,
        uint256 amount,
        address payable relayer,
        uint256 relayerFee
    ) external {
        if (!bridgeEnabled) revert BridgeNotEnabled();
        if (!foreignRoots[sourceChain][root]) revert UnknownForeignRoot();
        if (crossChainNullifiers[nullifierHash]) revert NullifierAlreadySpent();
        if (!_verifyCrossChainProof(proof, sourceChain, root, nullifierHash, recipient, token, amount))
            revert InvalidProof();

        crossChainNullifiers[nullifierHash] = true;

        // Calculate protocol fee (1%)
        uint256 protocolFee = (amount * 100) / 10_000;
        uint256 payout = amount - protocolFee - relayerFee;

        if (token == address(0)) {
            // ETH
            (bool f, ) = owner.call{value: protocolFee}("");
            if (!f) revert TransferFailed();
            if (relayerFee > 0) {
                (bool r, ) = relayer.call{value: relayerFee}("");
                if (!r) revert TransferFailed();
            }
            (bool p, ) = recipient.call{value: payout}("");
            if (!p) revert TransferFailed();
        } else {
            // ERC-20
            if (!IERC20Minimal(token).transfer(owner, protocolFee)) revert TransferFailed();
            if (relayerFee > 0) {
                if (!IERC20Minimal(token).transfer(relayer, relayerFee)) revert TransferFailed();
            }
            if (!IERC20Minimal(token).transfer(recipient, payout)) revert TransferFailed();
        }

        emit CrossChainWithdrawal(sourceChain, recipient, nullifierHash, token, amount);
    }

    // ── Views ────────────────────────────────────────────────

    function isForeignRootKnown(uint256 chainId, bytes32 root) external view returns (bool) {
        return foreignRoots[chainId][root];
    }

    function getConnectedChains() external view returns (uint256[] memory) {
        return connectedChains;
    }

    // ── Proof verification placeholder ───────────────────────

    /// @dev Delegates to a Noir-generated cross-chain verifier when wired.
    ///      Public inputs are bound to (this chain id, this contract,
    ///      source chain, root, nullifierHash, recipient, token, amount)
    ///      so a proof produced for one chain or contract cannot be
    ///      replayed against another.
    ///
    ///      Combined with the `bridgeEnabled` killswitch, the bridge is
    ///      fail-closed: it cannot move funds until both the verifier
    ///      address is set AND the operator has called `enableBridge`.
    function _verifyCrossChainProof(
        bytes calldata proof,
        uint256 sourceChain,
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        address token,
        uint256 amount
    ) internal view returns (bool) {
        if (crossChainVerifier == address(0)) return false;

        bytes32[] memory publicInputs = new bytes32[](8);
        publicInputs[0] = bytes32(block.chainid);
        publicInputs[1] = bytes32(uint256(uint160(address(this))));
        publicInputs[2] = bytes32(sourceChain);
        publicInputs[3] = root;
        publicInputs[4] = nullifierHash;
        publicInputs[5] = bytes32(uint256(uint160(recipient)));
        publicInputs[6] = bytes32(uint256(uint160(token)));
        publicInputs[7] = bytes32(amount);

        return IVerifier(crossChainVerifier).verify(proof, publicInputs);
    }

    /// @notice Receive ETH for cross-chain liquidity.
    receive() external payable {}
}

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
}
