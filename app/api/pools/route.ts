import { NextRequest, NextResponse } from "next/server";
import { parseEther } from "viem";
import { createCircleClient } from "@/lib/circle";
import { createCircleContractsClient } from "@/lib/circleContracts";
import { getPoolEscrowAbiJson, getPoolEscrowAddress } from "@/lib/poolEscrow";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const {
    creatorId,
    walletId,
    title,
    description,
    targetAmount,
    deadline,
    recipientWalletAddress,
    releaseMode,
  } = await request.json();

  if (
    !creatorId ||
    !walletId ||
    !title ||
    !targetAmount ||
    !deadline ||
    !recipientWalletAddress
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const contractAddress = getPoolEscrowAddress();
  const abiJson = getPoolEscrowAbiJson();

  const deadlineUnix = Math.floor(new Date(deadline).getTime() / 1000);
  const targetAmountWei = parseEther(targetAmount).toString();

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
    abiFunctionSignature: "createPool(uint256,uint256,address)",
    abiParameters: [targetAmountWei, String(deadlineUnix), recipientWalletAddress],
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

  const supabase = createServiceClient();
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
      recipient_wallet_address: recipientWalletAddress,
      onchain_pool_id: onchainPoolId,
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
