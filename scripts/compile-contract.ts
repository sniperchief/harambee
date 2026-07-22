import * as fs from "fs";
import * as path from "path";
import solc from "solc";

interface SolcError {
  severity: "error" | "warning";
  formattedMessage: string;
}

function main() {
  const contractName = process.argv[2];
  if (!contractName) {
    throw new Error("Usage: tsx scripts/compile-contract.ts <ContractName>");
  }

  const sourcePath = path.join(__dirname, `../contracts/${contractName}.sol`);
  const source = fs.readFileSync(sourcePath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      [`${contractName}.sol`]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  const errors: SolcError[] = output.errors ?? [];
  const fatal = errors.filter((e) => e.severity === "error");
  for (const err of errors) {
    console.error(err.formattedMessage);
  }
  if (fatal.length > 0) {
    process.exit(1);
  }

  const contract = output.contracts[`${contractName}.sol`][contractName];
  const artifact = {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  };

  const outDir = path.join(__dirname, "../contracts/artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${contractName}.json`),
    JSON.stringify(artifact, null, 2)
  );

  console.log(`Compiled. Artifact written to contracts/artifacts/${contractName}.json`);
}

main();
