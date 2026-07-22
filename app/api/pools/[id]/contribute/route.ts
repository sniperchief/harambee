import { NextRequest, NextResponse } from "next/server";
import { formatEther } from "viem";
import { createCircleClient } from "@/lib/circle";
import { createCircleContractsClient } from "@/lib/circleContracts";
import { getPoolEscrowAbiJson, getPoolEscrowAddress } from "@/lib/poolEscrow";
import { createServiceClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params;
  const { walletId, amount, contributorId } = await request.json();

  if (!walletId || !amount) {
    return NextResponse.json({ error: "walletId and amount are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .select()
    .eq("id", poolId)
    .single();

  if (poolError || !pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  const contractAddress = getPoolEscrowAddress();
  const abiJson = getPoolEscrowAbiJson();

  const walletsClient = createCircleClient();
  const txResponse = await walletsClient.createContractExecutionTransaction({
    walletId,
    contractAddress,
    abiFunctionSignature: "contribute(uint256)",
    abiParameters: [pool.onchain_pool_id],
    amount,
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const transactionId = txResponse.data?.id;
  if (!transactionId) {
    return NextResponse.json(
      { error: "contribute transaction did not return an id" },
      { status: 502 }
    );
  }

  const confirmed = await walletsClient.getTransaction({
    id: transactionId,
    waitForState: "CONFIRMED",
  });

  // The contract is the source of truth for the running total — read it
  // back after confirming, rather than doing arithmetic in JS, so Supabase
  // can never drift from on-chain state.
  const contractsClient = createCircleContractsClient();
  const stateResponse = await contractsClient.queryContract({
    address: contractAddress,
    blockchain: "ARC-TESTNET",
    abiJson,
    abiFunctionSignature: "getPool(uint256)",
    abiParameters: [pool.onchain_pool_id],
  });
  const currentAmountWei = stateResponse.data?.outputValues?.[2];
  const currentAmount = formatEther(BigInt(currentAmountWei));

  const { error: updateError } = await supabase
    .from("pools")
    .update({ current_amount: currentAmount })
    .eq("id", poolId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: contributionError } = await supabase.from("pool_contributions").insert({
    pool_id: poolId,
    contributor_id: contributorId ?? null,
    amount,
    tx_hash: confirmed.data?.transaction?.txHash,
    status: "confirmed",
  });

  if (contributionError) {
    return NextResponse.json({ error: contributionError.message }, { status: 500 });
  }

  return NextResponse.json({
    currentAmount,
    txHash: confirmed.data?.transaction?.txHash,
  });
}
