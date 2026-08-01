import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { parseEther } from "viem";
import { createCircleClient } from "@/lib/circle";
import { createCircleContractsClient } from "@/lib/circleContracts";
import { getPlatformWalletId } from "@/lib/platformWallet";
import { getPoolEscrowAbiJson, getPoolEscrowAddress } from "@/lib/poolEscrow";
import { createServiceClient } from "@/lib/supabase";

// Must match the ReleaseMode enum ordering in contracts/PoolEscrow.sol.
const RELEASE_MODE_INDEX: Record<string, number> = {
  threshold_or_deadline: 0,
  threshold_only: 1,
  deadline_only: 2,
};

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const creatorId = cookieStore.get("harambee_session")?.value;
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
  const recipient = recipientWalletAddress || creator.modular_wallet_address;
  if (!recipient) {
    return NextResponse.json({ error: "recipientWalletAddress is required" }, { status: 400 });
  }

  const contractAddress = getPoolEscrowAddress();
  const abiJson = getPoolEscrowAbiJson();
  const walletId = getPlatformWalletId();

  const deadlineUnix = Math.floor(new Date(deadline).getTime() / 1000);
  const targetAmountWei = parseEther(targetAmount).toString();
  const releaseModeIndex = RELEASE_MODE_INDEX[releaseMode] ?? RELEASE_MODE_INDEX.threshold_or_deadline;

  const contractsClient = createCircleContractsClient();

  // The contract assigns pool ids sequentially starting at 0 — snapshot
  // nextPoolId before creating so we know which id this pool will get,
  // without needing to decode event logs from the transaction.
  const nextIdResponse = await contractsClient.queryContract({
    address: contractAddress,
    blockchain: "ARC-TESTNET",
    abiJson,
    abiFunctionSignature: "nextPoolId()",
    abiParameters: [],
  });
  const onchainPoolId = nextIdResponse.data?.outputValues?.[0];

  const walletsClient = createCircleClient();
  const txResponse = await walletsClient.createContractExecutionTransaction({
    walletId,
    contractAddress,
    abiFunctionSignature: "createPool(uint256,uint256,address,uint8)",
    abiParameters: [targetAmountWei, String(deadlineUnix), recipient, String(releaseModeIndex)],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const transactionId = txResponse.data?.id;
  if (!transactionId) {
    return NextResponse.json(
      { error: "createPool transaction did not return an id" },
      { status: 502 }
    );
  }

  const confirmed = await walletsClient.getTransaction({
    id: transactionId,
    waitForState: "CONFIRMED",
  });

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

  return NextResponse.json({
    pool,
    onchainPoolId,
    txHash: confirmed.data?.transaction?.txHash,
  });
}
