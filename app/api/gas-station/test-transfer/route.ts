import { NextRequest, NextResponse } from "next/server";
import { createCircleClient } from "@/lib/circle";

export async function POST(request: NextRequest) {
  const { fromWalletAddress, toAddress, amount } = await request.json();

  if (!fromWalletAddress || !toAddress) {
    return NextResponse.json(
      { error: "fromWalletAddress and toAddress are required" },
      { status: 400 }
    );
  }

  const client = createCircleClient();

  // Arc's native currency is USDC itself, so this is a native-token transfer
  // (no tokenId/tokenAddress) rather than an ERC-20 transfer.
  const transferResponse = await client.createTransaction({
    walletAddress: fromWalletAddress,
    blockchain: "ARC-TESTNET",
    destinationAddress: toAddress,
    amount: [amount ?? "0.01"],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const transactionId = transferResponse.data?.id;
  if (!transactionId) {
    return NextResponse.json(
      { error: "Transaction creation returned no id" },
      { status: 502 }
    );
  }

  const confirmed = await client.getTransaction({
    id: transactionId,
    waitForState: "CONFIRMED",
  });

  return NextResponse.json({
    transactionId,
    state: confirmed.data?.transaction?.state,
    txHash: confirmed.data?.transaction?.txHash,
  });
}
