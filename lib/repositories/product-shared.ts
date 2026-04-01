import "server-only";

import { Prisma } from "@prisma/client";

import type { StorefrontProduct } from "@/lib/types";

export const storefrontProductInclude = Prisma.validator<Prisma.ProductInclude>()({
  category: true,
  collection: true,
  images: {
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }]
  },
  variants: {
    include: {
      size: true
    }
  }
});

export type ProductRecord = Prisma.ProductGetPayload<{
  include: typeof storefrontProductInclude;
}>;

export function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

export function buildGradient(from: string, via: string, to: string) {
  return `linear-gradient(135deg, ${from} 0%, ${via} 56%, ${to} 100%)`;
}

export function distributeStock(total: number, parts: number) {
  if (parts <= 0) {
    return [];
  }

  const base = Math.floor(total / parts);
  const remainder = total % parts;

  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function mapProductRecord(product: ProductRecord): StorefrontProduct {
  const orderedVariants = [...product.variants].sort((first, second) => {
    if (first.size.sortOrder !== second.size.sortOrder) {
      return first.size.sortOrder - second.size.sortOrder;
    }

    return first.colorName.localeCompare(second.colorName, "pt-BR");
  });

  const colors = [...new Set(orderedVariants.map((variant) => variant.colorName))];
  const sizes = [...new Set(orderedVariants.map((variant) => variant.size.label))];
  const imageUrls = product.images.map((image) => image.url);
  const image = imageUrls[0] ?? "/products/atlas-home.svg";

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    subtitle: product.shortDescription,
    description: product.description,
    price: decimalToNumber(product.price) ?? 0,
    compareAtPrice: decimalToNumber(product.compareAtPrice),
    stock: product.stock,
    country: product.country,
    season: product.season,
    type: product.type,
    collection: product.collection.name,
    collectionSlug: product.collection.slug,
    category: product.category.name,
    categorySlug: product.category.slug,
    fit: product.fit,
    material: product.material,
    badge: product.badgeLabel ?? undefined,
    gradient: buildGradient(product.accentFrom, product.accentVia, product.accentTo),
    palette: [product.primaryHex, product.secondaryHex],
    image,
    images: imageUrls,
    details: product.details,
    highlights: product.highlights,
    colors,
    sizes,
    variants: orderedVariants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      color: variant.colorName,
      size: variant.size.label,
      stock: variant.stock,
      available: variant.isActive && variant.stock > 0
    })),
    featured: product.isFeatured,
    isNew: product.isNew,
    isBestSeller: product.isBestSeller,
    isRetro: product.isRetro,
    isActive: product.isActive
  };
}
