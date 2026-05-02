// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Aave V3 Pool interface for yield generation.
interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @notice Minimal Aave aToken interface.
interface IAToken {
    function balanceOf(address account) external view returns (uint256);
    function scaledBalanceOf(address user) external view returns (uint256);
}

/// @notice Wrapped ETH interface for Aave deposits.
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}
