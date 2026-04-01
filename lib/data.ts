import { getCollectionSummaries, getFeaturedProducts as fetchFeaturedProducts, getRelatedProducts as fetchRelatedProducts, getStorefrontProductBySlug, getStorefrontProducts } from "@/lib/repositories/storefront";

export const sortOptions = [
  { label: "Destaques", value: "featured" },
  { label: "Menor preço", value: "price-asc" },
  { label: "Maior preço", value: "price-desc" }
] as const;

export async function getCollectionOptions() {
  const collections = await getCollectionSummaries();

  return [{ name: "Todos", slug: "all", productCount: 0 }, ...collections];
}

export async function getFeaturedProducts(limit = 3) {
  return fetchFeaturedProducts(limit);
}

export async function getProducts(options?: {
  collectionSlug?: string;
  sort?: (typeof sortOptions)[number]["value"];
}) {
  return getStorefrontProducts(options);
}

export async function getProductBySlug(slug: string) {
  return getStorefrontProductBySlug(slug);
}

export async function getRelatedProducts(slug: string, collectionSlug: string) {
  return fetchRelatedProducts(slug, collectionSlug);
}
