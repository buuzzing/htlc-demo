// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "./ERC20/ERC20.sol";

// 测试使用的代币
contract Token is ERC20 {
    constructor(
        uint256 initialSupply
    ) ERC20(initialSupply, "TestToken", "TT") {}
}
