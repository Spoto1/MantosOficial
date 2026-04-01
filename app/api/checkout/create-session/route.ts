import { NextResponse } from "next/server";

import { getCustomerSession } from "@/lib/auth/customer";
import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import {
  createMockCheckout,
  createStripeCheckout
} from "@/lib/repositories/orders";
import { getStripeConfigurationIssue } from "@/lib/runtime-config";
import { isStripeConfigured } from "@/lib/stripe";
import type { CheckoutSessionResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const customerSession = await getCustomerSession();

    if (!customerSession) {
      return NextResponse.json(
        {
          ok: false,
          message: "Entre ou crie sua conta para continuar o checkout."
        } satisfies CheckoutSessionResponse,
        {
          status: 401
        }
      );
    }

    const payload = (await request.json()) as {
      name: string;
      email: string;
      phone: string;
      cpf?: string;
      postalCode: string;
      address: string;
      city: string;
      state: string;
      complement?: string;
      reference?: string;
      shipping: "standard" | "express" | "pickup";
      couponCode?: string;
      items: Array<{
        productId: string;
        variantId?: string;
        quantity: number;
        size: string;
        color: string;
      }>;
    };
    const normalizedPayload = {
      ...payload,
      email: customerSession.customer.email
    };
    const stripeConfigurationIssue = getStripeConfigurationIssue();
    const configured = isStripeConfigured();
    const demoAllowed = isLocalCheckoutDemoAllowed({
      requestUrl: request.url
    });

    if (!configured && !demoAllowed) {
      throw new Error(
        stripeConfigurationIssue ??
          "O pagamento online não está disponível neste ambiente no momento."
      );
    }

    const result = configured
      ? await createStripeCheckout(normalizedPayload, {
          customerId: customerSession.customerId
        })
      : await createMockCheckout(normalizedPayload, {
          customerId: customerSession.customerId
        });
    const response: CheckoutSessionResponse = {
      ok: true,
      message: configured
        ? "Etapa de pagamento preparada com sucesso."
        : "Pedido preparado com sucesso.",
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      redirectUrl: result.redirectUrl,
      sessionId: result.sessionId,
      isMock: !configured
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: CheckoutSessionResponse = {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o pagamento."
    };

    return NextResponse.json(response, {
      status: 400
    });
  }
}
