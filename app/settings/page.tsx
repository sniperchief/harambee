import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { WalletCard, NotificationToggles } from "@/components/SettingsClient";
import { getSessionUser, displayName } from "@/lib/session";
import { formatDate, shortAddress } from "@/lib/format";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 md:grid-cols-3 md:gap-8">
      <div className="md:col-span-1">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="md:col-span-2">
        <Card className="p-6">{children}</Card>
      </div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/settings");
  const name = displayName(user);

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav walletAddress={user.modular_wallet_address} name={name} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
        <h1 className="text-3xl font-bold tracking-tight text-navy">Settings</h1>
        <p className="mt-1 text-[15px] text-muted">Manage your profile, wallet and preferences.</p>

        <div className="mt-8 space-y-10">
          <Section title="Profile" description="How you appear to people you pool with.">
            <div className="flex items-center gap-4">
              <Avatar name={name} size={56} />
              <div className="min-w-0">
                <p className="font-semibold text-ink tnum">{shortAddress(user.modular_wallet_address) || "Member"}</p>
                <p className="text-sm text-muted">Joined {formatDate(user.created_at)}</p>
              </div>
            </div>
          </Section>

          <Section title="Wallet" description="Your self-custodial smart wallet, secured by your passkey.">
            <WalletCard address={user.modular_wallet_address} />
          </Section>

          <Section title="Notifications" description="Choose what you'd like to hear about.">
            <NotificationToggles />
          </Section>

          <Section title="Security" description="Your account is protected by a passkey on your device.">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-50 text-success">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">Passkey enabled</p>
                  <p className="text-sm text-muted">No password can be phished or leaked.</p>
                </div>
              </div>
              <Badge tone="success" dot>Active</Badge>
            </div>
          </Section>

          <Section title="Appearance" description="How Harambee looks on this device.">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Theme</p>
                <p className="text-sm text-muted">Harambee uses a calm, light theme for clarity.</p>
              </div>
              <Badge tone="muted">Light</Badge>
            </div>
          </Section>

          <Section title="Account" description="Sign out of this device.">
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-danger transition-colors hover:border-danger/30 hover:bg-danger-50"
              >
                Log out
              </button>
            </form>
          </Section>
        </div>
      </main>
    </div>
  );
}
