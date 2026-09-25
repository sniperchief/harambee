import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { normalizeUsername, usernameProblem } from "@/lib/username";

// Postgres/PostgREST codes for "that column doesn't exist" — i.e. the
// 0008_add_username migration hasn't been applied to this database yet.
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);

// Escape LIKE wildcards so ilike matches exactly: "_" is a legal username
// character. ("%" and "\" can't appear in a valid username, but escape anyway.)
const likeExact = (s: string) => s.replace(/[\\%_]/g, (m) => "\\" + m);

/** Is `name` already used by someone other than `exceptUserId`? null = can't tell (no column yet). */
async function isTaken(name: string, exceptUserId?: string): Promise<boolean | null> {
  const supabase = createServiceClient();
  let query = supabase.from("users").select("id").ilike("username", likeExact(name)).limit(1);
  if (exceptUserId) query = query.neq("id", exceptUserId);
  const { data, error } = await query;
  if (error) return MISSING_COLUMN.has(error.code ?? "") ? null : true;
  return (data ?? []).length > 0;
}

/** GET /api/username?u=name → { available, problem? } — checked before a passkey is created. */
export async function GET(request: NextRequest) {
  const name = normalizeUsername(request.nextUrl.searchParams.get("u"));
  const problem = usernameProblem(name);
  if (problem) return NextResponse.json({ available: false, problem });
  const taken = await isTaken(name);
  // Unknown (no column yet) counts as available so sign-up keeps working.
  return NextResponse.json(taken ? { available: false, problem: "That username is taken — try another." } : { available: true });
}

/** POST /api/username { username } → set or change the signed-in user's username. */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = normalizeUsername(body?.username);
  const problem = usernameProblem(name);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (await isTaken(name, userId)) {
    return NextResponse.json({ error: "That username is taken — try another." }, { status: 409 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("users").update({ username: name }).eq("id", userId);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That username is taken — try another." }, { status: 409 });
    }
    if (MISSING_COLUMN.has(error.code ?? "")) {
      return NextResponse.json({ error: "Usernames aren't switched on yet. Please try again later." }, { status: 503 });
    }
    return NextResponse.json({ error: "Couldn't save your username. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ username: name });
}
