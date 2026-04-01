import "server-only";

import { AdminRole, AdminUserStatus } from "@prisma/client";

import { hashAdminPassword } from "@/lib/auth/admin-password";
import { prisma } from "@/lib/prisma";
import { adminUserSchema } from "@/lib/validators";

export async function getAdminUsers() {
  return prisma.adminUser.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });
}

export async function getAdminUserById(id: string) {
  return prisma.adminUser.findUnique({
    where: {
      id
    }
  });
}

export async function saveAdminUser(input: {
  id?: string;
  name: string;
  email: string;
  role: string;
  status: string;
  password?: string;
  requirePassword?: boolean;
}) {
  const parsed = adminUserSchema.parse(input);
  const data = {
    name: parsed.name,
    email: parsed.email.toLowerCase(),
    role: parsed.role as AdminRole,
    status: parsed.status as AdminUserStatus,
    passwordHash: parsed.password ? hashAdminPassword(parsed.password) : undefined
  };

  if (parsed.id) {
    return prisma.adminUser.update({
      where: {
        id: parsed.id
      },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        ...(data.passwordHash ? { passwordHash: data.passwordHash } : {})
      }
    });
  }

  return prisma.adminUser.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status,
      passwordHash: data.passwordHash ?? hashAdminPassword("change-me-123")
    }
  });
}
