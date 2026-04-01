import type { MetadataRoute } from "next";

import { getProducts } from "@/lib/data";
import { resolveAppUrl } from "@/lib/runtime-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = resolveAppUrl();
  const products = await getProducts();

  return [
    "",
    "/colecao",
    "/contato",
    "/faq",
    "/sobre",
    "/trocas",
    "/privacidade",
    "/termos",
    ...products.map((product) => `/produto/${product.slug}`)
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7
  }));
}
