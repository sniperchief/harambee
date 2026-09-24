import { redirect } from "next/navigation";
import { CreatePoolForm } from "@/components/CreatePoolForm";
import { TopNav } from "@/components/TopNav";
import { Section } from "@/components/design/Section";
import { getSessionUser, displayName } from "@/lib/session";

export default async function NewPoolPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/pools/new");

  return (
    <div className="min-h-screen">
      <TopNav walletAddress={user.modular_wallet_address} name={displayName(user)} />
      <main>
        <Section className="!pt-4">
          <div className="mx-auto max-w-[672px]">
            <CreatePoolForm />
          </div>
        </Section>
      </main>
    </div>
  );
}
