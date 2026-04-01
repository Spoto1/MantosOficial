import "server-only";

import type Stripe from "stripe";
import {
  CouponType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ShippingStatus
} from "@prisma/client";

import {
  createStripeCheckoutSession,
  getStripeCheckoutSession
} from "@/lib/stripe";
import {
  appendLocalValidationContext,
  isControlledValidationOrder
} from "@/lib/local-validation";
import { fromCents, roundCurrency, toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { nonDemoAdminOrderWhere } from "@/lib/repositories/admin-filters";
import {
  controlledCustomerFacingOrderWhere,
  nonDemoCustomerFacingOrderWhere
} from "@/lib/repositories/public-filters";
import { getShippingQuote, type ShippingMethod } from "@/lib/shipping";
import {
  checkoutQuoteSchema,
  checkoutSchema,
  favoriteSchema,
  type CheckoutInput,
  type CheckoutQuoteInput
} from "@/lib/validators";

type ProductWithCheckoutRelations = Prisma.ProductGetPayload<{
  include: {
    images: {
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }];
    };
    variants: {
      include: {
        size: true;
      };
    };
  };
}>;

type ResolvedCheckoutLine = {
  item: CheckoutInput["items"][number];
  product: ProductWithCheckoutRelations;
  variant: ProductWithCheckoutRelations["variants"][number];
};

function buildOrderVisibilityWhere(input?: {
  includeControlled?: boolean;
  controlledOnly?: boolean;
}): Prisma.OrderWhereInput {
  if (input?.controlledOnly) {
    return controlledCustomerFacingOrderWhere;
  }

  if (input?.includeControlled) {
    return {
      OR: [nonDemoCustomerFacingOrderWhere, controlledCustomerFacingOrderWhere]
    };
  }

  return nonDemoCustomerFacingOrderWhere;
}

function buildOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `MNT-${stamp}${suffix}`;
}

function normalizeDigits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function splitName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);

  return {
    firstName: firstName ?? name,
    lastName: rest.join(" ") || null
  };
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function buildStripeProductDescription(item: {
  colorName: string;
  sizeLabel: string;
}) {
  return `${item.colorName} • ${item.sizeLabel}`;
}

function buildStripeImageList(imageUrl: string | null | undefined) {
  const normalized = String(imageUrl ?? "").trim();

  if (!normalized || normalized.startsWith("/")) {
    return undefined;
  }

  return [normalized];
}

function buildStripeUnitLines(order: {
  items: Array<{
    productName: string;
    colorName: string;
    sizeLabel: string;
    imageUrl: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
  }>;
}) {
  return order.items.flatMap((item) =>
    Array.from({ length: item.quantity }, () => ({
      name: item.productName,
      description: buildStripeProductDescription(item),
      imageUrl: item.imageUrl,
      baseUnitAmount: toCents(Number(item.unitPrice))
    }))
  );
}

function applyDiscountToStripeUnitLines(
  lines: Array<{
    name: string;
    description: string;
    imageUrl: string;
    baseUnitAmount: number;
  }>,
  discountAmountCents: number
) {
  let remainingDiscount = Math.max(0, discountAmountCents);
  let remainingBase = lines.reduce((sum, line) => sum + line.baseUnitAmount, 0);

  return lines.map((line, index) => {
    const isLastLine = index === lines.length - 1;
    const proportionalDiscount =
      remainingDiscount > 0 && remainingBase > 0
        ? Math.min(
            line.baseUnitAmount,
            isLastLine
              ? remainingDiscount
              : Math.round((line.baseUnitAmount / remainingBase) * remainingDiscount)
          )
        : 0;
    const resolvedDiscount = Math.min(line.baseUnitAmount, proportionalDiscount);

    remainingBase -= line.baseUnitAmount;
    remainingDiscount -= resolvedDiscount;

    return {
      ...line,
      unitAmount: Math.max(0, line.baseUnitAmount - resolvedDiscount)
    };
  });
}

