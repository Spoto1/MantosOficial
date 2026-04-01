import "server-only";

import { AssetKind, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { nonDemoAdminMediaAssetWhere } from "@/lib/repositories/admin-filters";

export async function createMediaAsset(input: {
  label: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storageProvider?: string;
  storageKey?: string | null;
  kind?: AssetKind;
  uploadedById?: string | null;
}) {
  return prisma.mediaAsset.create({
    data: {
      label: input.label,
      originalName: input.originalName,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      url: input.url,
      storageProvider: input.storageProvider ?? "local-public",
      storageKey: input.storageKey ?? null,
      kind: input.kind ?? AssetKind.CAMPAIGN_IMAGE,
      uploadedById: input.uploadedById ?? null
    }
  });
}

export async function getMediaAssets(filters?: {
  query?: string;
  kind?: AssetKind | "ALL";
}) {
  return prisma.mediaAsset.findMany({
    where: {
      AND: [
        nonDemoAdminMediaAssetWhere,
        {
          kind: filters?.kind && filters.kind !== "ALL" ? filters.kind : undefined,
          OR: filters?.query
            ? [
                {
                  label: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  originalName: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                }
              ]
            : undefined
        }
      ]
    },
    include: {
      uploadedBy: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getMediaAssetById(id: string) {
  return prisma.mediaAsset.findUnique({
    where: {
      id
    }
  });
}
