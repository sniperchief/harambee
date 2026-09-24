import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Used for two things only: running the contract tests locally (with
// fast-forwarded time), and verifying the deployed PoolEscrow on Arc's
// explorer. Deployment itself goes through Circle Contracts (see
// scripts/deploy-pool-escrow.ts), so there are no private keys here.
//
// The compiler settings must match scripts/compile-contract.ts exactly
// (solc 0.8.36, optimizer on, 200 runs, paris EVM target), otherwise the bytecode Circle
// deploys won't match what the explorer recompiles during verification.
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.36",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  },
  networks: {
    arc: {
      url: process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io",
      chainId: 5042,
    },
  },
  etherscan: {
    // Arc's explorer is Blockscout, which accepts any non-empty API key.
    apiKey: { arc: "blockscout" },
    customChains: [
      {
        network: "arc",
        chainId: 5042,
        urls: {
          apiURL: "https://explorer.arc.io/api",
          browserURL: "https://explorer.arc.io",
        },
      },
    ],
  },
  sourcify: { enabled: false },
};

export default config;
