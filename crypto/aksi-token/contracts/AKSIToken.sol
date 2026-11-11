// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title AKSI
/// @notice Fixed-supply ERC-20 token for the AKSI MATRIX ecosystem.
/// @dev The full supply is minted once to the deployer. There is no owner,
///      admin, mint, pause, blacklist, or upgrade function.
contract AKSIToken is ERC20 {
    error ZeroInitialSupply();

    constructor(uint256 initialSupplyWholeTokens) ERC20("AKSI", "AKSI") {
        if (initialSupplyWholeTokens == 0) revert ZeroInitialSupply();
        _mint(msg.sender, initialSupplyWholeTokens * 10 ** decimals());
    }
}