function buildStripeCheckoutLineItems(input: {
  order: {
    items: Array<{
      productName: string;
      colorName: string;
      sizeLabel: string;
      imageUrl: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
    }>;
    shippingMethod: string;
  };
  quote: {
    discountAmount: number;
    shipping: {
      amount: number;
      label: string;
    };
  };
}) {
  const unitLines = buildStripeUnitLines(input.order);
  const discountedUnitLines = applyDiscountToStripeUnitLines(
    unitLines,
    toCents(input.quote.discountAmount)
  );
  const productLines: Stripe.Checkout.SessionCreateParams.LineItem[] = discountedUnitLines.map(
    (line) => ({
      quantity: 1,
      price_data: {
        currency: "brl",
        unit_amount: line.unitAmount,
        product_data: {
          name: line.name,
          description: line.description,
          images: buildStripeImageList(line.imageUrl)
        }
      }
    })
  );
  const shippingAmount = toCents(input.quote.shipping.amount);

  if (shippingAmount <= 0) {
    return productLines;
  }

  return [
    ...productLines,
    {
      quantity: 1,
      price_data: {
        currency: "brl",
        unit_amount: shippingAmount,
        product_data: {
          name: input.quote.shipping.label || "Entrega",
          description:
            input.order.shippingMethod === "pickup"
              ? "Retirada sem custo adicional."
              : "Serviço de entrega calculado no checkout."
        }
      }
    }
  ];
}

function mapStripeSessionStatuses(input: {
  session: Stripe.Checkout.Session;
  eventType?: string | null;
}) {
  if (input.eventType === "checkout.session.async_payment_succeeded") {
    return {
      orderStatus: OrderStatus.PAID,
      paymentStatus: PaymentStatus.PAID
    };
  }

  if (input.eventType === "checkout.session.async_payment_failed") {
    return {
      orderStatus: OrderStatus.FAILED,
      paymentStatus: PaymentStatus.FAILED
    };
  }

  if (input.eventType === "checkout.session.expired" || input.session.status === "expired") {
    return {
      orderStatus: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.CANCELLED
    };
  }

  if (input.session.payment_status === "paid" || input.session.payment_status === "no_payment_required") {
    return {
      orderStatus: OrderStatus.PAID,
      paymentStatus: PaymentStatus.PAID
    };
  }

  if (input.session.payment_status === "unpaid" && input.session.status === "complete") {
    return {
      orderStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING
    };
  }

  return {
    orderStatus: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING
  };
}

async function resolveCoupon(
  code: string | undefined,
  subtotalCents: number,
  client: Pick<typeof prisma, "coupon">
) {
  if (!code) {
    return {
      coupon: null,
      discountAmount: 0,
      discountAmountCents: 0,
      couponDescription: null
    };
  }

  const now = new Date();
  const coupon = await client.coupon.findFirst({
    where: {
      isActive: true,
      code: {
        equals: code,
        mode: "insensitive"
      },
      AND: [
        {
          OR: [{ startsAt: null }, { startsAt: { lte: now } }]
        },
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }]
        }
      ]
    }
  });

  if (!coupon) {
    throw new Error("Cupom inválido ou expirado.");
  }

  if (coupon.minimumOrderAmount && subtotalCents < toCents(Number(coupon.minimumOrderAmount))) {
    throw new Error("O subtotal não atende ao mínimo do cupom.");
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new Error("Este cupom já atingiu o limite de uso.");
  }

  const discountAmountCents =
    coupon.type === CouponType.PERCENTAGE
      ? Math.round(subtotalCents * (Number(coupon.value) / 100))
      : toCents(Number(coupon.value));
  const safeDiscountAmountCents = Math.min(subtotalCents, discountAmountCents);

  return {
    coupon,
    discountAmount: fromCents(safeDiscountAmountCents),
    discountAmountCents: safeDiscountAmountCents,
    couponDescription:
      coupon.type === CouponType.PERCENTAGE
        ? `${roundCurrency(Number(coupon.value))}% de desconto`
        : `${roundCurrency(Number(coupon.value)).toFixed(2)} off`
  };
}

