import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-4 text-center">
        <Image
          src="/harambee-favicon.png"
          alt="Harambee"
          width={72}
          height={72}
          className="rounded-2xl"
          priority
        />
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Harambee
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Group-pooling payments on Arc. Scaffolding in progress.
        </p>
      </main>
    </div>
  );
}
