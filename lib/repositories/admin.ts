import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  nonDemoAdminActivityWhere,
  nonDemoAdminCampaignWhere,
  nonDemoAdminContactWhere,
  nonDemoAdminLeadWhere,
  nonDemoAdminMediaAssetWhere,
  nonDemoAdminNewsletterWhere,
  nonDemoAdminOrderWhere
} from "@/lib/repositories/admin-filters";
import { getKanbanDashboardSummary } from "@/lib/repositories/kanban";
import { distributeStock, storefrontProductInclude } from "@/lib/repositories/product-shared";
import {
  type AdminProductInput,
  adminOrderStatusSchema,
  adminProductSchema,
  adminStockSchema,
  adminToggleProductSchema
} from "@/lib/validators";

async function ensureSizes(labels: string[]) {
  const normalizedLabels = [...new Set(labels.map((label) => label.trim().toUpperCase()))];
  const existingSizes = await prisma.size.findMany({
    where: {
      label: {
        in: normalizedLabels
      }
    },
    orderBy: {
      sortOrder: "asc"
    }
  });
  const existingMap = new Map(existingSizes.map((size) => [size.label, size]));

  const currentMaxSort =
    (await prisma.size.aggregate({
      _max: {
        sortOrder: true
      }
    }))._max.sortOrder ?? 0;

  let sortOrder = currentMaxSort;

  for (const label of normalizedLabels) {
    if (!existingMap.has(label)) {
      sortOrder += 1;
      const created = await prisma.size.create({
        data: {
          label,
          sortOrder
        }
      });

      existingMap.set(label, created);
    }
  }

  return existingMap;
}

type VariantWrite = {
  colorName: string;
  sku: string;
  stock: number;
  sizeId: string;
  isActive: boolean;
};

function buildVariantWrites(input: AdminProductInput, sizeMap: Map<string, { id: string }>) {
  const colorValues = [...new Set(input.colors.map((color) => color.trim()))];
  const sizeValues = [...new Set(input.sizes.map((size) => size.trim().toUpperCase()))];
  const combinations = colorValues.flatMap((color) =>
    sizeValues.map((size) => ({
      color,
      size
    }))
  );
  const stockDistribution = distributeStock(input.stock, combinations.length);

  return combinations.map<VariantWrite>((combination, index) => ({
    colorName: combination.color,
    sku: `${input.sku}-${combination.color.slice(0, 3).toUpperCase()}-${combination.size}`,
    stock: stockDistribution[index] ?? 0,
    sizeId: sizeMap.get(combination.size)?.id ?? Array.from(sizeMap.values())[0].id,
    isActive: input.isActive
  }));
}

function buildImageWrites(parsed: AdminProductInput) {
  return parsed.imageUrls.map((url, index) => ({
    url,
    alt: parsed.name,
    sortOrder: index,
    isPrimary: index === 0
  }));
}

function shouldPreserveVariantStocks(input: {
  existingStock: number;
  nextStock: number;
  existingSkus: string[];
  nextSkus: string[];
}) {
  if (input.existingStock !== input.nextStock) {
    return false;
  }

  if (input.existingSkus.length !== input.nextSkus.length) {
    return false;
  }

  const existingSet = new Set(input.existingSkus);
  return input.nextSkus.every((sku) => existingSet.has(sku));
}

