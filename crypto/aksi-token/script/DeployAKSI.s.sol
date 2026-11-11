// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {AKSIToken} from "../contracts/AKSIToken.sol";

contract DeployAKSI is Script {
    function run() external returns (AKSIToken token) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 initialSupply = vm.envUint("AKSI_INITIAL_SUPPLY");
        uint256 expectedChainId = vm.envUint("EXPECTED_CHAIN_ID");
        require(block.chainid == expectedChainId, "Unexpected deployment chain");

        vm.startBroadcast(deployerKey);
        token = new AKSIToken(initialSupply);
        vm.stopBroadcast();
    }
}
