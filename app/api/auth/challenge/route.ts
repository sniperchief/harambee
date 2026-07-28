import { NextResponse } from "next/server";
import { issueChallenge } from "@/lib/authChallenge";

// GET /api/auth/challenge -> { challenge }
// The browser signs this challenge with its passkey; /api/auth/login then
// verifies that signature server-side before issuing a session.
export async function GET() {
  const challenge = await issueChallenge();
  return NextResponse.json({ challenge });
}
