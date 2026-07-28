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
  title: "Harambee — Pool together. Grow together. Achieve together.",
  description:
    "Harambee is the calm way for groups to pool money toward a shared goal — held safely, growing while it waits, released the moment you reach your target.",
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
