import type { MetadataRoute } from "next";

import { absoluteUrl, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/colecao",
          "/contato",
          "/faq",
          "/sobre",
          "/trocas",
          "/privacidade",
          "/termos",
          "/produto/"
        ],
        disallow: [
          "/admin",
          "/api",
          "/checkout",
          "/checkout/",
          "/checkout/success",
          "/checkout/failure",
          "/checkout/pending",
          "/favoritos",
          "/rastreio"
        ]
      }
    ],
    host: siteUrl,
    sitemap: absoluteUrl("/sitemap.xml")
  };
}
