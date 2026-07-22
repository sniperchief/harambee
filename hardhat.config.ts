import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Local-only config for testing contracts/YieldVault.sol with fast-forwarded
// time. Not used for the real Arc testnet deployment — that goes through
// Circle Contracts (see scripts/deploy-yield-vault.ts).
const config: HardhatUserConfig = {
  solidity: "0.8.20",
};

export default config;
