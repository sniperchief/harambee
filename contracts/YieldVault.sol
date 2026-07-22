// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Minimal stand-in yield vault for Harambee — represents where a real
// lending protocol would sit in production (Morpho is the closest
// structural match: a simple deposit/withdraw/accrue vault, as opposed to
// Aave's pooled-liquidity model). Fixed APY, linear interest off elapsed
// time — not a real market rate.
//
// Positions are keyed by poolId, not depositor address: the PoolEscrow
// contract is the sole caller, depositing on behalf of many pools.
contract YieldVault {
    uint256 public constant APY_BPS = 500; // 5% APY
    uint256 private constant BPS_DENOMINATOR = 10000;
    uint256 private constant YEAR = 365 days;

    struct Position {
        uint256 principal;
        uint256 lastUpdate;
    }

    address public immutable owner;
    address public poolEscrow;
    mapping(uint256 => Position) public positions;

    event Deposited(uint256 indexed poolId, uint256 amount, uint256 newPrincipal);
    event Withdrawn(uint256 indexed poolId, uint256 amount);
    event ReserveFunded(address indexed from, uint256 amount);

    modifier onlyPoolEscrow() {
        require(msg.sender == poolEscrow, "not pool escrow");
        _;
    }

    // Takes owner explicitly rather than using msg.sender: for smart-contract
    // account (SCA) wallets, the deployment transaction's msg.sender seen by
    // this constructor is a Circle-managed deployer address, not the
    // wallet's own address — msg.sender here would be unusable as an owner.
    constructor(address _owner) {
        require(_owner != address(0), "owner required");
        owner = _owner;
    }

    // One-time wiring: PoolEscrow's address isn't known until after it's
    // deployed (it takes this vault's address in its own constructor), so
    // this is set once, right after both contracts are deployed.
    function setPoolEscrow(address _poolEscrow) external {
        require(msg.sender == owner, "not owner");
        require(poolEscrow == address(0), "already set");
        require(_poolEscrow != address(0), "zero address");
        poolEscrow = _poolEscrow;
    }

    function deposit(uint256 poolId) external payable onlyPoolEscrow {
        require(msg.value > 0, "amount must be > 0");
        _accrue(poolId);
        positions[poolId].principal += msg.value;
        emit Deposited(poolId, msg.value, positions[poolId].principal);
    }

    // Withdraws a pool's entire position (principal + accrued yield) in one
    // shot — PoolEscrow always closes a position fully, either sending it to
    // the recipient on release or pulling it in to split proportionally on
    // refund.
    function withdrawAll(uint256 poolId) external onlyPoolEscrow returns (uint256 total) {
        _accrue(poolId);
        total = positions[poolId].principal;
        positions[poolId].principal = 0;

        if (total > 0) {
            (bool success, ) = msg.sender.call{value: total}("");
            require(success, "withdraw failed");
        }

        emit Withdrawn(poolId, total);
    }

    function getAccruedYield(uint256 poolId) public view returns (uint256) {
        Position storage p = positions[poolId];
        if (p.principal == 0) return 0;
        uint256 elapsed = block.timestamp - p.lastUpdate;
        return (p.principal * APY_BPS * elapsed) / (BPS_DENOMINATOR * YEAR);
    }

    function getPrincipal(uint256 poolId) external view returns (uint256) {
        return positions[poolId].principal;
    }

    function _accrue(uint256 poolId) internal {
        Position storage p = positions[poolId];
        uint256 pendingYield = getAccruedYield(poolId);
        if (pendingYield > 0) {
            p.principal += pendingYield;
        }
        p.lastUpdate = block.timestamp;
    }

    // The APY this vault pays out is invented (no real yield-generating
    // strategy backs it, unlike a real protocol such as Morpho), so unlike
    // deposits, it isn't backed by real incoming value. This lets anyone
    // (in practice, whoever deploys/demos this) top up a reserve of real
    // native currency so simulated yield can actually be paid out on
    // withdrawal, up to the reserve's size.
    function fundReserve() external payable {
        emit ReserveFunded(msg.sender, msg.value);
    }
}
