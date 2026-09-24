import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavProgress } from "@/components/NavProgress";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
