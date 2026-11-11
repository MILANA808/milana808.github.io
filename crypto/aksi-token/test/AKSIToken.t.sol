// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AKSIToken} from "../contracts/AKSIToken.sol";

contract AKSITokenTest is Test {
    AKSIToken internal token;
    address internal founder = address(0xA11CE);
    address internal user = address(0xB0B);

    function setUp() public {
        vm.prank(founder);
        token = new AKSIToken(100_000_000);
    }

    function testMetadata() public view {
        assertEq(token.name(), "AKSI");
        assertEq(token.symbol(), "AKSI");
        assertEq(token.decimals(), 18);
    }

    function testInitialSupplyMintedOnlyToDeployer() public view {
        assertEq(token.totalSupply(), 100_000_000 ether);
        assertEq(token.balanceOf(founder), 100_000_000 ether);
        assertEq(token.balanceOf(user), 0);
    }

    function testTransfer() public {
        vm.prank(founder);
        token.transfer(user, 125 ether);
        assertEq(token.balanceOf(user), 125 ether);
        assertEq(token.balanceOf(founder), 99_999_875 ether);
    }

    function testZeroSupplyRejected() public {
        vm.expectRevert(AKSIToken.ZeroInitialSupply.selector);
        new AKSIToken(0);
    }
}
