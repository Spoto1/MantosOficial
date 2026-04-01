import type { Metadata } from "next";

import { CheckoutClient } from "@/components/checkout-client";
import { requireCustomerAuth } from "@/lib/auth/customer";
import { getCheckoutRuntime } from "@/lib/payment-runtime";
import { buildMetadata, siteName } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Checkout seguro",
  description:
    `Checkout da ${siteName} com resumo do pedido, cálculo de frete e redirecionamento seguro para pagamento.`,
  path: "/checkout",
  noIndex: true
});

export default async function CheckoutPage() {
  const session = await requireCustomerAuth({
    next: "/checkout",
    loginPath: "/checkout/acesso"
  });
  const checkoutRuntime = getCheckoutRuntime();

  return (
    <CheckoutClient
      checkoutAvailable={checkoutRuntime.available}
      checkoutMode={checkoutRuntime.mode}
      customer={session.customer}
    />
  );
}
