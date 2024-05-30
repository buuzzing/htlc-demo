import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("HTLC", async function () {
    // 定义固定的 HTLC 合约，在测试中只会部署一次
    // 通过 loadFixture 函数加载
    // Hardhat 会使用类似快照的方式，确保每个测试用例都是在相同的环境下运行
    async function deployHTLCFixture() {
        // 解锁时间设为 1 年
        const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
        const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECONDS;

        // admin 为部署 token 合约的账户，进行代币分配（默认第一个）
        // Alice 和 Bob 的账户将参与哈希时间锁
        // Alice 希望用 10 个 token1 交换 Bob 的 20 个 token2
        const [admin, alice, bob] = await hre.ethers.getSigners();

        // 部署 HTLC 合约
        const HTLC = await hre.ethers.getContractFactory("HTLC");
        const htlc = await HTLC.deploy();

        // 部署 ERC20 合约
        const ERC20 = await hre.ethers.getContractFactory("ERC20");
        const token1 = await ERC20.deploy();
        const token2 = await ERC20.deploy();

        // admin 进行代币分配
        await token1.transfer(alice.address, 100);
        await token2.transfer(bob.address, 100);

        // Alice 和 Bob 授权 HTLC 合约代币转移权限
        await token1.connect(alice).approve(htlc.getAddress(), 10);
        await token2.connect(bob).approve(htlc.getAddress(), 20);

        // 构造哈希
        const preImage = "0x62757A7A";
        const hashValue = hre.ethers.keccak256(preImage);

        return { htlc, token1, token2, alice, bob, unlockTime, preImage, hashValue };
    }

    describe("Locking", function () {
        describe("Validation", function () {
            it("Should revert if the amount is zero", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                const amount = 0;

                await expect(htlc.connect(alice).lock(hashValue, unlockTime, amount, token1.getAddress(), bob.getAddress()))
                    .to.be.revertedWith("HTLC: amount must be greater than 0");
            });

            it("Should revert if the unlock time is in the past", async function () {
                const { htlc, token1, alice, bob, hashValue } = await loadFixture(deployHTLCFixture);
                const unlockTime = (await time.latest()) - 1;
                const amount = 10;

                await expect(htlc.connect(alice).lock(hashValue, unlockTime, amount, token1.getAddress(), bob.getAddress()))
                    .to.be.revertedWith("HTLC: unlock time must be in the future");
            });

            it("Should revert if the approver does not have enough tokens", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                const amount = 1000;

                await expect(htlc.connect(alice).lock(hashValue, unlockTime, amount, token1.getAddress(), bob.getAddress()))
                    .to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });

            it("Should revert if lock with the same hash value", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                const amount = 10;

                await htlc.connect(alice).lock(hashValue, unlockTime, amount, token1.getAddress(), bob.getAddress());
                await expect(htlc.connect(alice).lock(hashValue, unlockTime, amount, token1.getAddress(), bob.getAddress()))
                    .to.be.revertedWith("HTLC: lock exists");
            });

            it("Should lock the tokens", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                const amount = 10;

                await expect(htlc.connect(alice).lock(hashValue, unlockTime, amount, token1.getAddress(), bob.getAddress()))
                    .not.to.be.reverted;
            });
        });

        describe("Events", function () {
            it("Should emit a Locked event", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                const amount = 10;

                await expect(htlc.connect(alice).lock(hashValue, unlockTime, amount, token1.getAddress(), bob.getAddress()))
                    .to.emit(htlc, "Locked")
                    .withArgs(hashValue, unlockTime, amount, alice.getAddress(), token1.getAddress(), bob.getAddress());
            });
        });
    });

});