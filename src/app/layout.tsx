import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "School Choice",
    template: "%s | School Choice",
  },
  description: "Schoolkeuze Amsterdam in Dutch and English.",
  applicationName: "School Choice",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "School Choice",
    images: [
      {
        url: "/favicon.ico",
        width: 256,
        height: 256,
      },
    ],
  },
  twitter: {
    card: "summary",
  },
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
