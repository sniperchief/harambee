import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("YieldVault", () => {
  it("accrues linear interest matching the fixed APY after fast-forwarded time", async () => {
    const [owner] = await hre.ethers.getSigners();

    const YieldVault = await hre.ethers.getContractFactory("YieldVault");
    const vault = await YieldVault.deploy(owner.address);
    await vault.waitForDeployment();

    // The test signer stands in for PoolEscrow, so we can call
    // deposit/withdrawAll directly without deploying the full escrow contract.
    await vault.setPoolEscrow(owner.address);

    const poolId = 0;
    const depositAmount = hre.ethers.parseEther("100");
    await vault.deposit(poolId, { value: depositAmount });

    expect(await vault.getAccruedYield(poolId)).to.equal(0n);

    const thirtyDays = 30 * 24 * 60 * 60;
    await time.increase(thirtyDays);

    const apyBps = await vault.APY_BPS();
    const year = 365 * 24 * 60 * 60;
    const expectedYield = (depositAmount * apyBps * BigInt(thirtyDays)) / (10000n * BigInt(year));

    const accrued = await vault.getAccruedYield(poolId);
    expect(accrued).to.equal(expectedYield);
    expect(accrued).to.be.greaterThan(0n);
  });

  it("checkpoints accrued yield into principal on withdrawAll", async () => {
    const [owner] = await hre.ethers.getSigners();

    const YieldVault = await hre.ethers.getContractFactory("YieldVault");
    const vault = await YieldVault.deploy(owner.address);
    await vault.waitForDeployment();
    await vault.setPoolEscrow(owner.address);

    const poolId = 1;
    const depositAmount = hre.ethers.parseEther("50");
    await vault.deposit(poolId, { value: depositAmount });

    const ninetyDays = 90 * 24 * 60 * 60;
    await time.increase(ninetyDays);

    const expectedYield = await vault.getAccruedYield(poolId);
    expect(expectedYield).to.be.greaterThan(0n);

    // The vault's simulated APY isn't backed by real incoming value, so its
    // reserve needs topping up before it can actually pay out yield on top
    // of principal — see the fundReserve() comment in YieldVault.sol.
    // Funding and withdrawing each mine their own block, advancing the
    // simulated clock a little further each time, so a couple more seconds
    // of interest accrue than what getAccruedYield reported a moment ago —
    // fund generously above that to absorb the drift.
    await vault.fundReserve({ value: expectedYield * 2n });

    const before = await hre.ethers.provider.getBalance(owner.address);
    const tx = await vault.withdrawAll(poolId);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const after = await hre.ethers.provider.getBalance(owner.address);

    // Compare against what the contract itself reported withdrawing, not a
    // value computed a block or two earlier — the exact yield keeps ticking
    // up between then and the withdrawAll call itself.
    const withdrawnEvent = receipt!.logs
      .map((log) => vault.interface.parseLog(log))
      .find((parsed) => parsed?.name === "Withdrawn");
    const actualTotal = withdrawnEvent!.args.amount as bigint;

    const received = after - before + gasCost;
    expect(received).to.equal(actualTotal);
    expect(actualTotal).to.be.greaterThanOrEqual(depositAmount + expectedYield);
    expect(await vault.getPrincipal(poolId)).to.equal(0n);
  });
});
