import type { Metadata } from "next";
import { Archivo, DM_Mono } from "next/font/google";
import "./globals.css";
import { NavProgress } from "@/components/NavProgress";

// One family for the whole site. Archivo stands in for Champ (the heavy,
// slightly wide grotesk in DESIGN.md) until Champ is licensed: set in 800
// and a touch wide for headings, regular for body and UI. Variable, with the
// width axis, so every weight and the wider cut render true.
const archivo = Archivo({
  variable: "--nf-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
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
  title: "Harambee — Raise money together, from anywhere",
  description:
    "Harambee is a global fundraising platform. Create a fundraiser, share one link, and receive USDC contributions from people in any country — with progress in real time and funds held in escrow until the fundraiser's rules are met.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${dmMono.variable} h-full`}>
      <body className="min-h-full">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
