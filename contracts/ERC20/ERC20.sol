// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {IERC20} from "./IERC20.sol";

contract ERC20 is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    /**
     * 转移代币
     *
     * - `to` 不能为 0 地址
     * - `msg.sender` 必须有足够的代币
     */
    function transfer(
        address to,
        uint256 value
    ) public override returns (bool) {
        require(to != address(0), "ERC20: transfer to the zero address");
        require(
            _balances[msg.sender] >= value,
            "ERC20: transfer amount exceeds balance"
        );

        _balances[msg.sender] -= value;
        _balances[to] += value;

        emit Transfer(msg.sender, to, value);

        return true;
    }

    /**
     * 授权代币转移
     *
     * - `spender` 不能为 0 地址
     * - `spender` 不能是自己
     */
    function approve(
        address spender,
        uint256 value
    ) public override returns (bool) {
        require(spender != address(0), "ERC20: approve to the zero address");
        require(msg.sender != spender, "ERC20: approve to the owner");

        _allowances[msg.sender][spender] = value;

        emit Approval(msg.sender, spender, value);

        return true;
    }

    /**
     * 代币转移
     *
     * - `from` 和 `to` 不能为 0 地址
     * - `from` 必须有足够的代币
     * - `from` 必须授权 `msg.sender` 足够转移的代币
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public override returns (bool) {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(
            _balances[from] >= value,
            "ERC20: transfer amount exceeds balance"
        );
        require(
            _allowances[from][msg.sender] >= value,
            "ERC20: transfer amount exceeds allowances"
        );

        _balances[from] -= value;
        _balances[to] += value;
        _allowances[from][msg.sender] -= value;

        emit Transfer(from, to, value);

        return true;
    }
}
