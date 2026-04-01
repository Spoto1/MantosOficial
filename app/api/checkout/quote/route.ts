import { NextResponse } from "next/server";

import { quoteCheckout } from "@/lib/repositories/orders";
import type { CheckoutQuoteResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
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
    const quote = await quoteCheckout(payload);
    const response: CheckoutQuoteResponse = {
      ok: true,
      message: quote.coupon
        ? "Cupom aplicado e total recalculado."
        : "Resumo do pedido atualizado.",
      subtotal: quote.subtotal,
      discountAmount: quote.discountAmount,
      shippingAmount: quote.shipping.amount,
      total: quote.total,
      freeShipping: quote.shipping.freeShipping,
      shippingLabel: quote.shipping.label,
      shippingEta: quote.shipping.eta,
      couponCode: quote.coupon?.code ?? null,
      couponDescription: quote.couponDescription
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: CheckoutQuoteResponse = {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível recalcular o resumo do pedido."
    };

    return NextResponse.json(response, {
      status: 400
    });
  }
}
