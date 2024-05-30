# htlc-demo

## 测试框架

[Hardhat](https://hardhat.org/) 作为测试框架，[Mocha](https://mochajs.org/) 作为测试器，使用 [Chai](https://www.chaijs.com/) 作断言

**TL;DR**

Hardhat 自带一个 Hardhat Network，运行测试可以自动编译部署合约，既不用管 solc，也不用管 geth

Hardhat Network 提供了数个账户，随意选用

Hardhat 测试出错的提示非常友好，举个栗子

```
# 抛出的事件不存在
1) HTLC
    Retrieve
        Events
        Should emit a Retrieved event:
    AssertionError: Event "Retrieved" doesn't exist in the contract
    at onSuccess (node_modules/@nomicfoundation/hardhat-chai-matchers/src/internal/emit.ts:77:17)
    at /home/buzzing/Github/htlc-demo/node_modules/@nomicfoundation/hardhat-chai-matchers/src/internal/emit.ts:127:20
    at async Context.<anonymous> (test/HTLC.ts:210:17)

# 抛出的事件值不符合期望
1) HTLC
    Unlocking
        Events
        Should emit an Unlocked event:

    AssertionError: Error in "Unlocked" event: Error in the 1st argument assertion: expected '0x62757a7a' to equal '0x62757A7A'
    + expected - actual

    -0x62757a7a
    +0x62757A7A
    
    at async Context.<anonymous> (test/HTLC.ts:144:17)
```

编写 Hardhat 测试代码时，调用合约代码就像调用一个 js 函数一样简单

非常有用的是：Hardhat 框架提供了一个 console 包可以在合约代码中使用，在测试过程中 `console.log` 可以让你在合约中向控制台直接输出值

## 环境

```
Node.js >= 16.0
```

## Hardhat 项目结构

`contracts`：合约文件夹，里面可以随意创建子文件夹和 import，测试文件那边使用合约名进行调用

`test`：测试代码文件夹，执行 `npx hardhat test` 将会执行这下面的代码，使用的是 `Mocha` 的风格

`hardhat.config.ts`：自动生成的，项目配置文件，指定了 `solidity` 的版本

`package.json` 和 `package-lock.json`：自动生成的，Node 项目依赖包

`tsconfig.json`：自动生成的，TypeScript 项目配置文件，提供给 Node 的编译选项

## 启动

环境搭建

``` shell
npm install
```

运行测试（会自动编译合约）

``` shell
npx hardhat test
```

编译合约

``` shell
npx hardhat compile
```

## 参考

[Hardhat 中文文档](https://learnblockchain.cn/docs/hardhat/tutorial/)

[Github: eth-htlc](https://github.com/hgrano/eth-htlc/)