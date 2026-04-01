import "server-only";

import { isStripeConfigured } from "@/lib/stripe";
import {
  hasAnyStripeConfiguration,
  isLocalPreviewUrl,
  resolveAppUrl,
  shouldEnforcePublicAppUrl
} from "@/lib/runtime-config";

function resolveCheckoutPreviewOrigin(input?: { requestUrl?: string }) {
  const requestUrl = String(input?.requestUrl ?? "").trim();

  if (requestUrl) {
    return requestUrl;
  }

  return resolveAppUrl();
}

export function isLocalCheckoutDemoAllowed(input?: { requestUrl?: string }) {
  if (isStripeConfigured() || hasAnyStripeConfiguration()) {
    return false;
  }

  if (process.env.ALLOW_LOCAL_DEMO_CHECKOUT !== "true") {
    return false;
  }

  if (shouldEnforcePublicAppUrl()) {
    return false;
  }

  if (!isLocalPreviewUrl(resolveCheckoutPreviewOrigin(input))) {
    return false;
  }

  return true;
}

export function getCheckoutMode(input?: { requestUrl?: string }) {
  return isLocalCheckoutDemoAllowed(input) ? "demo" : "stripe";
}

export function isCheckoutAvailable(input?: { requestUrl?: string }) {
  return isStripeConfigured() || isLocalCheckoutDemoAllowed(input);
}
