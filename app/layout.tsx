import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { NavProgress } from "@/components/NavProgress";

// Body + UI text.
const dmSans = DM_Sans({
  variable: "--nf-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

// Display face — Roboto Slab stands in for Champ (DESIGN.md's listed
// substitute) until Champ is licensed. Variable, so 500 and 800 render true.
const slab = Roboto_Slab({
  variable: "--nf-roboto-slab",
  subsets: ["latin"],
  display: "swap",
});

// Ledger figures — addresses, precise amounts.
const dmMono = DM_Mono({
  variable: "--nf-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Harambee — Pool together. Give together. Achieve together.",
  description:
    "Harambee is the calm way for groups to pool USDC toward a shared goal — held in escrow, then released or refunded according to the pool's rules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${slab.variable} ${dmMono.variable} h-full`}>
      <body className="min-h-full">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
