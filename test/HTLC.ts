import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("HTLC", async function () {
    // Alice 希望用 10 个 token1 交换 Bob 的 20 个 token2
    const alice_to_bob = 10;
    const bob_to_alice = 20;

    // 定义固定的 HTLC 合约，在测试中只会部署一次
    // 通过 loadFixture 函数加载
    // Hardhat 会使用类似快照的方式，确保每个测试用例都是在相同的环境下运行
    async function deployHTLCFixture() {
        // 解锁时间设为 1 年
        const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
        const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECONDS;

        // admin 为部署 token 合约的账户，进行代币分配（默认第一个）
        // Alice 和 Bob 的账户将参与哈希时间锁
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
        await token1.connect(alice).approve(htlc.getAddress(), alice_to_bob);
        await token2.connect(bob).approve(htlc.getAddress(), bob_to_alice);

        // 构造哈希
        const preImage = "0x62757a7a";
        const hashValue = hre.ethers.keccak256(preImage);

        // 实际上只在 token1 上进行了测试
        // 在 token2 上的测试完全相同
        return { htlc, token1, token2, alice, bob, admin, unlockTime, preImage, hashValue };
    }

    describe("Locking", function () {
        describe("Validation", function () {
            it("Should revert if the amount is zero", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                const illegalAmount = 0;

                // 实际上测试代码这里也可以拿到最新的区块时间戳
                // const cur_timestamp = (await hre.ethers.provider.getBlock("latest"))!.timestamp;

                await expect(htlc.connect(alice).lock(hashValue, unlockTime, illegalAmount, token1.getAddress(), bob.getAddress()))
                    .to.be.revertedWith("HTLC: amount must be greater than 0");
            });

            it("Should revert if the unlock time is in the past", async function () {
                const { htlc, token1, alice, bob, hashValue } = await loadFixture(deployHTLCFixture);
                const illegalUnlockTime = (await time.latest()) - 1;

                await expect(htlc.connect(alice).lock(hashValue, illegalUnlockTime, alice_to_bob, token1.getAddress(), bob.getAddress()))
                    .to.be.revertedWith("HTLC: unlock time must be in the future");
            });

            it("Should revert if the approver does not have enough tokens", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                const illegalAmount = 1000;

                await expect(htlc.connect(alice).lock(hashValue, unlockTime, illegalAmount, token1.getAddress(), bob.getAddress()))
                    .to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });

            it("Should revert if lock with the same hash value", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);

                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());
                await expect(htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress()))
                    .to.be.revertedWith("HTLC: lock exists");
            });

            it("Should lock the tokens", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);

                const balanceBefore = await token1.balanceOf(alice.getAddress());
                await expect(htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress()))
                    .not.to.be.reverted;

                const balanceAfter = await token1.balanceOf(alice.getAddress());
                expect(balanceAfter).to.equal(balanceBefore - BigInt(alice_to_bob));
            });
        });

        describe("Events", function () {
            it("Should emit a Locked event", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);

                await expect(htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress()))
                    .to.emit(htlc, "Locked")
                    .withArgs(hashValue, unlockTime, alice_to_bob, alice.getAddress(), token1.getAddress(), bob.getAddress());
            });
        });
    });

    describe("Unlocking", function () {
        describe("Validation", function () {
            it("Should revert if the lock does not exist", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());

                const illegalPreImage = "0x01234567";
                await expect(htlc.connect(bob).unlock(illegalPreImage))
                    .to.be.revertedWith("HTLC: lock not found");
            });

            it("Should revert if claim after unlock time", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue, preImage } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());

                await time.increase(unlockTime + 1);
                await expect(htlc.connect(bob).unlock(preImage))
                    .to.be.revertedWith("HTLC: can only claim before the unlock time");
            });

            it("Should revert if the claim sender is not the receiverAddr", async function () {
                const { htlc, token1, alice, bob, admin, unlockTime, hashValue, preImage } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());

                await expect(htlc.connect(admin).unlock(preImage))
                    .to.be.revertedWith("HTLC: can only the receiver claim");
            });

            it("Should unlock the tokens", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue, preImage } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());
                
                const balanceBefore = await token1.balanceOf(bob.getAddress());
                await expect(htlc.connect(bob).unlock(preImage))
                    .not.to.be.reverted;
                
                const balanceAfter = await token1.balanceOf(bob.getAddress());
                expect(balanceAfter).to.equal(balanceBefore + BigInt(alice_to_bob));
            });
        });

        describe("Events", function () {
            it("Should emit an Unlocked event", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue, preImage } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());

                await expect(htlc.connect(bob).unlock(preImage))
                    .to.emit(htlc, "Unlocked")
                    .withArgs(preImage, hashValue, unlockTime, alice_to_bob, alice.getAddress(), token1.getAddress(), bob.getAddress());
            });
        });
    });

    describe("Retrieve", function () {
        describe("Validation", function () {
            it("Should revert if the lock does not exist", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());

                const illegalPreImage = "0x01234567";
                const illegalHashValue = hre.ethers.keccak256(illegalPreImage);
                await expect(htlc.connect(alice).retrieve(illegalHashValue))
                    .to.be.revertedWith("HTLC: lock not found");
            });

            it("Should revert if retrieve before unlock time", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());

                await expect(htlc.connect(alice).retrieve(hashValue))
                    .to.be.revertedWith("HTLC: can only retrieve after the unlock time");
            });

            it("Should revert if the retrieve sender is not the senderAddr", async function () {
                const { htlc, token1, alice, bob, admin, unlockTime, hashValue, preImage } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());

                await time.increase(unlockTime + 1);
                await expect(htlc.connect(admin).retrieve(hashValue))
                    .to.be.revertedWith("HTLC: can only the sender retrieve");
            });

            it("Should retrieve the tokens", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());

                await time.increase(unlockTime + 1);
                const balanceBefore = await token1.balanceOf(alice.getAddress());
                await expect(htlc.connect(alice).retrieve(hashValue))
                    .not.to.be.reverted;

                const balanceAfter = await token1.balanceOf(alice.getAddress());
                expect(balanceAfter).to.equal(balanceBefore + BigInt(alice_to_bob));
            });
        });

        describe("Events", function () {
            it("Should emit a Retrieved event", async function () {
                const { htlc, token1, alice, bob, unlockTime, hashValue } = await loadFixture(deployHTLCFixture);
                await htlc.connect(alice).lock(hashValue, unlockTime, alice_to_bob, token1.getAddress(), bob.getAddress());

                await time.increase(unlockTime + 1);
                await expect(htlc.connect(alice).retrieve(hashValue))
                    .to.emit(htlc, "Retrieve")
                    .withArgs(hashValue, unlockTime, alice_to_bob, alice.getAddress(), token1.getAddress(), bob.getAddress());
            });
        });
    });
});