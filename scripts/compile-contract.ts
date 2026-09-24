import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Compiles with Hardhat (settings in hardhat.config.ts) and writes the
// { abi, bytecode } artifact the app and the Circle deploy script read.
// Taking the bytecode straight from Hardhat's build guarantees it is
// byte-for-byte what `hardhat verify` recompiles, so the deployed contract
// can be verified on Arc's explorer.
function main() {
  const contractName = process.argv[2];
  if (!contractName) {
    throw new Error("Usage: tsx scripts/compile-contract.ts <ContractName>");
  }

  const root = path.join(__dirname, "..");
  execSync("npx hardhat compile", { cwd: root, stdio: "inherit" });

  const built = JSON.parse(
    fs.readFileSync(
      path.join(root, `artifacts/contracts/${contractName}.sol/${contractName}.json`),
      "utf8"
    )
  );
  const artifact = { abi: built.abi, bytecode: built.bytecode };

  const outDir = path.join(root, "contracts/artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${contractName}.json`), JSON.stringify(artifact, null, 2));

  console.log(`Compiled. Artifact written to contracts/artifacts/${contractName}.json`);
}

main();
