import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { WalletCard, NotificationToggles } from "@/components/SettingsClient";
import { Section, SectionDivider } from "@/components/design/Section";
import { SurfaceCard } from "@/components/design/Card";
import { Tag } from "@/components/design/Tag";
import { pillClasses } from "@/components/design/PillButton";
import { getSessionUser, displayName } from "@/lib/session";
import { formatDate, shortAddress } from "@/lib/format";

// One settings group: Champ label + lead on the left, Surface Card on the right,
// ruled off from the previous group by a Section Divider.
function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionDivider className="mb-10" />
      <div className="grid gap-6 md:grid-cols-3 md:gap-12">
        <div>
          <h2 className="type-heading-sm">{title}</h2>
          {description && <p className="mt-2 text-body text-char">{description}</p>}
        </div>
        <SurfaceCard className="md:col-span-2">{children}</SurfaceCard>
      </div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/settings");
  const name = displayName(user);

  return (
    <div className="min-h-screen">
      <TopNav walletAddress={user.modular_wallet_address} name={name} />
      <main>
        <Section className="!pt-14" innerClassName="max-w-[1040px]">
          <p className="type-eyebrow">Account</p>
          <h1 className="type-display mt-3">Settings</h1>
          <p className="mt-4 text-body text-char">Manage your profile, wallet and preferences.</p>

          <div className="mt-12 space-y-12">
            <Group title="Profile" description="How you appear to people you pool with.">
              <p className="type-mono">{shortAddress(user.modular_wallet_address) || "Member"}</p>
              <p className="mt-2 text-body text-char">Joined {formatDate(user.created_at)}</p>
            </Group>

            <Group title="Wallet" description="Your self-custodial smart wallet, secured by your passkey.">
              <WalletCard address={user.modular_wallet_address} />
            </Group>

            <Group title="Notifications" description="Choose what you'd like to hear about.">
              <NotificationToggles />
            </Group>

            <Group title="Security" description="Your account is protected by a passkey on your device.">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-body font-medium">Passkey enabled</p>
                  <p className="text-body text-char">No password can be phished or leaked.</p>
                </div>
                <Tag tone="black">Active</Tag>
              </div>
            </Group>

            <Group title="Appearance" description="How Harambee looks on this device.">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-body font-medium">Theme</p>
                  <p className="text-body text-char">Harambee uses a warm, light theme for clarity.</p>
                </div>
                <Tag>Light</Tag>
              </div>
            </Group>

            <Group title="Account" description="Sign out of this device.">
              <form action="/api/auth/logout" method="post">
                <button type="submit" className={pillClasses({ variant: "black" })}>
                  Log out
                </button>
              </form>
            </Group>
          </div>
        </Section>
      </main>
    </div>
  );
}
