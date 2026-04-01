import "server-only";

import { prisma } from "@/lib/prisma";
import { storefrontProductInclude, mapProductRecord } from "@/lib/repositories/product-shared";
import type { StorefrontCollection } from "@/lib/types";

type ProductSort = "featured" | "price-asc" | "price-desc";

export async function getCollectionSummaries(): Promise<StorefrontCollection[]> {
  const collections = await prisma.collection.findMany({
    where: {
      products: {
        some: {
          isActive: true
        }
      }
    },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  return collections.map((collection) => ({
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    productCount: collection._count.products
  }));
}

export async function getFeaturedProducts(limit = 3) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isFeatured: true
    },
    include: storefrontProductInclude,
    take: limit,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return products.map(mapProductRecord);
}

export async function getStorefrontProducts(options?: {
  collectionSlug?: string;
  sort?: ProductSort;
}) {
  const sort = options?.sort ?? "featured";

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      collection: options?.collectionSlug
        ? {
            slug: options.collectionSlug
          }
        : undefined
    },
    include: storefrontProductInclude,
    orderBy:
      sort === "price-asc"
        ? [{ price: "asc" }]
        : sort === "price-desc"
          ? [{ price: "desc" }]
          : [{ isFeatured: "desc" }, { isBestSeller: "desc" }, { createdAt: "desc" }]
  });

  return products.map(mapProductRecord);
}

export async function getStorefrontProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      isActive: true
    },
    include: storefrontProductInclude
  });

  return product ? mapProductRecord(product) : null;
}

export async function getRelatedProducts(slug: string, collectionSlug: string) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      slug: {
        not: slug
      },
      collection: {
        slug: collectionSlug
      }
    },
    include: storefrontProductInclude,
    take: 3,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return products.map(mapProductRecord);
}

export async function getFavoriteProductsByCustomerId(customerId: string) {
  const favorites = await prisma.favorite.findMany({
    where: {
      customerId,
      product: {
        isActive: true
      }
    },
    include: {
      product: {
        include: storefrontProductInclude
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return favorites.map((favorite) => mapProductRecord(favorite.product));
}

export async function isFavoriteProductSaved(input: { customerId: string; productId: string }) {
  const favorite = await prisma.favorite.findFirst({
    where: {
      productId: input.productId,
      customerId: input.customerId
    },
    select: {
      id: true
    }
  });

  return Boolean(favorite);
}
