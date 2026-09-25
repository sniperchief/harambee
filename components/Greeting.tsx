"use client";

import { useSyncExternalStore } from "react";

// "Good morning / afternoon / evening, <name>" in the viewer's own timezone
// (just "Good evening" when the user hasn't set a username).
// The server can't know that timezone, so it renders a neutral "Welcome back"
// and the client swaps in the time-of-day greeting after hydration.
const noop = () => () => {};

function partOfDay(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Greeting({ name, className = "" }: { name: string | null; className?: string }) {
  const greeting = useSyncExternalStore(noop, partOfDay, () => "Welcome back");
  return (
    <p className={className}>
      {greeting}
      {name ? `, ${name}` : ""}
    </p>
  );
}