export async function getAdminDashboardData() {
  const now = new Date();
  const pendingThreshold = new Date(now.getTime() - 1000 * 60 * 60 * 48);
  const [
    productCount,
    activeProductCount,
    outOfStockCount,
    orderCount,
    pendingOrderCount,
    paidOrderCount,
    leadCount,
    newsletterCount,
    contactCount,
    activeCampaignCount,
    paidOrdersSummary,
    recentOrders,
    topSellingProducts,
    lowStockProducts,
    activeCoupons,
    recentLeads,
    recentContacts,
    recentCampaigns,
    recentUploads,
    expiredCampaigns,
    campaignsWithoutImages,
    oldPendingOrders,
    recentActivity,
    kanban
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({
      where: {
        isActive: true
      }
    }),
    prisma.product.count({
      where: {
        stock: {
          lte: 0
        }
      }
    }),
    prisma.order.count({
      where: nonDemoAdminOrderWhere
    }),
    prisma.order.count({
      where: {
        AND: [nonDemoAdminOrderWhere, { status: "PENDING" }]
      }
    }),
    prisma.order.count({
      where: {
        AND: [nonDemoAdminOrderWhere, { paymentStatus: "PAID" }]
      }
    }),
    prisma.lead.count({
      where: nonDemoAdminLeadWhere
    }),
    prisma.newsletterLead.count({
      where: nonDemoAdminNewsletterWhere
    }),
    prisma.contactLead.count({
      where: nonDemoAdminContactWhere
    }),
    prisma.campaign.count({
      where: {
        AND: [
          nonDemoAdminCampaignWhere,
          {
            isActive: true,
            status: {
              in: ["ACTIVE", "SCHEDULED"]
            }
          }
        ]
      }
    }),
    prisma.order.aggregate({
      where: {
        AND: [nonDemoAdminOrderWhere, { paymentStatus: "PAID" }]
      },
      _sum: {
        total: true
      },
      _avg: {
        total: true
      }
    }),
    prisma.order.findMany({
      where: nonDemoAdminOrderWhere,
      include: {
        customer: true,
        items: {
          take: 2,
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "productName", "productSlug"],
      where: {
        order: {
          AND: [nonDemoAdminOrderWhere, { paymentStatus: "PAID" }]
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: "desc"
        }
      },
      take: 5
    }),
    prisma.product.findMany({
      where: {
        stock: {
          lte: 5
        }
      },
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      take: 6
    }),
    prisma.coupon.findMany({
      where: {
        isActive: true
      },
      orderBy: [{ endsAt: "asc" }, { createdAt: "desc" }],
      take: 6
    }),
    prisma.lead.findMany({
      where: nonDemoAdminLeadWhere,
      orderBy: {
        createdAt: "desc"
      },
      take: 6
    }),
    prisma.contactLead.findMany({
      where: nonDemoAdminContactWhere,
      orderBy: {
        createdAt: "desc"
      },
      take: 6
    }),
    prisma.campaign.findMany({
      where: nonDemoAdminCampaignWhere,
      orderBy: {
        updatedAt: "desc"
      },
      take: 6
    }),
    prisma.mediaAsset.findMany({
      where: nonDemoAdminMediaAssetWhere,
      orderBy: {
        createdAt: "desc"
      },
      take: 6
    }),
    prisma.campaign.findMany({
      where: {
        AND: [
          nonDemoAdminCampaignWhere,
          {
            isActive: true,
            endsAt: {
              lt: now
            }
          }
        ]
      },
      orderBy: {
        endsAt: "desc"
      },
      take: 6
    }),
    prisma.campaign.findMany({
      where: {
        AND: [
          nonDemoAdminCampaignWhere,
          {
            OR: [
              {
                desktopImageUrl: null,
                desktopAssetId: null
              },
              {
                type: {
                  in: ["HERO", "SECONDARY_BANNER", "PROMO_CARD"]
                },
                mobileImageUrl: null,
                mobileAssetId: null
              }
            ]
          }
        ]
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 6
    }),
    prisma.order.findMany({
      where: {
        AND: [
          nonDemoAdminOrderWhere,
          {
            status: "PENDING",
            createdAt: {
              lt: pendingThreshold
            }
          }
        ]
      },
      orderBy: {
        createdAt: "asc"
      },
      take: 6
    }),
    prisma.activityLog.findMany({
      where: nonDemoAdminActivityWhere,
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    getKanbanDashboardSummary()
  ]);

  return {
    overview: {
      productCount,
      activeProductCount,
      outOfStockCount,
      orderCount,
      pendingOrderCount,
      paidOrderCount,
      leadCount,
      newsletterCount,
      contactCount,
      activeCampaignCount
    },
    commerce: {
      totalRevenue: Number(paidOrdersSummary._sum.total ?? 0),
      averageTicket: Number(paidOrdersSummary._avg.total ?? 0),
      recentOrders,
      topSellingProducts,
      lowStockProducts,
      activeCoupons
    },
    activity: {
      recentLeads,
      recentContacts,
      recentCampaigns,
      recentUploads,
      recentActivity
    },
    kanban,
    alerts: {
      outOfStockProducts: lowStockProducts.filter((product) => product.stock <= 0),
      lowStockProducts,
      expiredCampaigns,
      campaignsWithoutImages,
      oldPendingOrders
    }
  };
}

export async function getAdminProducts() {
  return prisma.product.findMany({
    include: {
      category: true,
      collection: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }]
      },
      variants: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getAdminProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: storefrontProductInclude
  });
}

export async function getAdminProductFormData() {
  const [collections, categories, sizes] = await prisma.$transaction([
    prisma.collection.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.size.findMany({ orderBy: { sortOrder: "asc" } })
  ]);

  return {
    collections,
    categories,
    sizes
  };
}

export async function saveAdminProduct(input: AdminProductInput) {
  const parsed = adminProductSchema.parse(input);
  const collection = await prisma.collection.upsert({
    where: { slug: parsed.collectionSlug },
    update: {
      name: parsed.collectionName,
      description: parsed.collectionDescription
    },
    create: {
      slug: parsed.collectionSlug,
      name: parsed.collectionName,
      description: parsed.collectionDescription
    }
  });
  const category = await prisma.category.upsert({
    where: { slug: parsed.categorySlug },
    update: {
      name: parsed.categoryName,
      description: parsed.categoryDescription
    },
    create: {
      slug: parsed.categorySlug,
      name: parsed.categoryName,
      description: parsed.categoryDescription
    }
  });
  const sizeMap = await ensureSizes(parsed.sizes);
  const variantWrites = buildVariantWrites(parsed, sizeMap);
  const imageWrites = buildImageWrites(parsed);

  if (parsed.id) {
    const existingProduct = await prisma.product.findUnique({
      where: {
        id: parsed.id
      },
      include: {
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }]
        },
        variants: {
          include: {
            size: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!existingProduct) {
      throw new Error("Produto não encontrado para edição.");
    }

    const preserveStocks = shouldPreserveVariantStocks({
      existingStock: existingProduct.stock,
      nextStock: parsed.stock,
      existingSkus: existingProduct.variants.map((variant) => variant.sku),
      nextSkus: variantWrites.map((variant) => variant.sku)
    });
    const existingVariantsBySku = new Map(
      existingProduct.variants.map((variant) => [variant.sku, variant])
    );
    const existingImagesByUrl = new Map(
      existingProduct.images.map((image) => [image.url, image])
    );
    const resolvedVariantWrites = variantWrites.map((variant) => {
      const existingVariant = existingVariantsBySku.get(variant.sku);

      if (!existingVariant || !preserveStocks) {
        return variant;
      }

      return {
        ...variant,
        stock: existingVariant.stock
      };
    });

    return prisma.$transaction(async (transaction) => {
      const product = await transaction.product.update({
        where: {
          id: parsed.id
        },
        data: {
          name: parsed.name,
          slug: parsed.slug,
          sku: parsed.sku,
          shortDescription: parsed.shortDescription,
          description: parsed.description,
          price: new Prisma.Decimal(parsed.price),
          compareAtPrice:
            parsed.compareAtPrice !== undefined ? new Prisma.Decimal(parsed.compareAtPrice) : null,
          stock: parsed.stock,
          country: parsed.country,
          season: parsed.season,
          type: parsed.type,
          fit: parsed.fit,
          material: parsed.material,
          badgeLabel: parsed.badgeLabel,
          accentFrom: parsed.accentFrom,
          accentVia: parsed.accentVia,
          accentTo: parsed.accentTo,
          primaryHex: parsed.primaryHex,
          secondaryHex: parsed.secondaryHex,
          details: parsed.details,
          highlights: parsed.highlights,
          isRetro: parsed.isRetro,
          isFeatured: parsed.isFeatured,
          isNew: parsed.isNew,
          isBestSeller: parsed.isBestSeller,
          isActive: parsed.isActive,
          collectionId: collection.id,
          categoryId: category.id
        }
      });

      const nextImageUrls = new Set(imageWrites.map((image) => image.url));
      const nextVariantSkus = new Set(resolvedVariantWrites.map((variant) => variant.sku));

      const imageOperations = imageWrites.map((image) => {
        const existingImage = existingImagesByUrl.get(image.url);

        if (existingImage) {
          return transaction.productImage.update({
            where: { id: existingImage.id },
            data: {
              alt: image.alt,
              sortOrder: image.sortOrder,
              isPrimary: image.isPrimary
            }
          });
        }

        return transaction.productImage.create({
          data: {
            productId: product.id,
            ...image
          }
        });
      });

      const removeImageIds = existingProduct.images
        .filter((image) => !nextImageUrls.has(image.url))
        .map((image) => image.id);

      const variantOperations = resolvedVariantWrites.map((variant) => {
        const existingVariant = existingVariantsBySku.get(variant.sku);

        if (existingVariant) {
          return transaction.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              colorName: variant.colorName,
              sizeId: variant.sizeId,
              stock: variant.stock,
              isActive: variant.isActive
            }
          });
        }

        return transaction.productVariant.create({
          data: {
            productId: product.id,
            ...variant
          }
        });
      });

      const removeVariantIds = existingProduct.variants
        .filter((variant) => !nextVariantSkus.has(variant.sku))
        .map((variant) => variant.id);

      await Promise.all(imageOperations);
      await Promise.all(variantOperations);

      if (removeImageIds.length > 0) {
        await transaction.productImage.deleteMany({
          where: {
            id: {
              in: removeImageIds
            }
          }
        });
      }

      if (removeVariantIds.length > 0) {
        await transaction.productVariant.deleteMany({
          where: {
            id: {
              in: removeVariantIds
            }
          }
        });
      }

      return product;
    });
  }

  return prisma.product.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      sku: parsed.sku,
      shortDescription: parsed.shortDescription,
      description: parsed.description,
      price: new Prisma.Decimal(parsed.price),
      compareAtPrice:
        parsed.compareAtPrice !== undefined ? new Prisma.Decimal(parsed.compareAtPrice) : null,
      stock: parsed.stock,
      country: parsed.country,
      season: parsed.season,
      type: parsed.type,
      fit: parsed.fit,
      material: parsed.material,
      badgeLabel: parsed.badgeLabel,
      accentFrom: parsed.accentFrom,
      accentVia: parsed.accentVia,
      accentTo: parsed.accentTo,
      primaryHex: parsed.primaryHex,
      secondaryHex: parsed.secondaryHex,
      details: parsed.details,
      highlights: parsed.highlights,
      isRetro: parsed.isRetro,
      isFeatured: parsed.isFeatured,
      isNew: parsed.isNew,
      isBestSeller: parsed.isBestSeller,
      isActive: parsed.isActive,
      collectionId: collection.id,
      categoryId: category.id,
      images: {
        create: imageWrites
      },
      variants: {
        create: variantWrites
      }
    }
  });
}