async function resolveCheckoutLines(items: CheckoutQuoteInput["items"]) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds
      }
    },
    include: {
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }]
      },
      variants: {
        include: {
          size: true
        }
      }
    }
  });

  if (products.length !== productIds.length) {
    throw new Error("Um ou mais produtos do carrinho não foram encontrados.");
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  return items.map<ResolvedCheckoutLine>((item) => {
    const product = productMap.get(item.productId);

    if (!product || !product.isActive) {
      throw new Error("Produto indisponível para compra.");
    }

    const variant = item.variantId
      ? product.variants.find((currentVariant) => currentVariant.id === item.variantId)
      : product.variants.find(
          (currentVariant) =>
            currentVariant.colorName === item.color && currentVariant.size.label === item.size
        );

    if (!variant || !variant.isActive) {
      throw new Error(`A combinação ${item.color} / ${item.size} não está disponível.`);
    }

    if (variant.stock < item.quantity || product.stock < item.quantity) {
      throw new Error(`Estoque insuficiente para ${product.name}.`);
    }

    return {
      item,
      product,
      variant
    };
  });
}

type OrderForApproval = Prisma.OrderGetPayload<{
  include: {
    coupon: true;
    items: true;
  };
}>;

function shouldPreserveCurrentPaymentState(
  order: Pick<OrderForApproval, "status" | "paymentStatus">,
  mappedStatus: {
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
  }
) {
  const nextIsPendingLike =
    mappedStatus.paymentStatus === PaymentStatus.PENDING ||
    mappedStatus.paymentStatus === PaymentStatus.AUTHORIZED;
  const currentIsFailureLike =
    order.paymentStatus === PaymentStatus.FAILED ||
    order.paymentStatus === PaymentStatus.CANCELLED;

  if (
    order.paymentStatus === PaymentStatus.PAID &&
    nextIsPendingLike
  ) {
    return true;
  }

  if (currentIsFailureLike && nextIsPendingLike) {
    return true;
  }

  if (order.paymentStatus === PaymentStatus.REFUNDED && mappedStatus.paymentStatus !== PaymentStatus.REFUNDED) {
    return true;
  }

  return false;
}

async function claimInventoryCommit(
  transaction: Prisma.TransactionClient,
  orderId: string,
  claimedAt: Date
) {
  const result = await transaction.order.updateMany({
    where: {
      id: orderId,
      inventoryCommittedAt: null
    },
    data: {
      inventoryCommittedAt: claimedAt
    }
  });

  return result.count === 1;
}

async function decrementInventorySafely(
  transaction: Prisma.TransactionClient,
  order: Pick<OrderForApproval, "items">
) {
  for (const item of order.items) {
    const productResult = await transaction.product.updateMany({
      where: {
        id: item.productId,
        stock: {
          gte: item.quantity
        }
      },
      data: {
        stock: {
          decrement: item.quantity
        }
      }
    });

    if (productResult.count !== 1) {
      throw new Error(`Estoque insuficiente para ${item.productName}.`);
    }

    if (item.variantId) {
      const variantResult = await transaction.productVariant.updateMany({
        where: {
          id: item.variantId,
          stock: {
            gte: item.quantity
          }
        },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      });

      if (variantResult.count !== 1) {
        throw new Error(`Estoque insuficiente para a variação ${item.sku}.`);
      }
    }
  }
}

async function claimCouponRedemption(
  transaction: Prisma.TransactionClient,
  orderId: string,
  claimedAt: Date
) {
  const result = await transaction.order.updateMany({
    where: {
      id: orderId,
      couponRedeemedAt: null
    },
    data: {
      couponRedeemedAt: claimedAt
    }
  });

  return result.count === 1;
}

