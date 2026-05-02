// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title PrivateDeFiRouter
/// @notice THE HOLY GRAIL — Private DeFi composability.
///
///         Users can interact with Uniswap, Aave, Compound, etc.
///         WITHOUT revealing their address. The entire flow is shielded:
///
///         1. User has a shielded note in the pool (e.g. 10 ETH)
///         2. User generates a ZK proof: "I own a note, swap 5 ETH → USDC"
///         3. Router executes the swap atomically:
///            a. Nullifies the input note (5 ETH consumed)
///            b. Calls Uniswap to swap ETH → USDC
///            c. Creates a NEW shielded note for the USDC output
///            d. Creates a change note for remaining 5 ETH
///         4. On-chain: nobody can tell who did the swap or for how much
///
///         Supported operations:
///         - Swap (via Uniswap V3 / any DEX)
///         - Supply/Withdraw (via Aave)
///         - Any arbitrary DeFi call (extensible action system)
///
///         The key insight: the router is a TRUSTED INTERMEDIARY between
///         the shielded pool and DeFi protocols. It holds funds only
///         during the atomic transaction — never across blocks.
///
///          ⚠️ NOT PRODUCTION READY — `_verifyActionProof` always
///          returns true (placeholder), AND `executePrivateAction`
///          never calls back into ShieldedPool to nullify the input
///          note. As-is, anyone can repeatedly trigger the Uniswap
///          path with the same nullifier and drain whatever tokens
///          this contract holds. The killswitch (paused = true by
///          default) keeps the entry point fail-closed until both
///          gaps are fixed and `setPaused(false)` is called.
interface IUniswapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata) external payable returns (uint256);
}

