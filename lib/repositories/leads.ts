import "server-only";

import { LeadStatus, LeadType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { nonDemoAdminLeadWhere } from "@/lib/repositories/admin-filters";
import { leadUpdateSchema } from "@/lib/validators";

export async function getLeads(filters?: {
  query?: string;
  type?: LeadType | "ALL";
  origin?: string;
  status?: LeadStatus | "ALL";
  dateFrom?: Date | null;
  dateTo?: Date | null;
}) {
  return prisma.lead.findMany({
    where: {
      AND: [
        nonDemoAdminLeadWhere,
        {
          type: filters?.type && filters.type !== "ALL" ? filters.type : undefined,
          status: filters?.status && filters.status !== "ALL" ? filters.status : undefined,
          origin: filters?.origin && filters.origin !== "ALL" ? filters.origin : undefined,
          createdAt:
            filters?.dateFrom || filters?.dateTo
              ? {
                  gte: filters.dateFrom ?? undefined,
                  lte: filters.dateTo ?? undefined
                }
              : undefined,
          OR: filters?.query
            ? [
                {
                  name: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  email: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  phone: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  message: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  context: {
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
      newsletterLead: true,
      contactLead: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: {
      id
    },
    include: {
      newsletterLead: true,
      contactLead: true
    }
  });
}

export async function getLeadOrigins() {
  const origins = await prisma.lead.findMany({
    where: nonDemoAdminLeadWhere,
    distinct: ["origin"],
    select: {
      origin: true
    },
    orderBy: {
      origin: "asc"
    }
  });

  return origins.map((item) => item.origin);
}

export async function updateLead(input: {
  id: string;
  status: string;
  internalNotes?: string;
}) {
  const parsed = leadUpdateSchema.parse(input);

  return prisma.lead.update({
    where: {
      id: parsed.id
    },
    data: {
      status: parsed.status,
      internalNotes: parsed.internalNotes || null
    }
  });
}
