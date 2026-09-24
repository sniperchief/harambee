import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/authCookie";

export async function POST(request: NextRequest) {
  // 303 (See Other), not the default 307: a 307 makes the browser re-send the
  // POST to /login, and a page only accepts GET — which surfaced as HTTP 405.
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
