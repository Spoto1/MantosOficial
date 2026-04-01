import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Sora } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { defaultDescription, siteName, siteTagline, siteUrl } from "@/lib/seo";
import { isLocalPreviewUrl, resolveAppUrlFromHeaders } from "@/lib/runtime-config";

import "./globals.css";

const sans = Sora({
  subsets: ["latin"],
  variable: "--font-sans"
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"]
});

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = isLocalPreviewUrl(siteUrl)
    ? new URL(resolveAppUrlFromHeaders(await headers()))
    : new URL(siteUrl);

  return {
    metadataBase,
    applicationName: siteName,
    title: {
      default: `${siteName} | ${siteTagline}`,
      template: `%s | ${siteName}`
    },
    description: defaultDescription,
    alternates: {
      canonical: "/"
    },
    keywords: [
      siteName,
      "camisas autorais",
      "jerseys autorais",
      "camisas de futebol",
      "loja de mantos",
      "catalogo de camisas",
      "loja de jerseys",
      "moda esportiva"
    ],
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: "/",
      siteName,
      title: `${siteName} | ${siteTagline}`,
      description: defaultDescription,
      images: [
        {
          url: "/icon.svg",
          alt: siteName
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} | ${siteTagline}`,
      description: defaultDescription,
      images: ["/icon.svg"]
    },
    icons: {
      icon: "/icon.svg"
    }
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className="bg-[#f8f7f4]" data-scroll-behavior="smooth" lang="pt-BR">
      <body className={`${sans.variable} ${display.variable} font-sans text-ink antialiased`}>
        <a className="skip-link" href="#main-content">
          Pular para o conteúdo
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
