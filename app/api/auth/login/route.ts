import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { address } = await request.json();

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: user, error } = await supabase
    .from("users")
    .select()
    .eq("modular_wallet_address", address)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "No account for this passkey" }, { status: 404 });
  }

  const response = NextResponse.json({ userId: user.id, address });
  response.cookies.set("harambee_session", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