async function incrementCouponUsageSafely(
  transaction: Prisma.TransactionClient,
  coupon: NonNullable<OrderForApproval["coupon"]>
) {
  if (coupon.usageLimit === null) {
    await transaction.coupon.update({
      where: {
        id: coupon.id
      },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });

    return;
  }

  const result = await transaction.coupon.updateMany({
    where: {
      id: coupon.id,
      usageCount: {
        lt: coupon.usageLimit
      }
    },
    data: {
      usageCount: {
        increment: 1
      }
    }
  });

  if (result.count !== 1) {
    throw new Error("O cupom já atingiu o limite de uso para reconciliação segura.");
  }
}

async function finalizeApprovedOrder(
  transaction: Prisma.TransactionClient,
  order: OrderForApproval,
  processedAt: Date
) {
  const inventoryClaimed = await claimInventoryCommit(transaction, order.id, processedAt);

  if (inventoryClaimed) {
    await decrementInventorySafely(transaction, order);
  }

  if (order.coupon) {
    const couponClaimed = await claimCouponRedemption(transaction, order.id, processedAt);

    if (couponClaimed) {
      await incrementCouponUsageSafely(transaction, order.coupon);
    }
  }
}

export async function quoteCheckout(input: CheckoutQuoteInput) {
  const parsed = checkoutQuoteSchema.parse(input);
  const lines = await resolveCheckoutLines(parsed.items);
  const subtotalCents = lines.reduce(
    (total, entry) => total + toCents(Number(entry.product.price)) * entry.item.quantity,
    0
  );
  const subtotal = fromCents(subtotalCents);
  const shipping = getShippingQuote(parsed.shipping, subtotal);
  const shippingAmount = fromCents(toCents(shipping.amount));
  const { coupon, couponDescription, discountAmount, discountAmountCents } = await resolveCoupon(
    parsed.couponCode,
    subtotalCents,
    prisma
  );
  const total = fromCents(
    Math.max(0, subtotalCents + toCents(shippingAmount) - discountAmountCents)
  );

  return {
    lines,
    subtotal,
    shipping: {
      ...shipping,
      amount: shippingAmount
    },
    coupon,
    couponDescription,
    discountAmount,
    total
  };
}

export async function createPendingOrder(
  input: CheckoutInput,
  options?: {
    paymentProvider?: string;
    paymentMethod?: string;
    customerId?: string;
  }
) {
  const parsed = checkoutSchema.parse(input);
  const quote = await quoteCheckout({
    items: parsed.items,
    shipping: parsed.shipping,
    couponCode: parsed.couponCode
  });

  if (toCents(quote.total) <= 0) {
    throw new Error("O total do pedido precisa ser maior que zero para seguir para o pagamento.");
  }

  const { firstName, lastName } = splitName(parsed.name);
  const document = normalizeDigits(parsed.cpf);
  const phone = normalizeDigits(parsed.phone) || parsed.phone;
  const orderNumber = buildOrderNumber();
  const externalReference = orderNumber;

  const createdOrder = await prisma.$transaction(async (transaction) => {
    const customer = options?.customerId
      ? await transaction.customer.update({
          where: {
            id: options.customerId
          },
          data: {
            firstName,
            lastName,
            phone,
            document: document || null
          }
        })
      : await transaction.customer.upsert({
          where: {
            email: parsed.email
          },
          update: {
            firstName,
            lastName,
            phone,
            document: document || null
          },
          create: {
            email: parsed.email,
            firstName,
            lastName,
            phone,
            document: document || null
          }
        });

    const address = await transaction.address.create({
      data: {
        customerId: customer.id,
        label: "Checkout",
        recipientName: parsed.name,
        line1: parsed.address,
        line2: [parsed.complement, parsed.reference].filter(Boolean).join(" • ") || null,
        city: parsed.city,
        state: parsed.state,
        postalCode: normalizeDigits(parsed.postalCode) || parsed.postalCode,
        country: "Brasil",
        phone
      }
    });

    return transaction.order.create({
      data: {
        number: orderNumber,
        externalReference,
        customerId: customer.id,
        addressId: address.id,
        couponId: quote.coupon?.id,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        shippingStatus:
          parsed.shipping === "pickup" ? ShippingStatus.READY_TO_SHIP : ShippingStatus.PENDING,
        paymentProvider: options?.paymentProvider ?? "stripe",
        paymentMethod: options?.paymentMethod ?? "checkout_session",
        customerName: parsed.name,
        customerEmail: parsed.email,
        customerPhone: phone,
        customerDocument: document || null,
        shippingMethod: parsed.shipping,
        subtotal: toDecimal(quote.subtotal),
        discountAmount: toDecimal(quote.discountAmount),
        shippingAmount: toDecimal(quote.shipping.amount),
        total: toDecimal(quote.total),
        notes: parsed.reference ? `Referência: ${parsed.reference}` : null,
        items: {
          create: quote.lines.map(({ item, product, variant }) => ({
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            productSlug: product.slug,
            sku: variant.sku,
            unitPrice: product.price,
            quantity: item.quantity,
            sizeLabel: variant.size.label,
            colorName: variant.colorName,
            imageUrl: product.images[0]?.url ?? "/products/atlas-home.svg"
          }))
        }
      },
      include: {
        address: true,
        items: true
      }
    });
  });

  return {
    order: createdOrder,
    quote
  };
}

