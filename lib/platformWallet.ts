// Wallet used to submit platform-triggered transactions (createPool,
// checkAndRelease) so the UI never needs to collect/expose a Circle wallet
// id from a visitor — only contribute()/refund() go through a visitor's own
// passkey wallet, since those are the only calls where msg.sender matters.
export function getPlatformWalletId(): string {
  const walletId = process.env.HARAMBEE_PLATFORM_WALLET_ID;
  if (!walletId) {
    throw new Error("Missing HARAMBEE_PLATFORM_WALLET_ID in .env.local");
  }
  return walletId;
}
