// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Custody + release contract for Harambee pools. Contributions are in Arc's
// native currency, which is itself USDC (Arc is a USDC-denominated L1), so
// this uses payable/native-value transfers rather than ERC-20 transferFrom.
// No metadata, no notifications, no admin — just fund custody and the rules
// for releasing or refunding them. Funds stay in this contract until a pool
// resolves; nothing is forwarded or invested anywhere else.
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
        ReleaseMode releaseMode;
    }

    uint256 public nextPoolId;
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event PoolCreated(uint256 indexed poolId, address indexed recipient, uint256 targetAmount, uint256 deadline);
    event Contributed(uint256 indexed poolId, address indexed contributor, uint256 amount);
    event Released(uint256 indexed poolId, address indexed recipient, uint256 amount);
    event Refundable(uint256 indexed poolId);
    event Refunded(uint256 indexed poolId, address indexed contributor, uint256 amount);

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

        if (doRelease) {
            // Status flips before the transfer, so a re-entrant call sees a
            // closed pool. currentAmount stays as the record of what was raised.
            pool.status = Status.Released;
            uint256 amount = pool.currentAmount;
            (bool success, ) = pool.recipient.call{value: amount}("");
            require(success, "transfer failed");
            emit Released(poolId, pool.recipient, amount);
        } else {
            pool.status = Status.Refunded;
            emit Refundable(poolId);
        }
    }

    // Pull-based: each contributor claims back exactly what they put in, once
    // a pool has flipped to Refunded. Their balance is zeroed before the
    // transfer, so it can only be claimed once.
    function refund(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        require(pool.status == Status.Refunded, "pool not refundable");

        uint256 amount = contributions[poolId][msg.sender];
        require(amount > 0, "nothing to refund");

        contributions[poolId][msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "refund failed");

        emit Refunded(poolId, msg.sender, amount);
    }

    function getPool(uint256 poolId) external view returns (
        address recipient,
        uint256 targetAmount,
        uint256 currentAmount,
        uint256 deadline,
        Status status,
        ReleaseMode releaseMode
    ) {
        Pool storage pool = pools[poolId];
        return (pool.recipient, pool.targetAmount, pool.currentAmount, pool.deadline, pool.status, pool.releaseMode);
    }
}