export async function createStripeCheckout(
  input: CheckoutInput,
  options?: {
    customerId?: string;
  }
) {
  const parsed = checkoutSchema.parse(input);
  const { order, quote } = await createPendingOrder(parsed, {
    customerId: options?.customerId
  });
  const checkoutSession = await createStripeCheckoutSession({
    orderId: order.id,
    externalReference: order.externalReference ?? order.number,
    orderNumber: order.number,
    customerId: order.customerId,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    lineItems: buildStripeCheckoutLineItems({
      order,
      quote
    }),
    metadata: {
      shippingMethod: order.shippingMethod,
      couponCode: quote.coupon?.code,
      couponDescription: quote.couponDescription
    }
  });
  const checkoutUrl = checkoutSession.url;

  if (!checkoutUrl) {
    throw new Error("Não foi possível obter a URL da etapa de pagamento.");
  }

  const updatedOrder = await prisma.order.update({
    where: {
      id: order.id
    },
    data: {
      paymentPreferenceId: checkoutSession.id,
      checkoutUrl
    }
  });

  return {
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.number,
    sessionId: checkoutSession.id,
    redirectUrl: checkoutUrl
  };
}

export async function createMockCheckout(
  input: CheckoutInput,
  options?: {
    customerId?: string;
  }
) {
  const parsed = checkoutSchema.parse(input);
  const { order } = await createPendingOrder(parsed, {
    paymentProvider: "stripe_demo",
    paymentMethod: "checkout_session_demo",
    customerId: options?.customerId
  });

  return {
    orderId: order.id,
    orderNumber: order.number,
    redirectUrl: appendLocalValidationContext(`/checkout/demo?order=${order.id}`, true),
    sessionId: null
  };
}

