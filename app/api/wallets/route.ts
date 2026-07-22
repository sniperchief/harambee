import { NextRequest, NextResponse } from "next/server";
import { createCircleClient } from "@/lib/circle";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select()
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.circle_wallet_address) {
    return NextResponse.json({
      walletId: user.circle_wallet_id,
      address: user.circle_wallet_address,
      reused: true,
    });
  }

  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  if (!walletSetId) {
    return NextResponse.json(
      { error: "CIRCLE_WALLET_SET_ID is not configured" },
      { status: 500 }
    );
  }

  const client = createCircleClient();
  const walletsResponse = await client.createWallets({
    walletSetId,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA",
  });

  const wallet = walletsResponse.data?.wallets?.[0];
  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet creation returned no wallet" },
      { status: 502 }
    );
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      circle_wallet_id: wallet.id,
      circle_wallet_address: wallet.address,
    })
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ walletId: wallet.id, address: wallet.address });
}
