import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The contract ABI is read at runtime via fs.readFileSync (lib/poolEscrow.ts).
  // Vercel's file tracing doesn't reliably detect a process.cwd()-based path,
  // so include the artifacts explicitly or the deployed functions 404 on it.
  outputFileTracingIncludes: {
    "/api/**": ["./contracts/artifacts/*.json"],
    "/pools/**": ["./contracts/artifacts/*.json"],
  },
};

export default nextConfig;
