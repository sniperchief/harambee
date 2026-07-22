import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

// One-time setup: registers a new entity secret with Circle and saves the
// recovery file. Non-idempotent — running this again registers a different
// secret and invalidates the previous one for future requests.
async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing CIRCLE_API_KEY in .env.local");
  }

  const entitySecret = randomBytes(32).toString("hex");

  const response = await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
  });

  const recoveryDir = path.join(process.cwd(), "recovery");
  fs.mkdirSync(recoveryDir, { recursive: true });
  const recoveryPath = path.join(recoveryDir, `recovery_${Date.now()}.dat`);
  fs.writeFileSync(recoveryPath, response.data?.recoveryFile ?? "");

  console.log("Entity secret registered.");
  console.log("Recovery file saved to:", recoveryPath);
  console.log("Keep it somewhere safe outside this repo — it's the only way to reset the entity secret if lost.");
  console.log("");
  console.log("Add this line to .env.local:");
  console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}`);
}

main().catch((err) => {
  console.error("register-entity-secret failed:", err);
  process.exit(1);
});
