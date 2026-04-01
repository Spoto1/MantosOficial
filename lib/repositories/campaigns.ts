import "server-only";

import { CampaignPlacement, CampaignStatus, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  nonDemoAdminCampaignWhere,
  nonDemoAdminMediaAssetWhere
} from "@/lib/repositories/admin-filters";
import { nonDemoStorefrontCampaignWhere } from "@/lib/repositories/public-filters";
import { type CampaignInput, campaignSchema } from "@/lib/validators";

type CampaignWithRelations = Prisma.CampaignGetPayload<{
  include: {
    desktopAsset: true;
    mobileAsset: true;
    cardAsset: true;
    collection: true;
    category: true;
    product: true;
    createdBy: true;
    updatedBy: true;
  };
}>;

export function resolveCampaignLifecycle(campaign: {
  isActive: boolean;
  status: CampaignStatus;
  startsAt?: Date | null;
  endsAt?: Date | null;
}) {
  const now = new Date();

  if (!campaign.isActive || campaign.status === CampaignStatus.ARCHIVED) {
    return "inactive";
  }

  if (campaign.endsAt && campaign.endsAt < now) {
    return "expired";
  }

  if (campaign.startsAt && campaign.startsAt > now) {
    return "scheduled";
  }

  if (campaign.status === CampaignStatus.DRAFT) {
    return "draft";
  }

  if (campaign.status === CampaignStatus.PAUSED) {
    return "paused";
  }

  return "active";
}

function campaignInclude() {
  return {
    desktopAsset: true,
    mobileAsset: true,
    cardAsset: true,
    collection: true,
    category: true,
    product: true,
    createdBy: true,
    updatedBy: true
  } satisfies Prisma.CampaignInclude;
}

export async function getAdminCampaigns(filters?: {
  query?: string;
  status?: CampaignStatus | "ALL";
  type?: Prisma.CampaignWhereInput["type"] | "ALL";
  placement?: CampaignPlacement | "ALL";
}) {
  return prisma.campaign.findMany({
    where: {
      AND: [
        nonDemoAdminCampaignWhere,
        {
          status: filters?.status && filters.status !== "ALL" ? filters.status : undefined,
          type: filters?.type && filters.type !== "ALL" ? filters.type : undefined,
          placement: filters?.placement && filters.placement !== "ALL" ? filters.placement : undefined,
          OR: filters?.query
            ? [
                {
                  internalTitle: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  publicTitle: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  slug: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                }
              ]
            : undefined
        }
      ]
    },
    include: campaignInclude(),
    orderBy: [{ priority: "desc" }, { position: "asc" }, { updatedAt: "desc" }]
  });
}

export async function getCampaignById(id: string) {
  return prisma.campaign.findUnique({
    where: {
      id
    },
    include: campaignInclude()
  });
}

export async function getCampaignFormData() {
  const [collections, categories, products, assets] = await prisma.$transaction([
    prisma.collection.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.category.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true
      },
      orderBy: {
        name: "asc"
      }
    }),
    prisma.mediaAsset.findMany({
      where: nonDemoAdminMediaAssetWhere,
      orderBy: {
        createdAt: "desc"
      },
      take: 60
    })
  ]);

  return {
    collections,
    categories,
    products,
    assets
  };
}

export async function saveCampaign(
  input: CampaignInput,
  actor?: {
    adminId?: string | null;
  }
) {
  const parsed = campaignSchema.parse(input);
  const data = {
    internalTitle: parsed.internalTitle,
    slug: parsed.slug,
    type: parsed.type,
    placement: parsed.placement,
    status: parsed.status,
    publicTitle: parsed.publicTitle,
    publicSubtitle: parsed.publicSubtitle ?? null,
    description: parsed.description ?? null,
    ctaLabel: parsed.ctaLabel ?? null,
    ctaLink: parsed.ctaLink ?? null,
    desktopImageUrl: parsed.desktopImageUrl ?? null,
    mobileImageUrl: parsed.mobileImageUrl ?? null,
    cardImageUrl: parsed.cardImageUrl ?? null,
    desktopAssetId: parsed.desktopAssetId ?? null,
    mobileAssetId: parsed.mobileAssetId ?? null,
    cardAssetId: parsed.cardAssetId ?? null,
    position: parsed.position,
    startsAt: parsed.startsAt ?? null,
    endsAt: parsed.endsAt ?? null,
    isActive: parsed.isActive,
    priority: parsed.priority,
    accentColor: parsed.accentColor ?? null,
    isPrimary: parsed.isPrimary,
    collectionId: parsed.collectionId ?? null,
    categoryId: parsed.categoryId ?? null,
    productId: parsed.productId ?? null,
    updatedById: actor?.adminId ?? null
  } satisfies Prisma.CampaignUncheckedUpdateInput;

  if (parsed.id) {
    return prisma.campaign.update({
      where: {
        id: parsed.id
      },
      data,
      include: campaignInclude()
    });
  }

  return prisma.campaign.create({
    data: {
      ...data,
      createdById: actor?.adminId ?? null
    },
    include: campaignInclude()
  });
}

export async function getLiveCampaignsByPlacement(placements: CampaignPlacement[]) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      AND: [
        nonDemoStorefrontCampaignWhere,
        {
          placement: {
            in: placements
          },
          isActive: true,
          status: {
            in: [CampaignStatus.ACTIVE, CampaignStatus.SCHEDULED]
          }
        }
      ]
    },
    include: campaignInclude(),
    orderBy: [{ isPrimary: "desc" }, { priority: "desc" }, { position: "asc" }, { updatedAt: "desc" }]
  });

  return campaigns.filter((campaign) => resolveCampaignLifecycle(campaign) === "active");
}

export function pickPrimaryCampaign(
  campaigns: CampaignWithRelations[],
  placement: CampaignPlacement
) {
  return campaigns.find((campaign) => campaign.placement === placement) ?? null;
}
