import "server-only";

import type { Prisma } from "@prisma/client";

import { CONTROLLED_ORDER_EMAIL_SUFFIXES } from "@/lib/local-validation";
import {
  nonDemoCustomerFacingOrderWhere,
  nonDemoStorefrontCampaignWhere
} from "@/lib/repositories/public-filters";

const ADMIN_INTERNAL_EMAIL_SUFFIXES = [
  ...new Set([...CONTROLLED_ORDER_EMAIL_SUFFIXES, "@cliente.test", "@mantos-preview.test"])
] as const;

const ADMIN_SEED_ASSET_LABELS = ["Hero Brasil 2026", "Aurora Banner", "Hero Atlas"] as const;
const ADMIN_SEED_ASSET_FILES = [
  "brasil-2026-noite.svg",
  "aurora-away.svg",
  "atlas-home.svg"
] as const;
const ADMIN_ACTIVITY_MARKERS = [
  "seed",
  "demo",
  "smoke",
  "homologação local",
  "homologacao local",
  "validação local",
  "validacao local"
] as const;

export const nonDemoAdminOrderWhere = nonDemoCustomerFacingOrderWhere;
export const nonDemoAdminCampaignWhere = nonDemoStorefrontCampaignWhere;

export const nonDemoAdminLeadWhere = {
  NOT: ADMIN_INTERNAL_EMAIL_SUFFIXES.map((suffix) => ({
    email: {
      endsWith: suffix,
      mode: "insensitive" as const
    }
  }))
} satisfies Prisma.LeadWhereInput;

export const nonDemoAdminNewsletterWhere = {
  NOT: ADMIN_INTERNAL_EMAIL_SUFFIXES.map((suffix) => ({
    email: {
      endsWith: suffix,
      mode: "insensitive" as const
    }
  }))
} satisfies Prisma.NewsletterLeadWhereInput;

export const nonDemoAdminContactWhere = {
  NOT: ADMIN_INTERNAL_EMAIL_SUFFIXES.map((suffix) => ({
    email: {
      endsWith: suffix,
      mode: "insensitive" as const
    }
  }))
} satisfies Prisma.ContactLeadWhereInput;

export const nonDemoAdminActivityWhere = {
  NOT: [
    ...ADMIN_INTERNAL_EMAIL_SUFFIXES.map((suffix) => ({
      actorEmail: {
        endsWith: suffix,
        mode: "insensitive" as const
      }
    })),
    ...ADMIN_ACTIVITY_MARKERS.map((marker) => ({
      description: {
        contains: marker,
        mode: "insensitive" as const
      }
    }))
  ]
} satisfies Prisma.ActivityLogWhereInput;

export const nonDemoAdminMediaAssetWhere = {
  NOT: [
    {
      label: {
        in: [...ADMIN_SEED_ASSET_LABELS]
      }
    },
    {
      originalName: {
        in: [...ADMIN_SEED_ASSET_FILES]
      }
    },
    {
      fileName: {
        in: [...ADMIN_SEED_ASSET_FILES]
      }
    }
  ]
} satisfies Prisma.MediaAssetWhereInput;