export async function reconcileStripeCheckoutSession(
  sessionId: string,
  options?: {
    expectedCustomerId?: string;
    expectedOrderId?: string | null;
    expectedExternalReference?: string | null;
    eventType?: string | null;
  }
) {
  const session = await getStripeCheckoutSession(sessionId);
  const externalReference = String(
    session.metadata?.externalReference ??
      session.metadata?.orderNumber ??
      session.client_reference_id ??
      ""
  ).trim();
  const orderIdFromMetadata = String(
    session.metadata?.orderId ?? session.client_reference_id ?? ""
  ).trim();

  const matchedOrder = await prisma.order.findFirst({
    where: {
      OR: [
        ...(orderIdFromMetadata ? [{ id: orderIdFromMetadata }] : []),
        ...(externalReference ? [{ externalReference }, { number: externalReference }] : []),
        { paymentPreferenceId: session.id }
      ]
    },
    select: {
      id: true
    }
  });

  if (!matchedOrder) {
    throw new Error("Pedido não encontrado para a sessão de pagamento recebida.");
  }

  const updatedOrder = await prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: {
        id: matchedOrder.id
      },
      include: {
        coupon: true,
        items: true
      }
    });

    if (!order) {
      throw new Error("Pedido não encontrado para reconciliação.");
    }

    if (options?.expectedCustomerId && order.customerId !== options.expectedCustomerId) {
      throw new Error("O pagamento informado não pertence à sessão autenticada.");
    }

    if (options?.expectedOrderId && order.id !== options.expectedOrderId) {
      throw new Error("A sessão retornada não corresponde ao pedido esperado.");
    }

    if (
      options?.expectedExternalReference &&
      ![order.externalReference, order.number].includes(options.expectedExternalReference)
    ) {
      throw new Error("A referência externa da sessão não corresponde ao pedido esperado.");
    }

    const processedAt = new Date();
    const incomingStatus = mapStripeSessionStatuses({
      session,
      eventType: options?.eventType
    });
    const mappedStatus = shouldPreserveCurrentPaymentState(order, incomingStatus)
      ? {
          orderStatus: order.status,
          paymentStatus: order.paymentStatus
        }
      : incomingStatus;

    if (mappedStatus.orderStatus === OrderStatus.PAID) {
      await finalizeApprovedOrder(transaction, order, processedAt);
    }

    return transaction.order.update({
      where: {
        id: order.id
      },
      data: {
        status: mappedStatus.orderStatus,
        paymentStatus: mappedStatus.paymentStatus,
        paymentProvider: "stripe",
        paymentPreferenceId: session.id,
        paymentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? order.paymentId,
        merchantOrderId: session.customer ? String(session.customer) : order.merchantOrderId,
        paymentMethod: order.paymentMethod ?? "checkout_session",
        paymentStatusDetail:
          options?.eventType ??
          session.payment_status ??
          session.status ??
          order.paymentStatusDetail,
        paidAt: mappedStatus.orderStatus === OrderStatus.PAID ? order.paidAt ?? processedAt : order.paidAt,
        shippingStatus:
          mappedStatus.orderStatus === OrderStatus.PAID && order.shippingMethod === "pickup"
            ? ShippingStatus.READY_TO_SHIP
            : order.shippingStatus
      },
      include: {
        address: true,
        coupon: true,
        items: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
  });

  return updatedOrder;
}

export async function markStripeCheckoutCancelled(input: {
  orderId?: string | null;
  externalReference?: string | null;
}) {
  const orderId = String(input.orderId ?? "").trim();
  const externalReference = String(input.externalReference ?? "").trim();

  if (!orderId && !externalReference) {
    return null;
  }

  return prisma.order.updateMany({
    where: {
      paymentProvider: "stripe",
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      OR: [
        ...(orderId ? [{ id: orderId }] : []),
        ...(externalReference ? [{ externalReference }, { number: externalReference }] : [])
      ]
    },
    data: {
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.CANCELLED,
      paymentStatusDetail: "checkout.session.cancelled"
    }
  });
}

export async function updateDemoOrderStatus(input: {
  orderId: string;
  outcome: "success" | "pending" | "failure";
  expectedCustomerId?: string;
}) {
  const order = await prisma.order.findUnique({
    where: {
      id: input.orderId
    },
    include: {
      coupon: true,
      items: true
    }
  });

  if (!order) {
    throw new Error("Pedido demo não encontrado.");
  }

  if (input.expectedCustomerId && order.customerId !== input.expectedCustomerId) {
    throw new Error("Este pedido interno não pertence à sessão autenticada.");
  }

  if (!isControlledValidationOrder(order)) {
    throw new Error("Este pedido não está disponível para homologação interna.");
  }

  return prisma.$transaction(async (transaction) => {
    if (input.outcome === "success") {
      const processedAt = new Date();
      await finalizeApprovedOrder(transaction, order, processedAt);

      return transaction.order.update({
        where: {
          id: order.id
        },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
          paymentStatusDetail: "demo-approved",
          paidAt: order.paidAt ?? processedAt,
          shippingStatus:
            order.shippingMethod === "pickup"
              ? ShippingStatus.READY_TO_SHIP
              : order.shippingStatus
        }
      });
    }

    if (input.outcome === "failure") {
      return transaction.order.update({
        where: {
          id: order.id
        },
        data: {
          status: OrderStatus.FAILED,
          paymentStatus: PaymentStatus.FAILED,
          paymentStatusDetail: "demo-failed"
        }
      });
    }

    return transaction.order.update({
      where: {
        id: order.id
      },
      data: {
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentStatusDetail: "demo-pending"
      }
    });
  });
}

