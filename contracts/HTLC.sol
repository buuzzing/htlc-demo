// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// use console.log to print a log in the terminal when running tests
// import "hardhat/console.sol";

import {IERC20} from "./ERC20/IERC20.sol";

contract HTLC {
    struct Lock {
        uint unlockTime;
        uint amount;
        address senderAddr;
        address tokenAddr;
        address receiverAddr;
    }

    mapping(bytes32 => Lock) public locks;

    /**
     * 成功锁定代币后触发 Locked 事件
     */
    event Locked(
        bytes32 indexed hashValue,
        uint unlockTime,
        uint amount,
        address senderAddr,
        address tokenAddr,
        address receiverAddr
    );

    /**
     * 成功解锁代币后触发 Unlocked 事件
     */
    event Unlocked(
        bytes preImage,
        bytes32 indexed hashValue,
        uint unlockTime,
        uint amount,
        address senderAddr,
        address tokenAddr,
        address receiverAddr
    );

    /**
     * 超时成功取回代币后触发 Retrieve 事件
     */
    event Retrieve(
        bytes32 indexed hashValue,
        uint unlockTime,
        uint amount,
        address senderAddr,
        address tokenAddr,
        address receiverAddr
    );

    /**
     * 用户指定 `hashValue`，`unlockTime` 和 `receiverAddr`
     * 并将 `amount` 数量 `tokenAddr` 上的代币锁定在合约中
     *
     * - 必须使用新的 `hashValue`（新的哈希时间锁交易）
     * - 锁定的资产 `amount` 必须大于 0
     * - `unlockTime` 必须在未来
     *
     * 触发 {Locked} 事件
     */
    function lock(
        bytes32 hashValue,
        uint unlockTime,
        uint amount,
        address tokenAddr,
        address receiverAddr
    ) external {
        require(locks[hashValue].unlockTime == 0, "HTLC: lock exists");
        require(amount > 0, "HTLC: amount must be greater than 0");
        require(
            unlockTime > block.timestamp,
            "HTLC: unlock time must be in the future"
        );

        // 实例化 ERC20 代币合约
        IERC20 token = IERC20(tokenAddr);

        // 尝试锁定代币
        // 如果发生错误，事件实际上是由 ERC20 代币合约触发的
        // 不会执行输出下面这行错误语句
        // 在 unlock 和 retrieve 函数中也是一样
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "HTLC: ERC20 token transfer failed when locking"
        );

        // 只有成功锁定代币后，才会更新锁定状态
        locks[hashValue] = Lock(
            unlockTime,
            amount,
            msg.sender,
            tokenAddr,
            receiverAddr
        );

        emit Locked(
            hashValue,
            unlockTime,
            amount,
            msg.sender,
            tokenAddr,
            receiverAddr
        );
    }

    /**
     * 限定时间内，用户提供 `preImage` 解锁其 `hashValue` 对应的代币
     * 
     * - `preImage` 必须是（某个/正确的） `hashValue` 的原像
     * - 只有 `receiverAddr` 可以解锁代币
     * 
     * 触发 {Unlocked} 事件
     */
    function unlock(bytes calldata preImage) external {
        bytes32 hashValue = keccak256(preImage);
        Lock storage l = locks[hashValue];
        require(l.unlockTime > 0, "HTLC: lock not found");

        require(
            block.timestamp < l.unlockTime,
            "HTLC: can only claim before the unlock time"
        );
        require(
            msg.sender == l.receiverAddr,
            "HTLC: can only the receiver claim"
        );

        // 实例化 ERC20 代币合约
        IERC20 token = IERC20(l.tokenAddr);

        // 尝试解锁代币
        require(
            token.transfer(msg.sender, l.amount),
            "HTLC: ERC20 token transfer failed when claiming"
        );

        emit Unlocked(
            preImage,
            hashValue,
            l.unlockTime,
            l.amount,
            l.senderAddr,
            l.tokenAddr,
            l.receiverAddr
        );

        // 只有成功解锁代币后，才会删除锁定状态
        delete locks[hashValue];
    }

    /**
     * 超时后，用户提供 `hashValue` 取回其对应的代币
     * 
     * - 必须在 `unlockTime` 之后
     * - 只有 `senderAddr` 可以取回代币
     * 
     * 触发 {Retrieve} 事件
     */
    function retrieve(bytes32 hashValue) external {
        Lock storage l = locks[hashValue];
        require(l.unlockTime > 0, "HTLC: lock not found");

        require(
            block.timestamp >= l.unlockTime,
            "HTLC: can only retrieve after the unlock time"
        );
        require(
            msg.sender == l.senderAddr,
            "HTLC: can only the sender retrieve"
        );

        // 实例化 ERC20 代币合约
        IERC20 token = IERC20(l.tokenAddr);

        // 尝试取回代币
        require(
            token.transfer(msg.sender, l.amount),
            "HTLC: ERC20 token transfer failed when retrieving"
        );

        emit Retrieve(
            hashValue,
            l.unlockTime,
            l.amount,
            l.senderAddr,
            l.tokenAddr,
            l.receiverAddr
        );

        // 只有成功取回代币后，才会删除锁定状态
        delete locks[hashValue];
    }
}
