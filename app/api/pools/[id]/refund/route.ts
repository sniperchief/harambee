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
  const { walletId } = await request.json();

  if (!walletId) {
    return NextResponse.json({ error: "walletId is required" }, { status: 400 });
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

  // refund() pays out based on msg.sender, so we need this wallet's actual
  // address — both to look up its principal and to predict the payout.
  const walletsClient = createCircleClient();
  const walletResponse = await walletsClient.getWallet({ id: walletId });
  const address = walletResponse.data?.wallet?.address;
  if (!address) {
    return NextResponse.json(
      { error: `Could not resolve address for wallet ${walletId}` },
      { status: 400 }
    );
  }

  const contractsClient = createCircleContractsClient();

  const poolStateResponse = await contractsClient.queryContract({
    address: contractAddress,
    blockchain: "ARC-TESTNET",
    abiJson,
    abiFunctionSignature: "getPool(uint256)",
    abiParameters: [pool.onchain_pool_id],
  });
  const [, , currentAmountWei, , statusIndex, finalValueWei] =
    poolStateResponse.data?.outputValues ?? [];

  if (Number(statusIndex) !== 2) {
    return NextResponse.json(
      { error: "Pool is not refundable yet — call check-release first" },
      { status: 400 }
    );
  }

  const contributionResponse = await contractsClient.queryContract({
    address: contractAddress,
    blockchain: "ARC-TESTNET",
    abiJson,
    abiFunctionSignature: "contributions(uint256,address)",
    abiParameters: [pool.onchain_pool_id, address],
  });
  const principal = BigInt(contributionResponse.data?.outputValues?.[0] ?? "0");

  if (principal === 0n) {
    return NextResponse.json(
      { error: "This wallet has no contribution to refund" },
      { status: 400 }
    );
  }

  // Predicted from the same frozen state the contract itself uses — exact,
  // no need to decode transaction logs.
  const expectedPayout = (principal * BigInt(finalValueWei)) / BigInt(currentAmountWei);

  const txResponse = await walletsClient.createContractExecutionTransaction({
    walletId,
    contractAddress,
    abiFunctionSignature: "refund(uint256)",
    abiParameters: [pool.onchain_pool_id],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const transactionId = txResponse.data?.id;
  if (!transactionId) {
    return NextResponse.json(
      { error: "refund transaction did not return an id" },
      { status: 502 }
    );
  }

  const confirmed = await walletsClient.getTransaction({
    id: transactionId,
    waitForState: "CONFIRMED",
  });

  return NextResponse.json({
    address,
    refundedAmount: formatEther(expectedPayout),
    txHash: confirmed.data?.transaction?.txHash,
  });
}
