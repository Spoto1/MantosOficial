import "server-only";

import Stripe from "stripe";

import {
  assertStripeEnvironmentPairing,
  assertStripeWebhookSecurity,
  isStripeConfigured as isStripeCheckoutConfigured,
  isStripeSecretKeyConfigured,
  resolveAppUrl
} from "@/lib/runtime-config";

function normalizeStripeMetadata(
  metadata?: Record<string, string | number | boolean | null | undefined>
) {
  return Object.fromEntries(
    Object.entries(metadata ?? {})
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
      .map(([key, value]) => [key, String(value)])
  );
}

function resolveStripePaymentMethodTypes() {
  const configured = String(process.env.STRIPE_PAYMENT_METHOD_TYPES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length > 0
    ? (configured as Stripe.Checkout.SessionCreateParams.PaymentMethodType[])
    : undefined;
}

function getStripeClient() {
  assertStripeEnvironmentPairing();

  const secretKey = String(process.env.STRIPE_SECRET_KEY ?? "").trim();

  if (!secretKey) {
    throw new Error("Stripe não configurado. Defina STRIPE_SECRET_KEY.");
  }

  return new Stripe(secretKey);
}

export function isStripeConfigured() {
  return isStripeCheckoutConfigured();
}

export function isStripeServerConfigured() {
  return isStripeSecretKeyConfigured();
}

type CreateStripeCheckoutSessionInput = {
  orderId: string;
  externalReference: string;
  orderNumber: string;
  customerId?: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export async function createStripeCheckoutSession(input: CreateStripeCheckoutSessionInput) {
  assertStripeWebhookSecurity();

  const stripe = getStripeClient();
  const appUrl = resolveAppUrl();
  const metadata = normalizeStripeMetadata({
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    externalReference: input.externalReference,
    customerId: input.customerId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    ...input.metadata
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.orderId,
    customer_email: input.customerEmail,
    billing_address_collection: "auto",
    locale: "auto",
    payment_method_types: resolveStripePaymentMethodTypes(),
    phone_number_collection: {
      enabled: false
    },
    line_items: input.lineItems,
    metadata,
    payment_intent_data: {
      metadata
    },
    success_url:
      `${appUrl}/checkout/success?order=${encodeURIComponent(input.orderId)}` +
      `&external_reference=${encodeURIComponent(input.externalReference)}` +
      "&session_id={CHECKOUT_SESSION_ID}",
    cancel_url:
      `${appUrl}/checkout/failure?order=${encodeURIComponent(input.orderId)}` +
      `&external_reference=${encodeURIComponent(input.externalReference)}` +
      "&checkout_cancelled=1"
  });

  return {
    id: session.id,
    url: session.url ?? null
  };
}

export async function getStripeCheckoutSession(sessionId: string) {
  const stripe = getStripeClient();

  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"]
  });
}

export function constructStripeWebhookEvent(input: {
  payload: string | Buffer;
  signatureHeader: string | null;
}) {
  assertStripeWebhookSecurity();

  const secret = String(process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET não configurado.");
  }

  if (!input.signatureHeader) {
    throw new Error("Assinatura do webhook Stripe ausente.");
  }

  return getStripeClient().webhooks.constructEvent(input.payload, input.signatureHeader, secret);
}
