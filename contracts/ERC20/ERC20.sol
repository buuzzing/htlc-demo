// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {IERC20} from "./IERC20.sol";

abstract contract ERC20 is IERC20 {
    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    /**
     * 设置发行量 {totalSupply}，名称 {name}，符号 {symbol}
     */
    constructor(
        uint256 totalSupply_,
        string memory name_,
        string memory symbol_
    ) {
        _totalSupply = totalSupply_;

        _name = name_;
        _symbol = symbol_;
    }

    /**
     * 返回代币的名称
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * 返回代币的符号/简称
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * 返回小数位，ERC20 标准
     */
    function decimals() public pure returns (uint8) {
        return 18;
    }

    /**
     * 返回代币的发行总量
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * 返回账户代币数量
     */
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

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
     * 返回 `spender` 可以从 `owner` 转移的代币数量
     */
    function allowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        return _allowances[owner][spender];
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