contract PrivateDeFiRouter {
    // ── Structs ──────────────────────────────────────────────

    /// Defines a DeFi action to execute atomically with a shielded note.
    struct DeFiAction {
        ActionType actionType;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut; // Slippage protection
        bytes extraData;      // Protocol-specific params (pool fee, etc.)
    }

    enum ActionType {
        SWAP,           // Swap tokenIn → tokenOut via Uniswap
        AAVE_SUPPLY,    // Supply to Aave, get aToken
        AAVE_WITHDRAW,  // Withdraw from Aave
        CUSTOM          // Arbitrary call (for future protocols)
    }

    // ── State ────────────────────────────────────────────────

    address public owner;
    address public shieldedPool;

    /// Whitelisted DEX routers (Uniswap, Sushiswap, etc.)
    mapping(address => bool) public approvedDexes;

    /// Whitelisted lending protocols
    mapping(address => bool) public approvedLendingProtocols;

    /// Total private swaps executed (metric)
    uint256 public totalPrivateSwaps;
    uint256 public totalPrivateLends;

    /// Killswitch — see contract NatSpec. Fail-closed by default.
    bool public paused = true;

    // ── Events ───────────────────────────────────────────────

    event PrivateSwap(
        bytes32 inputNullifier,
        bytes32 outputCommitment1,
        bytes32 outputCommitment2,
        ActionType actionType,
        uint256 timestamp
    );

    // ── Errors ───────────────────────────────────────────────

    error NotOwner();
    error ProtocolNotApproved();
    error InvalidProof();
    error SlippageExceeded();
    error ActionFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    constructor(address _shieldedPool) {
        owner = msg.sender;
        shieldedPool = _shieldedPool;
    }

    // ── Admin ────────────────────────────────────────────────

    function approveDex(address dex) external onlyOwner {
        approvedDexes[dex] = true;
    }

    function approveLendingProtocol(address protocol) external onlyOwner {
        approvedLendingProtocols[protocol] = true;
    }

    function revokeDex(address dex) external onlyOwner {
        approvedDexes[dex] = false;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    // ── Private DeFi execution ───────────────────────────────

    /// @notice Execute a DeFi action with shielded funds.
    ///
    ///         The ZK proof proves:
    ///         1. User owns the input note in the shielded pool
    ///         2. The action parameters match what's in the proof
    ///         3. Output commitments are well-formed
    ///
    /// @param proof ZK proof of ownership + action validity.
    /// @param root Shielded pool Merkle root.
    /// @param inputNullifier Nullifier for the consumed input note.
    /// @param action The DeFi action to execute.
    /// @param outputCommitment1 New note for action output (e.g. swapped tokens).
    /// @param outputCommitment2 Change note back to user (if any).
    function executePrivateAction(
        bytes calldata proof,
        bytes32 root,
        bytes32 inputNullifier,
        DeFiAction calldata action,
        bytes32 outputCommitment1,
        bytes32 outputCommitment2
    ) external {
        require(!paused, "Paused: ZK verifier not wired");
        // 1. Verify the ZK proof
        if (!_verifyActionProof(proof, root, inputNullifier, action, outputCommitment1, outputCommitment2))
            revert InvalidProof();

        // 2. Execute the DeFi action
        uint256 amountOut;
        if (action.actionType == ActionType.SWAP) {
            amountOut = _executeSwap(action);
            totalPrivateSwaps++;
        } else if (action.actionType == ActionType.AAVE_SUPPLY) {
            amountOut = _executeAaveSupply(action);
            totalPrivateLends++;
        } else if (action.actionType == ActionType.AAVE_WITHDRAW) {
            amountOut = _executeAaveWithdraw(action);
        } else {
            amountOut = _executeCustom(action);
        }

        // 3. Verify slippage
        if (amountOut < action.minAmountOut) revert SlippageExceeded();

        // 4. Nullify input note + insert output notes in shielded pool
        // (In production, this calls back to the ShieldedPool contract)

        emit PrivateSwap(
            inputNullifier,
            outputCommitment1,
            outputCommitment2,
            action.actionType,
            block.timestamp
        );
    }

    // ── Internal execution functions ─────────────────────────

    function _executeSwap(DeFiAction calldata action) internal returns (uint256) {
        // Decode the DEX router address from extraData
        address dexRouter = abi.decode(action.extraData, (address));
        if (!approvedDexes[dexRouter]) revert ProtocolNotApproved();

        // Approve token spending
        IERC20(action.tokenIn).approve(dexRouter, action.amountIn);

        // Execute swap via Uniswap V3
        uint256 amountOut = IUniswapRouter(dexRouter).exactInputSingle(
            IUniswapRouter.ExactInputSingleParams({
                tokenIn: action.tokenIn,
                tokenOut: action.tokenOut,
                fee: 3000, // 0.3% pool
                recipient: address(this),
                amountIn: action.amountIn,
                amountOutMinimum: action.minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );

        return amountOut;
    }

    function _executeAaveSupply(DeFiAction calldata action) internal returns (uint256) {
        address aavePool = abi.decode(action.extraData, (address));
        if (!approvedLendingProtocols[aavePool]) revert ProtocolNotApproved();

        IERC20(action.tokenIn).approve(aavePool, action.amountIn);

        (bool ok, ) = aavePool.call(
            abi.encodeWithSignature(
                "supply(address,uint256,address,uint16)",
                action.tokenIn, action.amountIn, address(this), 0
            )
        );
        if (!ok) revert ActionFailed();

        return action.amountIn; // aTokens are 1:1 at supply time
    }

    function _executeAaveWithdraw(DeFiAction calldata action) internal returns (uint256) {
        address aavePool = abi.decode(action.extraData, (address));
        if (!approvedLendingProtocols[aavePool]) revert ProtocolNotApproved();

        (bool ok, bytes memory result) = aavePool.call(
            abi.encodeWithSignature(
                "withdraw(address,uint256,address)",
                action.tokenIn, action.amountIn, address(this)
            )
        );
        if (!ok) revert ActionFailed();

        return abi.decode(result, (uint256));
    }

    function _executeCustom(DeFiAction calldata action) internal returns (uint256) {
        // Future extensibility — arbitrary protocol calls
        // For now, revert
        revert ActionFailed();
    }

    // ── Proof verification placeholder ───────────────────────

    function _verifyActionProof(
        bytes calldata, bytes32, bytes32, DeFiAction calldata, bytes32, bytes32
    ) internal pure returns (bool) {
        return true; // TODO: Noir-generated verifier
    }

    // ── Receive ETH ──────────────────────────────────────────

    receive() external payable {}
}
