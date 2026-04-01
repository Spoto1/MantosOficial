import type Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  getStripeConfigurationIssue,
  isStripeSecretKeyConfigured,
  isStripeWebhookSecretConfigured,
  isStripeWebhookSecretRequired
} from "@/lib/runtime-config";
import {
  createWebhookEvent,
  markWebhookEventProcessed,
  reconcileStripeCheckoutSession
} from "@/lib/repositories/orders";
import {
  constructStripeWebhookEvent,
  isStripeServerConfigured
} from "@/lib/stripe";

const STRIPE_CHECKOUT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired"
]);

export const runtime = "nodejs";

function isStripeCheckoutSessionObject(
  value: Stripe.Event.Data.Object
): value is Stripe.Checkout.Session {
  return (
    typeof value === "object" &&
    value !== null &&
    "object" in value &&
    value.object === "checkout.session"
  );
}

function resolveStripeEventObjectId(value: Stripe.Event.Data.Object) {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"
    ? value.id
    : null;
}

export async function POST(request: Request) {
  const rawPayload = await request.text();
  const requireSecret = isStripeWebhookSecretRequired();
  const hasSecret = isStripeWebhookSecretConfigured();
  const stripeConfigurationIssue = getStripeConfigurationIssue();

  if (requireSecret && !hasSecret) {
    console.error("[stripe-webhook] configuração insegura bloqueada");

    return NextResponse.json(
      {
        ok: false,
        message:
          "Webhook Stripe bloqueado: STRIPE_WEBHOOK_SECRET é obrigatório em ambiente publicado."
      },
      {
        status: 503
      }
    );
  }

  if (stripeConfigurationIssue && isStripeSecretKeyConfigured()) {
    console.error("[stripe-webhook] configuração Stripe inválida", {
      error: stripeConfigurationIssue
    });

    return NextResponse.json(
      {
        ok: false,
        message: stripeConfigurationIssue
      },
      {
        status: 503
      }
    );
  }

  let event: Stripe.Event;

  try {
    event = hasSecret
      ? constructStripeWebhookEvent({
          payload: rawPayload,
          signatureHeader: request.headers.get("stripe-signature")
        })
      : (JSON.parse(rawPayload) as Stripe.Event);
  } catch (error) {
    console.warn("[stripe-webhook] assinatura rejeitada", {
      error: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json(
      {
        ok: false,
        message: "Assinatura inválida."
      },
      {
        status: 401
      }
    );
  }

  const objectId = resolveStripeEventObjectId(event.data.object);
  const requestId = event.request?.id ?? request.headers.get("request-id");
  const eventResult = await createWebhookEvent({
    provider: "stripe",
    topic: event.type,
    action: event.type,
    resourceId: objectId,
    dedupeKey: `stripe:${event.id}`,
    requestId,
    signatureVerified: hasSecret,
    payload: JSON.parse(rawPayload)
  });

  if (eventResult.duplicate || !eventResult.event) {
    return NextResponse.json({
      ok: true,
      duplicate: true
    });
  }

  if (
    !isStripeServerConfigured() ||
    !STRIPE_CHECKOUT_EVENTS.has(event.type) ||
    !isStripeCheckoutSessionObject(event.data.object)
  ) {
    await markWebhookEventProcessed(eventResult.event.id, null);

    return NextResponse.json({
      ok: true,
      processed: false
    });
  }

  try {
    const order = await reconcileStripeCheckoutSession(event.data.object.id, {
      eventType: event.type
    });
    await markWebhookEventProcessed(eventResult.event.id, order.id);

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      status: order.status
    });
  } catch (error) {
    console.error("[stripe-webhook] falha ao processar evento", {
      eventType: event.type,
      objectId,
      error: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível processar o evento de pagamento."
      },
      {
        status: 500
      }
    );
  }
}
