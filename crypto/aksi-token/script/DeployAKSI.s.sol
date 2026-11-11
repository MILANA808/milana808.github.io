// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {AKSIToken} from "../contracts/AKSIToken.sol";

contract DeployAKSI is Script {
    function run() external returns (AKSIToken token) {
        address deployer = vm.envAddress("AKSI_DEPLOYER");
        uint256 initialSupply = vm.envUint("AKSI_INITIAL_SUPPLY");
        uint256 expectedChainId = vm.envUint("EXPECTED_CHAIN_ID");
        require(deployer != address(0), "Invalid deployer address");
        require(block.chainid == expectedChainId, "Unexpected deployment chain");

        // Sign with a hardware wallet or Foundry keystore via --ledger / --account.
        vm.startBroadcast(deployer);
        token = new AKSIToken(initialSupply);
        vm.stopBroadcast();
    }
}