export async function toggleAdminProduct(input: { productId: string; isActive: string }) {
  const parsed = adminToggleProductSchema.parse(input);

  return prisma.product.update({
    where: {
      id: parsed.productId
    },
    data: {
      isActive: parsed.isActive,
      variants: {
        updateMany: {
          where: {},
          data: {
            isActive: parsed.isActive
          }
        }
      }
    }
  });
}

export async function updateAdminProductStock(input: { productId: string; stock: number }) {
  const parsed = adminStockSchema.parse(input);
  const variants = await prisma.productVariant.findMany({
    where: {
      productId: parsed.productId
    },
    orderBy: {
      createdAt: "asc"
    }
  });
  const stockDistribution = distributeStock(parsed.stock, variants.length);

  await prisma.$transaction([
    prisma.product.update({
      where: { id: parsed.productId },
      data: { stock: parsed.stock }
    }),
    ...variants.map((variant, index) =>
      prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: stockDistribution[index] ?? 0 }
      })
    )
  ]);
}

export async function updateAdminOrderStatuses(input: {
  orderId: string;
  status: string;
  paymentStatus: string;
  shippingStatus: string;
}) {
  const parsed = adminOrderStatusSchema.parse(input);

  return prisma.order.update({
    where: {
      id: parsed.orderId
    },
    data: {
      status: parsed.status,
      paymentStatus: parsed.paymentStatus,
      shippingStatus: parsed.shippingStatus
    }
  });
}
