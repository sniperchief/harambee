import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CreatePoolForm } from "@/components/CreatePoolForm";

export default async function NewPoolPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("harambee_session")?.value;

  if (!userId) {
    redirect("/login?next=/pools/new");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Create a pool</h1>
      <CreatePoolForm />
    </div>
  );
}
