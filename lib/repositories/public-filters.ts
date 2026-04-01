import "server-only";

import type { Prisma } from "@prisma/client";

import {
  CONTROLLED_ORDER_EMAIL_SUFFIXES,
  CONTROLLED_ORDER_NOTE_MARKERS,
  CONTROLLED_PAYMENT_METHODS,
  CONTROLLED_PAYMENT_PROVIDERS,
  CONTROLLED_PAYMENT_STATUS_DETAILS
} from "@/lib/local-validation";

const controlledOrderSignals = [
  {
    paymentProvider: {
      in: CONTROLLED_PAYMENT_PROVIDERS
    }
  },
  {
    paymentMethod: {
      in: CONTROLLED_PAYMENT_METHODS
    }
  },
  {
    paymentStatusDetail: {
      in: CONTROLLED_PAYMENT_STATUS_DETAILS
    }
  },
  ...CONTROLLED_ORDER_EMAIL_SUFFIXES.map((suffix) => ({
    customerEmail: {
      endsWith: suffix,
      mode: "insensitive" as const
    }
  })),
  ...CONTROLLED_ORDER_NOTE_MARKERS.map((marker) => ({
    notes: {
      contains: marker,
      mode: "insensitive" as const
    }
  }))
] satisfies Prisma.OrderWhereInput[];

export const nonDemoCustomerFacingOrderWhere = {
  NOT: controlledOrderSignals
} satisfies Prisma.OrderWhereInput;

export const controlledCustomerFacingOrderWhere = {
  OR: controlledOrderSignals
} satisfies Prisma.OrderWhereInput;

export const nonDemoStorefrontCampaignWhere = {
  NOT: [
    {
      slug: {
        in: ["hero-capsula-atlas", "banner-secundario-aurora", "hero-capsula-brasil-2026"]
      }
    },
    {
      internalTitle: {
        contains: "seed",
        mode: "insensitive"
      }
    }
  ]
} satisfies Prisma.CampaignWhereInput;
