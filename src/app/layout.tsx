import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schoolkeuze Amsterdam",
  description: "Zoek, filter en vergelijk middelbare scholen in Amsterdam.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by `next-intl` middleware; fallback keeps HTML valid.
  const h = await headers();
  const locale = h.get("x-next-intl-locale") ?? "nl";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
