import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hashCustomerPassword, verifyCustomerPassword } from "@/lib/auth/customer-password";
import {
  controlledCustomerFacingOrderWhere,
  nonDemoCustomerFacingOrderWhere
} from "@/lib/repositories/public-filters";
import {
  customerLoginSchema,
  customerRegistrationSchema,
  type CustomerLoginInput,
  type CustomerRegistrationInput
} from "@/lib/validators";

const customerFacingOrderInclude = {
  address: true,
  coupon: true,
  items: {
    orderBy: {
      createdAt: "asc"
    }
  }
} satisfies Prisma.OrderInclude;

function buildCustomerOrderVisibilityWhere(
  options?: { includeControlled?: boolean; controlledOnly?: boolean }
): Prisma.OrderWhereInput {
  if (options?.controlledOnly) {
    return controlledCustomerFacingOrderWhere;
  }

  if (options?.includeControlled) {
    return {
      OR: [nonDemoCustomerFacingOrderWhere, controlledCustomerFacingOrderWhere]
    };
  }

  return nonDemoCustomerFacingOrderWhere;
}

function splitCustomerName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);

  return {
    firstName: firstName ?? name.trim(),
    lastName: rest.join(" ") || null
  };
}

export async function registerCustomerAccount(input: CustomerRegistrationInput) {
  const parsed = customerRegistrationSchema.parse(input);
  const normalizedEmail = parsed.email.trim().toLowerCase();
  const { firstName, lastName } = splitCustomerName(parsed.name);
  const passwordHash = hashCustomerPassword(parsed.password);
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive"
      }
    }
  });

  if (existingCustomer?.passwordHash) {
    throw new Error("Já existe uma conta com este e-mail. Entre para continuar.");
  }

  const customer =
    existingCustomer
      ? await prisma.customer.update({
          where: {
            id: existingCustomer.id
          },
          data: {
            email: normalizedEmail,
            firstName,
            lastName,
            passwordHash
          }
        })
      : await prisma.customer.create({
          data: {
            email: normalizedEmail,
            firstName,
            lastName,
            passwordHash
          }
        });

  return customer;
}

export async function authenticateCustomerCredentials(input: CustomerLoginInput) {
  const parsed = customerLoginSchema.parse(input);
  const normalizedEmail = parsed.email.trim().toLowerCase();
  const customer = await prisma.customer.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive"
      }
    }
  });

  if (!customer || !verifyCustomerPassword(parsed.password, customer.passwordHash)) {
    return null;
  }

  await prisma.customer.update({
    where: {
      id: customer.id
    },
    data: {
      lastLoginAt: new Date()
    }
  });

  return customer;
}

export async function getCustomerOrders(
  customerId: string,
  options?: {
    includeControlled?: boolean;
    controlledOnly?: boolean;
  }
) {
  return prisma.order.findMany({
    where: {
      AND: [buildCustomerOrderVisibilityWhere(options), { customerId }]
    },
    include: customerFacingOrderInclude,
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getCustomerControlledOrders(customerId: string) {
  return prisma.order.findMany({
    where: {
      AND: [controlledCustomerFacingOrderWhere, { customerId }]
    },
    include: customerFacingOrderInclude,
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getCustomerOrderById(
  customerId: string,
  orderId: string,
  options?: {
    includeControlled?: boolean;
    controlledOnly?: boolean;
  }
) {
  return prisma.order.findFirst({
    where: {
      AND: [buildCustomerOrderVisibilityWhere(options), { id: orderId, customerId }]
    },
    include: customerFacingOrderInclude
  });
}

export async function getCustomerOrderByIdentifier(input: {
  customerId: string;
  orderId?: string | null;
  externalReference?: string | null;
  includeControlled?: boolean;
  controlledOnly?: boolean;
}) {
  const orderId = String(input.orderId ?? "").trim();
  const externalReference = String(input.externalReference ?? "").trim();

  if (!orderId && !externalReference) {
    return null;
  }

  return prisma.order.findFirst({
    where: {
      AND: [
        buildCustomerOrderVisibilityWhere({
          includeControlled: input.includeControlled,
          controlledOnly: input.controlledOnly
        }),
        {
          customerId: input.customerId,
          OR: [
            ...(orderId ? [{ id: orderId }] : []),
            ...(externalReference ? [{ externalReference }, { number: externalReference }] : [])
          ]
        }
      ]
    },
    include: customerFacingOrderInclude
  });
}

export async function getCustomerControlledOrderByIdentifier(input: {
  customerId: string;
  orderId?: string | null;
  externalReference?: string | null;
}) {
  return getCustomerOrderByIdentifier({
    ...input,
    controlledOnly: true
  });
}
