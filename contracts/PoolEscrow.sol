// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IYieldVault {
    function deposit(uint256 poolId) external payable;
    function withdrawAll(uint256 poolId) external returns (uint256 total);
}

// Thin custody + release contract for Harambee pools. Contributions are in
// Arc's native currency, which is itself USDC (Arc is a USDC-denominated L1),
// so this uses payable/native-value transfers rather than ERC-20 transferFrom.
// No metadata, no notifications — just fund custody and release logic.
//
// Contributions are forwarded into a YieldVault instead of sitting idle in
// this contract; currentAmount tracks principal contributed (for threshold
// checks and proportional refund splitting), while the vault separately
// tracks accrued yield on the pool's aggregate principal.
contract PoolEscrow {
    enum Status {
        Open,
        Released,
        Refunded
    }

    // How a pool resolves when checkAndRelease runs. Ordering matches the
    // release_mode strings used off-chain (0 = threshold_or_deadline, etc.).
    enum ReleaseMode {
        ThresholdOrDeadline, // release when target hit, else release whatever's raised at deadline
        ThresholdOnly,       // release when target hit, else refund contributors at deadline
        DeadlineOnly         // never release early; release whatever's raised at deadline
    }

    struct Pool {
        address recipient;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 deadline;
        Status status;
        uint256 finalValue; // principal + yield withdrawn from the vault, set once released/refunded
        ReleaseMode releaseMode;
    }

    address public immutable vault;

    uint256 public nextPoolId;
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event PoolCreated(uint256 indexed poolId, address indexed recipient, uint256 targetAmount, uint256 deadline);
    event Contributed(uint256 indexed poolId, address indexed contributor, uint256 amount);
    event Released(uint256 indexed poolId, address indexed recipient, uint256 amount);
    event Refunded(uint256 indexed poolId, address indexed contributor, uint256 amount);

    constructor(address _vault) {
        require(_vault != address(0), "vault required");
        vault = _vault;
    }

    function createPool(uint256 targetAmount, uint256 deadline, address recipient, ReleaseMode releaseMode) external returns (uint256 poolId) {
        require(targetAmount > 0, "target must be > 0");
        require(deadline > block.timestamp, "deadline must be future");
        require(recipient != address(0), "recipient required");

        poolId = nextPoolId++;
        pools[poolId] = Pool({
            recipient: recipient,
            targetAmount: targetAmount,
            currentAmount: 0,
            deadline: deadline,
            status: Status.Open,
            finalValue: 0,
            releaseMode: releaseMode
        });

        emit PoolCreated(poolId, recipient, targetAmount, deadline);
    }

    function contribute(uint256 poolId) external payable {
        Pool storage pool = pools[poolId];
        require(pool.recipient != address(0), "pool does not exist");
        require(pool.status == Status.Open, "pool not open");
        require(block.timestamp < pool.deadline, "pool deadline passed");
        require(msg.value > 0, "amount must be > 0");

        pool.currentAmount += msg.value;
        contributions[poolId][msg.sender] += msg.value;

        IYieldVault(vault).deposit{value: msg.value}(poolId);

        emit Contributed(poolId, msg.sender, msg.value);
    }

    // Anyone can call this to check conditions and trigger release/refund —
    // it just enforces the rule, it doesn't gate who can push the state forward.
    function checkAndRelease(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        require(pool.recipient != address(0), "pool does not exist");
        require(pool.status == Status.Open, "pool not open");

        bool thresholdMet = pool.currentAmount >= pool.targetAmount;
        bool deadlinePassed = block.timestamp >= pool.deadline;

        // Resolve the outcome per the pool's release mode.
        bool doRelease;
        if (pool.releaseMode == ReleaseMode.DeadlineOnly) {
            // No early release — only at/after the deadline, and it releases
            // whatever was raised whether or not the target was met.
            require(deadlinePassed, "before deadline");
            doRelease = true;
        } else if (pool.releaseMode == ReleaseMode.ThresholdOrDeadline) {
            // Release early once the target is hit, otherwise release whatever
            // was raised at the deadline.
            require(thresholdMet || deadlinePassed, "conditions not met");
            doRelease = true;
        } else {
            // ThresholdOnly: release early once the target is hit; if the
            // deadline passes first without hitting it, refund contributors.
            require(thresholdMet || deadlinePassed, "conditions not met");
            doRelease = thresholdMet;
        }

        uint256 totalValue = IYieldVault(vault).withdrawAll(poolId);
        pool.finalValue = totalValue;

        if (doRelease) {
            pool.status = Status.Released;
            (bool success, ) = pool.recipient.call{value: totalValue}("");
            require(success, "transfer failed");
            emit Released(poolId, pool.recipient, totalValue);
        } else {
            pool.status = Status.Refunded;
        }
    }

    // Pull-based: each contributor claims their principal plus their
    // proportional share of the pool's accrued yield, once a pool has
    // flipped to Refunded. currentAmount is frozen (no longer modified once
    // status leaves Open) so it's a stable denominator for the split.
    function refund(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        require(pool.status == Status.Refunded, "pool not refundable");

        uint256 principal = contributions[poolId][msg.sender];
        require(principal > 0, "nothing to refund");

        contributions[poolId][msg.sender] = 0;
        uint256 amount = (principal * pool.finalValue) / pool.currentAmount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "refund failed");

        emit Refunded(poolId, msg.sender, amount);
    }

    // Needed so this contract can accept the plain value transfer the vault
    // sends back in withdrawAll() — a contract with no receive()/fallback()
    // rejects bare value sends (empty calldata) even if it has other
    // payable functions like contribute().
    receive() external payable {}

    function getPool(uint256 poolId) external view returns (
        address recipient,
        uint256 targetAmount,
        uint256 currentAmount,
        uint256 deadline,
        Status status,
        uint256 finalValue,
        ReleaseMode releaseMode
    ) {
        Pool storage pool = pools[poolId];
        return (pool.recipient, pool.targetAmount, pool.currentAmount, pool.deadline, pool.status, pool.finalValue, pool.releaseMode);
    }
}
