import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { shouldUseSecureCookies } from "@/lib/runtime-config";
import type { CustomerIdentity } from "@/lib/types";

const CUSTOMER_COOKIE_NAME = "orbe-customer-session";
const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const SESSION_REFRESH_WINDOW_MS = 1000 * 60 * 60 * 12;

type CustomerSessionRecord = {
  customerId: string;
  expiresAt: Date;
  customer: CustomerIdentity;
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildCustomerIdentity(customer: {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
}) {
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    name: [customer.firstName, customer.lastName].filter(Boolean).join(" ")
  };
}

function buildLoginUrl(loginPath: string, nextPath: string) {
  const params = new URLSearchParams();
  params.set("next", nextPath);

  return `${loginPath}?${params.toString()}`;
}

async function deleteSessionByToken(token: string) {
  await prisma.customerSession.deleteMany({
    where: {
      tokenHash: hashSessionToken(token)
    }
  });
}

export function resolveSafeRedirectPath(value: string | null | undefined, fallback = "/conta") {
  const candidate = String(value ?? "").trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  return candidate;
}

export async function createCustomerSession(input: {
  customerId: string;
  userAgent?: string | null;
}) {
  const cookieStore = await cookies();
  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_TTL_SECONDS * 1000);

  await prisma.customerSession.create({
    data: {
      customerId: input.customerId,
      tokenHash: hashSessionToken(sessionToken),
      userAgent: input.userAgent ?? null,
      expiresAt,
      lastUsedAt: new Date()
    }
  });

  cookieStore.set({
    name: CUSTOMER_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: CUSTOMER_SESSION_TTL_SECONDS
  });

  return {
    token: sessionToken,
    expiresAt
  };
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;

  if (token) {
    await deleteSessionByToken(token);
  }

  cookieStore.delete(CUSTOMER_COOKIE_NAME);
}

export async function getCustomerSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.customerSession.findUnique({
    where: {
      tokenHash: hashSessionToken(sessionToken)
    },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true
        }
      }
    }
  });

  if (!session) {
    cookieStore.delete(CUSTOMER_COOKIE_NAME);
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.customerSession.delete({
      where: {
        id: session.id
      }
    });
    cookieStore.delete(CUSTOMER_COOKIE_NAME);

    return null;
  }

  if (!session.lastUsedAt || Date.now() - session.lastUsedAt.getTime() > SESSION_REFRESH_WINDOW_MS) {
    await prisma.customerSession.update({
      where: {
        id: session.id
      },
      data: {
        lastUsedAt: new Date()
      }
    });
  }

  return {
    customerId: session.customerId,
    expiresAt: session.expiresAt,
    customer: buildCustomerIdentity(session.customer)
  } satisfies CustomerSessionRecord;
}

export async function getCurrentCustomer() {
  const session = await getCustomerSession();

  return session?.customer ?? null;
}

export async function requireCustomerAuth(input?: {
  next?: string;
  loginPath?: string;
}) {
  const session = await getCustomerSession();

  if (session) {
    return session;
  }

  const nextPath = resolveSafeRedirectPath(input?.next, "/conta");
  const loginPath = input?.loginPath ?? "/entrar";

  redirect(buildLoginUrl(loginPath, nextPath));
}
