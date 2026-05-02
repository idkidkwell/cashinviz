// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Mixer} from "./Mixer.sol";
import {ERC20Mixer} from "./ERC20Mixer.sol";
import {ShieldedPool} from "./ShieldedPool.sol";

/// @title MixerFactory
/// @notice Deploys all mixer contracts:
///         - ETH pools (fixed denomination)
///         - ERC-20 pools (fixed denomination per token)
///         - ShieldedPool (unified, variable amount, multi-token)
contract MixerFactory {
    // ── State ────────────────────────────────────────────────

    address public owner;

    /// ETH denomination → Mixer address
    mapping(uint256 => address) public ethMixers;
    uint256[] public ethDenominations;

    /// token address → denomination → ERC20Mixer address
    mapping(address => mapping(uint256 => address)) public tokenMixers;

    /// The unified shielded pool
    address public shieldedPool;

    // ── Events ───────────────────────────────────────────────

    event ETHPoolCreated(uint256 indexed denomination, address mixer);
    event TokenPoolCreated(address indexed token, uint256 indexed denomination, address mixer);
    event ShieldedPoolCreated(address pool);

    // ── Errors ───────────────────────────────────────────────

    error NotOwner();
    error PoolAlreadyExists();
    error ShieldedPoolAlreadyDeployed();

    // ── Constructor ──────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── ETH pool management ──────────────────────────────────

    function createETHPool(uint256 _denomination) external returns (address) {
        if (msg.sender != owner) revert NotOwner();
        if (ethMixers[_denomination] != address(0)) revert PoolAlreadyExists();

        Mixer mixer = new Mixer(_denomination, owner);
        ethMixers[_denomination] = address(mixer);
        ethDenominations.push(_denomination);

        emit ETHPoolCreated(_denomination, address(mixer));
        return address(mixer);
    }

    function createDefaultETHPools() external {
        if (msg.sender != owner) revert NotOwner();

        uint256[4] memory defaults = [uint256(0.1 ether), 1 ether, 10 ether, 100 ether];
        for (uint256 i = 0; i < defaults.length; i++) {
            if (ethMixers[defaults[i]] == address(0)) {
                Mixer mixer = new Mixer(defaults[i], owner);
                ethMixers[defaults[i]] = address(mixer);
                ethDenominations.push(defaults[i]);
                emit ETHPoolCreated(defaults[i], address(mixer));
            }
        }
    }

    // ── ERC-20 pool management ───────────────────────────────

    function createTokenPool(
        address _token,
        uint256 _denomination
    ) external returns (address) {
        if (msg.sender != owner) revert NotOwner();
        if (tokenMixers[_token][_denomination] != address(0)) revert PoolAlreadyExists();

        ERC20Mixer mixer = new ERC20Mixer(_token, _denomination, owner);
        tokenMixers[_token][_denomination] = address(mixer);

        emit TokenPoolCreated(_token, _denomination, address(mixer));
        return address(mixer);
    }

    // ── Shielded pool ────────────────────────────────────────

    function deployShieldedPool() external returns (address) {
        if (msg.sender != owner) revert NotOwner();
        if (shieldedPool != address(0)) revert ShieldedPoolAlreadyDeployed();

        // Pass `owner` (the deployer) — NOT `address(this)`. If the
        // factory becomes the pool's owner, the deployer can't wire
        // the verifier or whitelist tokens without doing it through
        // a factory-level proxy. Mirrors how createETHPool / createTokenPool
        // hand ownership to the deployer too.
        ShieldedPool pool = new ShieldedPool(owner);
        shieldedPool = address(pool);

        emit ShieldedPoolCreated(address(pool));
        return address(pool);
    }

    // ── Views ────────────────────────────────────────────────

    function getETHPool(uint256 _denomination) external view returns (address) {
        return ethMixers[_denomination];
    }

    function getTokenPool(address _token, uint256 _denomination) external view returns (address) {
        return tokenMixers[_token][_denomination];
    }

    function getETHDenominations() external view returns (uint256[] memory) {
        return ethDenominations;
    }
}
