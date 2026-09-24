// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Test-only helpers for test/PoolEscrow.test.ts. Never deployed.

interface IPoolEscrow {
    function contribute(uint256 poolId) external payable;
    function checkAndRelease(uint256 poolId) external;
    function refund(uint256 poolId) external;
}

// A recipient that tries to re-enter checkAndRelease when paid, to take the
// pool's funds twice.
contract ReentrantRecipient {
    IPoolEscrow public escrow;
    uint256 public poolId;
    bool public reentryFailed;

    constructor(address _escrow) {
        escrow = IPoolEscrow(_escrow);
    }

    function setPoolId(uint256 _poolId) external {
        poolId = _poolId;
    }

    receive() external payable {
        try escrow.checkAndRelease(poolId) {} catch {
            reentryFailed = true;
        }
    }
}

// A contributor that tries to re-enter refund when repaid, to claim twice.
contract ReentrantContributor {
    IPoolEscrow public escrow;
    uint256 public poolId;
    uint256 public reentries;

    constructor(address _escrow) {
        escrow = IPoolEscrow(_escrow);
    }

    function contribute(uint256 _poolId) external payable {
        poolId = _poolId;
        escrow.contribute{value: msg.value}(_poolId);
    }

    function claim() external {
        escrow.refund(poolId);
    }

    receive() external payable {
        if (reentries == 0) {
            reentries++;
            // Must revert ("nothing to refund") — swallow it so the outer
            // refund still succeeds and the test can check balances.
            try escrow.refund(poolId) {} catch {}
        }
    }
}

// A recipient that refuses payment, so release can never succeed.
contract RejectingRecipient {
    receive() external payable {
        revert("no thanks");
    }
}
