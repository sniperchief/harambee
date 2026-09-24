import { NextRequest, NextResponse } from "next/server";
import { isAddress, parseEther } from "viem";
import { createCircleClient } from "@/lib/circle";
import { getPlatformWalletId } from "@/lib/platformWallet";
import { RELEASE_MODE_INDEX, getCreatedPoolId, getPoolEscrowAddress } from "@/lib/poolEscrow";
import { getSessionUserId } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const creatorId = await getSessionUserId();
  if (!creatorId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const {
    title,
    description,
    targetAmount,
    deadline,
    recipientWalletAddress,
    releaseMode,
    targetCurrency,
  } = await request.json();

  if (!title || !targetAmount || !deadline) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (releaseMode !== undefined && !(releaseMode in RELEASE_MODE_INDEX)) {
    return NextResponse.json({ error: "Invalid release mode" }, { status: 400 });
  }

  let targetAmountWei: bigint;
  try {
    targetAmountWei = parseEther(String(targetAmount));
  } catch {
    return NextResponse.json({ error: "Invalid target amount" }, { status: 400 });
  }
  if (targetAmountWei <= 0n) {
    return NextResponse.json({ error: "Target must be more than 0" }, { status: 400 });
  }

  const deadlineUnix = Math.floor(new Date(deadline).getTime() / 1000);
  if (!Number.isFinite(deadlineUnix) || deadlineUnix <= Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ error: "Deadline must be in the future" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: creator, error: creatorError } = await supabase
    .from("users")
    .select("modular_wallet_address")
    .eq("id", creatorId)
    .single();

  if (creatorError || !creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  // A pool created "for yourself" (no explicit recipient) releases to the
  // creator's own wallet.
  const recipient: string = recipientWalletAddress || creator.modular_wallet_address;
  if (!recipient || !isAddress(recipient)) {
    return NextResponse.json({ error: "A valid recipient wallet address is required" }, { status: 400 });
  }

  const releaseModeIndex = RELEASE_MODE_INDEX[releaseMode ?? "threshold_or_deadline"];

  const walletsClient = createCircleClient();
  const txResponse = await walletsClient.createContractExecutionTransaction({
    walletId: getPlatformWalletId(),
    contractAddress: getPoolEscrowAddress(),
    abiFunctionSignature: "createPool(uint256,uint256,address,uint8)",
    abiParameters: [targetAmountWei.toString(), String(deadlineUnix), recipient, String(releaseModeIndex)],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const transactionId = txResponse.data?.id;
  if (!transactionId) {
    return NextResponse.json({ error: "createPool transaction did not return an id" }, { status: 502 });
  }

  const confirmed = await walletsClient.getTransaction({
    id: transactionId,
    waitForState: "CONFIRMED",
  });
  const txHash = confirmed.data?.transaction?.txHash;
  if (!txHash) {
    return NextResponse.json(
      { error: `Pool creation did not confirm (state: ${confirmed.data?.transaction?.state ?? "unknown"})` },
      { status: 502 }
    );
  }

  // The pool id comes from this transaction's own PoolCreated event, so the
  // record can only ever point at the pool we just created.
  let onchainPoolId: string;
  try {
    onchainPoolId = await getCreatedPoolId(txHash, { recipient, targetAmountWei, deadline: deadlineUnix });
  } catch (err) {
    console.error("Could not confirm the created pool on-chain:", err);
    return NextResponse.json({ error: "Could not confirm the new pool on-chain. Please try again." }, { status: 502 });
  }

  const { data: pool, error } = await supabase
    .from("pools")
    .insert({
      creator_id: creatorId,
      title,
      description: description ?? null,
      target_amount: targetAmount,
      current_amount: 0,
      deadline: new Date(deadlineUnix * 1000).toISOString(),
      release_mode: releaseMode ?? undefined,
      recipient_wallet_address: recipient,
      onchain_pool_id: onchainPoolId,
      target_currency: targetCurrency ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pool, onchainPoolId, txHash });
}
