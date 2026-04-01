import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { AdminRole as PrismaAdminRole, AdminUserStatus } from "@prisma/client";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { shouldUseSecureCookies } from "@/lib/runtime-config";
import { verifyAdminPassword } from "@/lib/auth/admin-password";
import { prisma } from "@/lib/prisma";

const ADMIN_COOKIE_NAME = "orbe-admin-session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

export type AdminRole = "superadmin" | "admin" | "editor" | "marketing";
export type AdminPermission =
  | "dashboard"
  | "kanban"
  | "products"
  | "orders"
  | "leads"
  | "newsletter"
  | "contacts"
  | "campaigns"
  | "uploads"
  | "admins"
  | "logs";

export type AdminSession = {
  adminId?: string | null;
  email: string;
  name: string;
  role: AdminRole;
  source: "env" | "database";
  expiresAt: number;
};

type AdminSessionPayload = AdminSession & {
  passwordDigest: string;
};

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  superadmin: [
    "dashboard",
    "kanban",
    "products",
    "orders",
    "leads",
    "newsletter",
    "contacts",
    "campaigns",
    "uploads",
    "admins",
    "logs"
  ],
  admin: [
    "dashboard",
    "kanban",
    "products",
    "orders",
    "leads",
    "newsletter",
    "contacts",
    "campaigns",
    "uploads",
    "logs"
  ],
  editor: ["dashboard", "kanban", "products", "campaigns", "uploads", "logs"],
  marketing: [
    "dashboard",
    "kanban",
    "leads",
    "newsletter",
    "contacts",
    "campaigns",
    "uploads",
    "logs"
  ]
};

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function getAdminSessionSecret() {
  const configuredSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "__mantos-admin-dev-session__";
  }

  return "";
}

function getBootstrapAdminIdentity() {
  return {
    email: process.env.ADMIN_EMAIL?.trim() || "owner@mantos.local",
    name: process.env.ADMIN_NAME?.trim() || "Admin Mantos",
    role: "superadmin" as const
  };
}

async function isAdminBootstrapEnabled() {
  const passwordConfigured = Boolean(getAdminPassword());

  if (!passwordConfigured) {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  if (process.env.ENABLE_ADMIN_BOOTSTRAP !== "true") {
    return false;
  }

  const activeAdminCount = await prisma.adminUser.count({
    where: {
      status: AdminUserStatus.ACTIVE
    }
  });

  return activeAdminCount === 0;
}

function getPasswordDigest() {
  return createHash("sha256").update(getAdminPassword()).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createSignature(value: string) {
  const secret = getAdminSessionSecret();

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET é obrigatório em produção.");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

function encodeSession(payload: AdminSessionPayload) {
  const serializedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createSignature(serializedPayload);

  return `${serializedPayload}.${signature}`;
}

function decodeSession(cookieValue: string | undefined) {
  if (!cookieValue) {
    return null;
  }

  const [serializedPayload, signature] = cookieValue.split(".");

  if (!serializedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(serializedPayload);

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(serializedPayload, "base64url").toString("utf8")
    ) as AdminSessionPayload;

    if (payload.passwordDigest !== getPasswordDigest()) {
      return null;
    }

    if (payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isAdminPasswordValid(password: string) {
  const expected = getAdminPassword();

  if (!expected) {
    return false;
  }

  return safeCompare(password, expected);
}

export function adminHasPermission(session: Pick<AdminSession, "role">, permission: AdminPermission) {
  return ROLE_PERMISSIONS[session.role]?.includes(permission) ?? false;
}

export function adminCanManageKanban(session: Pick<AdminSession, "role">) {
  return session.role === "superadmin" || session.role === "admin";
}

function mapPrismaRole(role: PrismaAdminRole): AdminRole {
  switch (role) {
    case PrismaAdminRole.SUPERADMIN:
      return "superadmin";
    case PrismaAdminRole.EDITOR:
      return "editor";
    case PrismaAdminRole.MARKETING:
      return "marketing";
    default:
      return "admin";
  }
}

export async function authenticateAdminCredentials(input: {
  email?: string | null;
  password: string;
}) {
  const normalizedEmail = String(input.email ?? "").trim().toLowerCase();
  const bootstrapIdentity = getBootstrapAdminIdentity();
  const bootstrapEnabled = await isAdminBootstrapEnabled();

  if (normalizedEmail) {
    const admin = await prisma.adminUser.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive"
        },
        status: AdminUserStatus.ACTIVE
      }
    });

    if (admin && verifyAdminPassword(input.password, admin.passwordHash)) {
      await prisma.adminUser.update({
        where: {
          id: admin.id
        },
        data: {
          lastLoginAt: new Date()
        }
      });

      return {
        adminId: admin.id,
        email: admin.email,
        name: admin.name,
        role: mapPrismaRole(admin.role),
        source: "database" as const
      };
    }
  }

  if (
    bootstrapEnabled &&
    isAdminPasswordValid(input.password) &&
    (!normalizedEmail || normalizedEmail === bootstrapIdentity.email.toLowerCase())
  ) {
    return {
      adminId: null,
      email: bootstrapIdentity.email,
      name: bootstrapIdentity.name,
      role: bootstrapIdentity.role,
      source: "env" as const
    };
  }

  return null;
}

export async function createAdminSession(input?: Omit<AdminSession, "expiresAt">) {
  const cookieStore = await cookies();
  const now = Date.now();
  const identity = getBootstrapAdminIdentity();
  const session: AdminSessionPayload = {
    adminId: input?.adminId ?? null,
    email: input?.email ?? identity.email,
    name: input?.name ?? identity.name,
    role: input?.role ?? identity.role,
    source: input?.source ?? "env",
    expiresAt: now + ADMIN_SESSION_TTL_SECONDS * 1000,
    passwordDigest: getPasswordDigest()
  };

  cookieStore.set({
    name: ADMIN_COOKIE_NAME,
    value: encodeSession(session),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS
  });

  return session;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const payload = decodeSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!payload) {
    return null;
  }

  const { passwordDigest: _passwordDigest, ...session } = payload;

  return session;
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession());
}

export async function requireAdminAuth(permission?: AdminPermission) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin");
  }

  if (permission && !adminHasPermission(session, permission)) {
    redirect("/admin?error=forbidden");
  }

  return session;
}
