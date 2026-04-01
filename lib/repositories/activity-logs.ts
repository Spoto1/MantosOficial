import "server-only";

import { ActivityEntityType, type Prisma } from "@prisma/client";

import type { AdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function createActivityLog(input: {
  type: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  actor?: Pick<AdminSession, "adminId" | "email" | "name"> | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.activityLog.create({
    data: {
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      actorId: input.actor?.adminId ?? null,
      actorName: input.actor?.name ?? null,
      actorEmail: input.actor?.email ?? null,
      description: input.description,
      metadata: input.metadata
    }
  });
}

export async function getRecentActivityLogs(limit = 12) {
  return prisma.activityLog.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });
}

export async function getActivityLogs() {
  return prisma.activityLog.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });
}
