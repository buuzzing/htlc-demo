// SPDX-License-Identifier: MIT
// Ref: https://eips.ethereum.org/EIPS/eip-20/
// Ref: https://github.com/OpenZeppelin/openzeppelin-contracts/
// Ref: https://docs.openzeppelin.com/contracts/5.x/
// 仅实现 HTLC 需要的部分 ERC20 标准

pragma solidity ^0.8.24;

interface IERC20 {
    /**
     * `from` 向 `to` 转移 `value` 个代币
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * `owner` 授权 `spender` 可以转移 `value` 个代币
     * `value` 是新的授权值
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * `owner` 拥有的代币数量
     */
    function balanceOf(address owner) external view returns (uint256);

    /**
     * `msg.sender` 向 `to` 转移 `value` 个代币
     *
     * 返回转移操作是否成功
     *
     * 触发 {Transfer} 事件
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * `msg.sender` 授权 `spender` 可以转移 `value` 个代币
     *
     * 返回授权操作是否成功
     *
     * 触发 {Approval} 事件
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * `spender` 转移 `value` 个代币给 `to`
     *
     * 返回转移操作是否成功
     *
     * 触发 {Transfer} 事件
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}
