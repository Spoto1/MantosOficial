import type { Metadata } from "next";

import { resolveAppUrl } from "@/lib/runtime-config";

export const siteName = "Mantos Oficial";
export const siteTagline = "Camisas autorais com informação clara do catálogo ao pós-compra";
export const siteUrl = resolveAppUrl();
export const defaultDescription =
  "A Mantos Oficial reúne camisas e jerseys autorais com navegação clara, produto em destaque e acompanhamento consistente do catálogo ao pós-compra.";

export function absoluteUrl(path = "/", baseUrl = siteUrl) {
  return new URL(path, baseUrl).toString();
}

type BuildMetadataInput = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
};

export function buildMetadata({
  title,
  description = defaultDescription,
  path = "/",
  image = "/icon.svg",
  noIndex = false
}: BuildMetadataInput): Metadata {
  const resolvedTitle = `${title} | ${siteName}`;

  return {
    title: {
      absolute: resolvedTitle
    },
    description,
    alternates: {
      canonical: path
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName,
      title: resolvedTitle,
      description,
      url: path,
      images: [
        {
          url: image,
          alt: resolvedTitle
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [image]
    },
    robots: noIndex
      ? {
          index: false,
          follow: false
        }
      : {
          index: true,
          follow: true
        }
  };
}
