import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

// Mirrors the Status / ReleaseMode enums in contracts/PoolEscrow.sol.
const Status = { Open: 0n, Released: 1n, Refunded: 2n };
const Mode = { ThresholdOrDeadline: 0, ThresholdOnly: 1, DeadlineOnly: 2 };

const DAY = 24 * 60 * 60;
const usdc = (n: string) => ethers.parseEther(n); // Arc native USDC has 18 decimals

async function deploy() {
  const [platform, recipient, alice, bob, stranger] = await ethers.getSigners();
  const escrow = await (await ethers.getContractFactory("PoolEscrow")).deploy();
  await escrow.waitForDeployment();
  return { escrow, platform, recipient, alice, bob, stranger };
}

async function createPool(
  escrow: Awaited<ReturnType<typeof deploy>>["escrow"],
  recipient: string,
  target: bigint,
  mode: number,
  durationSecs = 7 * DAY
) {
  const deadline = BigInt((await time.latest()) + durationSecs);
  const poolId = await escrow.nextPoolId();
  await escrow.createPool(target, deadline, recipient, mode);
  return { poolId, deadline };
}

describe("PoolEscrow", () => {
  describe("createPool", () => {
    it("stores the pool and emits PoolCreated with sequential ids", async () => {
      const { escrow, recipient } = await deploy();
      const deadline = BigInt((await time.latest()) + DAY);

      await expect(escrow.createPool(usdc("100"), deadline, recipient.address, Mode.ThresholdOnly))
        .to.emit(escrow, "PoolCreated")
        .withArgs(0n, recipient.address, usdc("100"), deadline);
      await escrow.createPool(usdc("5"), deadline, recipient.address, Mode.ThresholdOnly);

      const pool = await escrow.getPool(0);
      expect(pool.recipient).to.equal(recipient.address);
      expect(pool.targetAmount).to.equal(usdc("100"));
      expect(pool.currentAmount).to.equal(0n);
      expect(pool.deadline).to.equal(deadline);
      expect(pool.status).to.equal(Status.Open);
      expect(pool.releaseMode).to.equal(BigInt(Mode.ThresholdOnly));
      expect(await escrow.nextPoolId()).to.equal(2n);
    });

    it("rejects a zero target, a past deadline, or a missing recipient", async () => {
      const { escrow, recipient } = await deploy();
      const now = BigInt(await time.latest());

      await expect(escrow.createPool(0, now + 100n, recipient.address, 0)).to.be.revertedWith("target must be > 0");
      await expect(escrow.createPool(usdc("1"), now, recipient.address, 0)).to.be.revertedWith("deadline must be future");
      await expect(escrow.createPool(usdc("1"), now + 100n, ethers.ZeroAddress, 0)).to.be.revertedWith("recipient required");
    });
  });

  describe("contribute", () => {
    it("records each contribution, tracks progress, and holds the funds in the contract", async () => {
      const { escrow, recipient, alice, bob } = await deploy();
      const { poolId } = await createPool(escrow, recipient.address, usdc("100"), Mode.ThresholdOnly);

      await expect(escrow.connect(alice).contribute(poolId, { value: usdc("30") }))
        .to.emit(escrow, "Contributed")
        .withArgs(poolId, alice.address, usdc("30"));
      await escrow.connect(bob).contribute(poolId, { value: usdc("20") });
      await escrow.connect(alice).contribute(poolId, { value: usdc("5") });

      expect(await escrow.contributions(poolId, alice.address)).to.equal(usdc("35"));
      expect(await escrow.contributions(poolId, bob.address)).to.equal(usdc("20"));
      expect((await escrow.getPool(poolId)).currentAmount).to.equal(usdc("55"));
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(usdc("55"));
    });

    it("keeps each pool's funds separate", async () => {
      const { escrow, recipient, alice } = await deploy();
      const a = await createPool(escrow, recipient.address, usdc("10"), Mode.ThresholdOnly);
      const b = await createPool(escrow, recipient.address, usdc("10"), Mode.ThresholdOnly);

      await escrow.connect(alice).contribute(a.poolId, { value: usdc("4") });
      await escrow.connect(alice).contribute(b.poolId, { value: usdc("6") });

      expect((await escrow.getPool(a.poolId)).currentAmount).to.equal(usdc("4"));
      expect((await escrow.getPool(b.poolId)).currentAmount).to.equal(usdc("6"));
    });

    it("rejects zero amounts, unknown pools, and contributions at or after the deadline", async () => {
      const { escrow, recipient, alice } = await deploy();
      const { poolId, deadline } = await createPool(escrow, recipient.address, usdc("10"), Mode.ThresholdOnly);

      await expect(escrow.connect(alice).contribute(poolId, { value: 0 })).to.be.revertedWith("amount must be > 0");
      await expect(escrow.connect(alice).contribute(99, { value: usdc("1") })).to.be.revertedWith("pool does not exist");

      await time.increaseTo(deadline);
      await expect(escrow.connect(alice).contribute(poolId, { value: usdc("1") })).to.be.revertedWith(
        "pool deadline passed"
      );
    });

    it("rejects contributions once a pool has been released", async () => {
      const { escrow, recipient, alice } = await deploy();
      const { poolId } = await createPool(escrow, recipient.address, usdc("10"), Mode.ThresholdOnly);
      await escrow.connect(alice).contribute(poolId, { value: usdc("10") });
      await escrow.checkAndRelease(poolId);

      await expect(escrow.connect(alice).contribute(poolId, { value: usdc("1") })).to.be.revertedWith("pool not open");
    });

    it("rejects plain transfers that don't go through contribute()", async () => {
      const { escrow, alice } = await deploy();
      await expect(alice.sendTransaction({ to: await escrow.getAddress(), value: usdc("1") })).to.be.reverted;
    });
  });

  describe("release when the target is reached", () => {
    for (const [name, mode] of [
      ["ThresholdOnly", Mode.ThresholdOnly],
      ["ThresholdOrDeadline", Mode.ThresholdOrDeadline],
    ] as const) {
      it(`${name}: releases everything raised to the recipient as soon as the target is met`, async () => {
        const { escrow, recipient, alice, bob, stranger } = await deploy();
        const { poolId } = await createPool(escrow, recipient.address, usdc("50"), mode);
        await escrow.connect(alice).contribute(poolId, { value: usdc("30") });

        await expect(escrow.checkAndRelease(poolId)).to.be.revertedWith("conditions not met");

        await escrow.connect(bob).contribute(poolId, { value: usdc("25") });
        const before = await ethers.provider.getBalance(recipient.address);

        // Anyone can trigger it — the contract enforces the rule, not the caller.
        await expect(escrow.connect(stranger).checkAndRelease(poolId))
          .to.emit(escrow, "Released")
          .withArgs(poolId, recipient.address, usdc("55"));

        expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + usdc("55"));
        expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
        const pool = await escrow.getPool(poolId);
        expect(pool.status).to.equal(Status.Released);
        expect(pool.currentAmount).to.equal(usdc("55"));
      });
    }

    it("DeadlineOnly: does not release early even when the target is met", async () => {
      const { escrow, recipient, alice } = await deploy();
      const { poolId, deadline } = await createPool(escrow, recipient.address, usdc("10"), Mode.DeadlineOnly);
      await escrow.connect(alice).contribute(poolId, { value: usdc("20") });

      await expect(escrow.checkAndRelease(poolId)).to.be.revertedWith("before deadline");

      await time.increaseTo(deadline);
      await expect(escrow.checkAndRelease(poolId)).to.emit(escrow, "Released").withArgs(poolId, recipient.address, usdc("20"));
    });

    it("only pays out once", async () => {
      const { escrow, recipient, alice } = await deploy();
      const { poolId } = await createPool(escrow, recipient.address, usdc("10"), Mode.ThresholdOnly);
      await escrow.connect(alice).contribute(poolId, { value: usdc("10") });
      await escrow.checkAndRelease(poolId);

      await expect(escrow.checkAndRelease(poolId)).to.be.revertedWith("pool not open");
    });
  });

  describe("deadline without reaching the target", () => {
    it("ThresholdOrDeadline and DeadlineOnly: release whatever was raised", async () => {
      for (const mode of [Mode.ThresholdOrDeadline, Mode.DeadlineOnly]) {
        const { escrow, recipient, alice } = await deploy();
        const { poolId, deadline } = await createPool(escrow, recipient.address, usdc("100"), mode);
        await escrow.connect(alice).contribute(poolId, { value: usdc("40") });

        await time.increaseTo(deadline);
        await expect(escrow.checkAndRelease(poolId)).to.emit(escrow, "Released").withArgs(poolId, recipient.address, usdc("40"));
      }
    });

    it("ThresholdOnly: becomes refundable and pays nothing to the recipient", async () => {
      const { escrow, recipient, alice, bob } = await deploy();
      const { poolId, deadline } = await createPool(escrow, recipient.address, usdc("100"), Mode.ThresholdOnly);
      await escrow.connect(alice).contribute(poolId, { value: usdc("30") });
      await escrow.connect(bob).contribute(poolId, { value: usdc("10") });
      const recipientBefore = await ethers.provider.getBalance(recipient.address);

      await time.increaseTo(deadline);
      await expect(escrow.checkAndRelease(poolId)).to.emit(escrow, "Refundable").withArgs(poolId);

      expect((await escrow.getPool(poolId)).status).to.equal(Status.Refunded);
      expect(await ethers.provider.getBalance(recipient.address)).to.equal(recipientBefore);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(usdc("40"));
    });
  });

  describe("refund", () => {
    async function refundablePool() {
      const ctx = await deploy();
      const { escrow, recipient, alice, bob } = ctx;
      const { poolId, deadline } = await createPool(escrow, recipient.address, usdc("100"), Mode.ThresholdOnly);
      await escrow.connect(alice).contribute(poolId, { value: usdc("30") });
      await escrow.connect(bob).contribute(poolId, { value: usdc("10") });
      await time.increaseTo(deadline);
      await escrow.checkAndRelease(poolId);
      return { ...ctx, poolId };
    }

    it("returns exactly each contributor's own contribution", async () => {
      const { escrow, alice, bob, poolId } = await refundablePool();

      await expect(escrow.connect(alice).refund(poolId)).to.changeEtherBalances(
        [alice, escrow],
        [usdc("30"), -usdc("30")]
      );
      await expect(escrow.connect(bob).refund(poolId))
        .to.emit(escrow, "Refunded")
        .withArgs(poolId, bob.address, usdc("10"));

      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
      expect(await escrow.contributions(poolId, alice.address)).to.equal(0n);
    });

    it("cannot be claimed twice", async () => {
      const { escrow, alice, poolId } = await refundablePool();
      await escrow.connect(alice).refund(poolId);
      await expect(escrow.connect(alice).refund(poolId)).to.be.revertedWith("nothing to refund");
    });

    it("pays nothing to someone who didn't contribute — including the recipient", async () => {
      const { escrow, stranger, recipient, poolId } = await refundablePool();
      await expect(escrow.connect(stranger).refund(poolId)).to.be.revertedWith("nothing to refund");
      await expect(escrow.connect(recipient).refund(poolId)).to.be.revertedWith("nothing to refund");
    });

    it("is not available while a pool is open or after it was released", async () => {
      const { escrow, recipient, alice } = await deploy();
      const { poolId } = await createPool(escrow, recipient.address, usdc("10"), Mode.ThresholdOnly);
      await escrow.connect(alice).contribute(poolId, { value: usdc("5") });

      await expect(escrow.connect(alice).refund(poolId)).to.be.revertedWith("pool not refundable");

      await escrow.connect(alice).contribute(poolId, { value: usdc("5") });
      await escrow.checkAndRelease(poolId);
      await expect(escrow.connect(alice).refund(poolId)).to.be.revertedWith("pool not refundable");
    });

    it("cannot drain another pool's funds", async () => {
      const { escrow, recipient, alice, bob } = await deploy();
      const failing = await createPool(escrow, recipient.address, usdc("100"), Mode.ThresholdOnly);
      const other = await createPool(escrow, recipient.address, usdc("100"), Mode.ThresholdOnly, 30 * DAY);
      await escrow.connect(alice).contribute(failing.poolId, { value: usdc("5") });
      await escrow.connect(bob).contribute(other.poolId, { value: usdc("50") });

      await time.increaseTo(failing.deadline);
      await escrow.checkAndRelease(failing.poolId);

      await escrow.connect(alice).refund(failing.poolId);
      await expect(escrow.connect(alice).refund(failing.poolId)).to.be.revertedWith("nothing to refund");
      await expect(escrow.connect(alice).refund(other.poolId)).to.be.revertedWith("pool not refundable");
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(usdc("50"));
    });
  });

  describe("escrow rules can't be bypassed", () => {
    it("the recipient can't take funds before the rules allow it", async () => {
      const { escrow, recipient, alice } = await deploy();
      const { poolId } = await createPool(escrow, recipient.address, usdc("100"), Mode.ThresholdOnly);
      await escrow.connect(alice).contribute(poolId, { value: usdc("60") });

      await expect(escrow.connect(recipient).checkAndRelease(poolId)).to.be.revertedWith("conditions not met");
      await expect(escrow.connect(recipient).refund(poolId)).to.be.revertedWith("pool not refundable");
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(usdc("60"));
    });

    it("a re-entrant recipient is paid once", async () => {
      const { escrow, alice } = await deploy();
      const attacker = await (await ethers.getContractFactory("ReentrantRecipient")).deploy(await escrow.getAddress());
      const { poolId } = await createPool(escrow, await attacker.getAddress(), usdc("10"), Mode.ThresholdOnly);
      await attacker.setPoolId(poolId);
      // A second pool's funds are what a double-payout would steal from.
      const other = await createPool(escrow, alice.address, usdc("100"), Mode.ThresholdOnly);
      await escrow.connect(alice).contribute(other.poolId, { value: usdc("40") });
      await escrow.connect(alice).contribute(poolId, { value: usdc("10") });

      await escrow.checkAndRelease(poolId);

      expect(await attacker.reentryFailed()).to.equal(true);
      expect(await ethers.provider.getBalance(await attacker.getAddress())).to.equal(usdc("10"));
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(usdc("40"));
    });

    it("a re-entrant contributor is refunded once", async () => {
      const { escrow, recipient, alice } = await deploy();
      const attacker = await (await ethers.getContractFactory("ReentrantContributor")).deploy(await escrow.getAddress());
      const { poolId, deadline } = await createPool(escrow, recipient.address, usdc("100"), Mode.ThresholdOnly);
      await attacker.contribute(poolId, { value: usdc("10") });
      await escrow.connect(alice).contribute(poolId, { value: usdc("20") });

      await time.increaseTo(deadline);
      await escrow.checkAndRelease(poolId);
      await attacker.claim();

      expect(await attacker.reentries()).to.equal(1n);
      expect(await ethers.provider.getBalance(await attacker.getAddress())).to.equal(usdc("10"));
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(usdc("20"));
    });

    it("a failed payout reverts the whole release, leaving funds in escrow", async () => {
      const { escrow, alice } = await deploy();
      const rejecting = await (await ethers.getContractFactory("RejectingRecipient")).deploy();
      const { poolId } = await createPool(escrow, await rejecting.getAddress(), usdc("10"), Mode.ThresholdOnly);
      await escrow.connect(alice).contribute(poolId, { value: usdc("10") });

      await expect(escrow.checkAndRelease(poolId)).to.be.revertedWith("transfer failed");
      expect((await escrow.getPool(poolId)).status).to.equal(Status.Open);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(usdc("10"));
    });
  });

  it("has no yield, vault, admin, or withdrawal functions", async () => {
    const { escrow } = await deploy();
    const names = escrow.interface.fragments
      .filter((f) => f.type === "function")
      .map((f) => (f as unknown as { name: string }).name)
      .sort();
    expect(names).to.deep.equal(
      ["checkAndRelease", "contribute", "contributions", "createPool", "getPool", "nextPoolId", "pools", "refund"].sort()
    );
  });
});
