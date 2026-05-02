// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";

/**
 * @title CrossAssetMixer
 * @notice Automatic cross-asset obfuscation during mixing.
 *
 * Deposit ETH → Withdraw as USDC (or any supported token).
 * The asset swap happens atomically inside the mixer, breaking
 * the link between input and output token types.
 *
 * Better than Mixero's BTC→XMR because:
 * - Fully on-chain and trustless (no external bridge)
 * - Supports ANY token pair via Uniswap V3
 * - Atomic: swap + withdraw in a single transaction
 * - Swap details are hidden by ZK proof
 *
 *  ⚠️ NOT PRODUCTION READY — `crossAssetWithdraw` does NOT verify
 *  a ZK proof (TODO at line ~114). Combined with the Uniswap path,
 *  anyone could drain whatever tokens this contract holds. The
 *  killswitch (paused = true by default) keeps the entry point
 *  fail-closed until the verifier is wired and `setPaused(false)`
 *  is called.
 */
contract CrossAssetMixer {
    // ── Types ────────────────────────────────────────────
    struct CrossAssetWithdrawal {
        bytes32 nullifierHash;
        address inputToken;   // What was deposited
        address outputToken;  // What to receive
        uint256 inputAmount;
        uint256 minOutputAmount; // Slippage protection
        address recipient;
        bool executed;
    }

    // ── State ────────────────────────────────────────────
    address public immutable uniswapRouter;
    address public immutable WETH;

    mapping(bytes32 => CrossAssetWithdrawal) public withdrawals;
    mapping(bytes32 => bool) public nullifierUsed;

    // Supported token pairs for cross-asset mixing
    mapping(address => mapping(address => bool)) public supportedPairs;
    mapping(address => bool) public supportedTokens;

    uint256 public protocolFeeBps = 100; // 1%
    address public feeRecipient;
    address public admin;

    /// Killswitch — see contract NatSpec. Fail-closed by default.
    bool public paused = true;

    uint256 public totalCrossAssetWithdrawals;

    // ── Events ───────────────────────────────────────────
    event CrossAssetWithdrawalExecuted(
        bytes32 indexed id,
        address inputToken,
        address outputToken,
        uint256 inputAmount,
        uint256 outputAmount,
        address recipient
    );
    event TokenPairAdded(address indexed tokenA, address indexed tokenB);

    // ── Constructor ──────────────────────────────────────
    constructor(address _uniswapRouter, address _weth, address _feeRecipient) {
        uniswapRouter = _uniswapRouter;
        WETH = _weth;
        feeRecipient = _feeRecipient;
        admin = msg.sender;
    }

    // ── Admin: Add supported token pairs ─────────────────
    function addTokenPair(address _tokenA, address _tokenB) external {
        require(msg.sender == admin, "Only admin");
        supportedPairs[_tokenA][_tokenB] = true;
        supportedPairs[_tokenB][_tokenA] = true;
        supportedTokens[_tokenA] = true;
        supportedTokens[_tokenB] = true;
        emit TokenPairAdded(_tokenA, _tokenB);
    }

    function setPaused(bool _paused) external {
        require(msg.sender == admin, "Only admin");
        paused = _paused;
    }

    // ── Cross-asset withdrawal ───────────────────────────
    /**
     * @notice Withdraw deposited funds as a DIFFERENT token.
     * @param _nullifierHash Nullifier from ZK proof
     * @param _inputToken Original deposited token (address(0) for ETH)
     * @param _outputToken Desired output token
     * @param _inputAmount Amount that was deposited
     * @param _minOutputAmount Minimum acceptable output (slippage protection)
     * @param _recipient Recipient address
     *
     * Flow: Prove deposit → Swap via Uniswap → Send output token to recipient
     * Chain analysis sees: deposit of ETH, withdrawal of USDC — no link possible.
     */
    function crossAssetWithdraw(
        bytes32 _nullifierHash,
        address _inputToken,
        address _outputToken,
        uint256 _inputAmount,
        uint256 _minOutputAmount,
        address _recipient
    ) external returns (bytes32 id) {
        require(!paused, "Paused: ZK verifier not wired");
        require(!nullifierUsed[_nullifierHash], "Nullifier already used");
        require(_inputToken != _outputToken, "Same token");
        require(_recipient != address(0), "Invalid recipient");
        require(_inputAmount > 0, "Zero amount");

        // Verify pair is supported (or use ETH/WETH as intermediary)
        address inputForSwap = _inputToken == address(0) ? WETH : _inputToken;
        address outputForSwap = _outputToken == address(0) ? WETH : _outputToken;
        require(
            supportedPairs[inputForSwap][outputForSwap] ||
            inputForSwap == WETH ||
            outputForSwap == WETH,
            "Unsupported pair"
        );

        // TODO: Verify ZK proof

        nullifierUsed[_nullifierHash] = true;

        // Calculate fee on input amount
        uint256 fee = (_inputAmount * protocolFeeBps) / 10000;
        uint256 swapAmount = _inputAmount - fee;

        // Execute swap via Uniswap V3
        // In production: use ISwapRouter.exactInputSingle()
        uint256 outputAmount = _executeSwap(inputForSwap, outputForSwap, swapAmount);
        require(outputAmount >= _minOutputAmount, "Slippage exceeded");

        id = keccak256(abi.encodePacked(_nullifierHash, _recipient, block.timestamp));

        withdrawals[id] = CrossAssetWithdrawal({
            nullifierHash: _nullifierHash,
            inputToken: _inputToken,
            outputToken: _outputToken,
            inputAmount: _inputAmount,
            minOutputAmount: _minOutputAmount,
            recipient: _recipient,
            executed: true
        });

        // Transfer output to recipient
        if (_outputToken == address(0)) {
            // Unwrap WETH → ETH
            (bool ok, ) = _recipient.call{value: outputAmount}("");
            require(ok, "ETH transfer failed");
        } else {
            // Check the bool — non-spec ERC-20s like USDT can return false
            // and an unchecked call would mark `executed=true` while the
            // recipient never actually received the swap output.
            require(IERC20(_outputToken).transfer(_recipient, outputAmount), "ERC20 transfer failed");
        }

        totalCrossAssetWithdrawals++;

        emit CrossAssetWithdrawalExecuted(
            id, _inputToken, _outputToken, _inputAmount, outputAmount, _recipient
        );
    }

    // ── Internal swap execution ──────────────────────────
    function _executeSwap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) internal returns (uint256 amountOut) {
        // Approve router
        IERC20(_tokenIn).approve(uniswapRouter, _amountIn);

        // Uniswap V3 exactInputSingle
        bytes memory data = abi.encodeWithSignature(
            "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))",
            _tokenIn,
            _tokenOut,
            3000, // 0.3% pool fee
            address(this),
            block.timestamp + 300,
            _amountIn,
            0, // amountOutMinimum (checked after)
            0  // sqrtPriceLimitX96
        );

        (bool success, bytes memory result) = uniswapRouter.call(data);
        require(success, "Swap failed");
        amountOut = abi.decode(result, (uint256));
    }

    // ── View helpers ─────────────────────────────────────
    function getSupportedTokens() external view returns (address[] memory) {
        // In production: maintain an enumerable set
        // Placeholder: return empty
        return new address[](0);
    }

    receive() external payable {}
}
