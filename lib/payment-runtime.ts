import "server-only";

import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import { isStripeConfigured } from "@/lib/stripe";

export type CheckoutRuntimeMode = "online" | "demo" | "offline";

type CheckoutRuntime = {
  mode: CheckoutRuntimeMode;
  available: boolean;
};

export function getCheckoutRuntime(input?: { requestUrl?: string }): CheckoutRuntime {
  if (isStripeConfigured()) {
    return {
      mode: "online",
      available: true
    };
  }

  if (isLocalCheckoutDemoAllowed(input)) {
    return {
      mode: "demo",
      available: true
    };
  }

  return {
    mode: "offline",
    available: false
  };
}
