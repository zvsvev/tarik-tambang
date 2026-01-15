// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TarikTambangOnchain.sol";
import "../src/AutoBetManager.sol";

contract DeployTarikTambang is Script {
    function run() external {
        string memory pk = vm.envString("PRIVATE_KEY");
        if (bytes(pk).length < 2 || (bytes(pk)[0] != "0") || (bytes(pk)[1] != "x")) {
            pk = string.concat("0x", pk);
        }
        uint256 deployerPrivateKey = vm.parseUint(pk);
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Game Contract
        TarikTambangOnchain game = new TarikTambangOnchain();
        console.log("TarikTambangOnchain deployed at:", address(game));

        // Deploy Manager Contract
        AutoBetManager manager = new AutoBetManager();
        console.log("AutoBetManager deployed at:", address(manager));

        vm.stopBroadcast();
    }
}