export async function getOrderByIdentifier(input: {
  orderId?: string | null;
  externalReference?: string | null;
}) {
  const orderId = String(input.orderId ?? "").trim();
  const externalReference = String(input.externalReference ?? "").trim();

  if (!orderId && !externalReference) {
    return null;
  }

  return prisma.order.findFirst({
    where: {
      OR: [
        ...(orderId ? [{ id: orderId }] : []),
        ...(externalReference ? [{ externalReference }, { number: externalReference }] : [])
      ]
    },
    include: {
      address: true,
      coupon: true,
      items: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });
}

export async function getTrackableOrder(input: {
  orderNumber?: string | null;
  email?: string | null;
  includeControlled?: boolean;
  controlledOnly?: boolean;
}) {
  const orderNumber = String(input.orderNumber ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();

  if (!orderNumber || !email) {
    return null;
  }

  return prisma.order.findFirst({
    where: {
      AND: [
        buildOrderVisibilityWhere({
          includeControlled: input.includeControlled,
          controlledOnly: input.controlledOnly
        }),
        {
          customerEmail: {
            equals: email,
            mode: "insensitive"
          },
          OR: [{ number: orderNumber }, { externalReference: orderNumber }]
        }
      ]
    },
    include: {
      address: true,
      coupon: true,
      items: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });
}

export async function createWebhookEvent(input: {
  provider: string;
  topic: string;
  action?: string | null;
  resourceId?: string | null;
  dedupeKey: string;
  requestId?: string | null;
  signatureVerified: boolean;
  payload: Prisma.InputJsonValue;
}) {
  try {
    const event = await prisma.webhookEvent.create({
      data: {
        provider: input.provider,
        topic: input.topic,
        action: input.action ?? null,
        resourceId: input.resourceId ?? null,
        dedupeKey: input.dedupeKey,
        requestId: input.requestId ?? null,
        signatureVerified: input.signatureVerified,
        payload: input.payload
      }
    });

    return {
      duplicate: false,
      event
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.webhookEvent.findUnique({
        where: {
          dedupeKey: input.dedupeKey
        }
      });

      return {
        duplicate: true,
        event: existing
      };
    }

    throw error;
  }
}

export async function markWebhookEventProcessed(eventId: string, orderId?: string | null) {
  return prisma.webhookEvent.update({
    where: {
      id: eventId
    },
    data: {
      processedAt: new Date(),
      orderId: orderId ?? null
    }
  });
}

export async function toggleFavorite(input: { customerId: string; productId: string }) {
  const parsed = favoriteSchema.parse(input);

  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      customerId_productId: {
        customerId: parsed.customerId,
        productId: parsed.productId
      }
    }
  });

  if (existingFavorite) {
    await prisma.favorite.delete({
      where: {
        customerId_productId: {
          customerId: parsed.customerId,
          productId: parsed.productId
        }
      }
    });

    return {
      saved: false
    };
  }

  await prisma.favorite.create({
    data: {
      customerId: parsed.customerId,
      productId: parsed.productId
    }
  });

  return {
    saved: true
  };
}

export async function getAdminOrders() {
  return prisma.order.findMany({
    where: nonDemoAdminOrderWhere,
    include: {
      customer: true,
      address: true,
      coupon: true,
      items: {
        orderBy: {
          createdAt: "asc"
        }
      },
      webhookEvents: {
        orderBy: {
          createdAt: "desc"
        },
        take: 3
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
