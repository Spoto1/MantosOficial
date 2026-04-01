import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getStripeConfigurationIssue,
  getStripeCredentialMode,
  hasAnyStripeConfiguration,
  isStripeConfigured,
  isStripePublishableKeyConfigured,
  isStripeSecretKeyConfigured,
  isStripeWebhookSecretConfigured,
  resolveAppUrl,
  summarizeStorageDriver
} from "@/lib/runtime-config";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      appUrl: resolveAppUrl(),
      storageDriver: summarizeStorageDriver(),
      payments: {
        gateway: "stripe",
        anyStripeConfiguration: hasAnyStripeConfiguration(),
        checkoutReady: isStripeConfigured(),
        secretKeyConfigured: isStripeSecretKeyConfigured(),
        publishableKeyConfigured: isStripePublishableKeyConfigured(),
        webhookSecretConfigured: isStripeWebhookSecretConfigured(),
        credentialMode: getStripeCredentialMode(),
        issue: getStripeConfigurationIssue()
      },
      database: "ok"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        database: "error",
        message: error instanceof Error ? error.message : "Healthcheck falhou."
      },
      {
        status: 503
      }
    );
  }
}
