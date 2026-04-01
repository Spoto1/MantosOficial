import assert from "node:assert/strict";
import test from "node:test";

import {
  assertStripeEnvironmentPairing,
  assertStripeWebhookSecurity,
  buildNextImageRemotePatterns,
  getStripeConfigurationIssue,
  isRemoteImageUrlAllowed,
  isStripeConfigured,
  resolveAppUrl,
  shouldUseSecureCookies
} from "../lib/runtime-config";

test("resolveAppUrl usa fallback local apenas fora de produção", () => {
  assert.equal(resolveAppUrl({ NODE_ENV: "development" }), "http://localhost:3000");
});

test("resolveAppUrl usa fallback local em build de produção sem ambiente hospedado", () => {
  assert.equal(resolveAppUrl({ NODE_ENV: "production" }), "http://localhost:3000");
});

test("resolveAppUrl falha em deploy de produção sem URL pública explícita", () => {
  assert.throws(
    () => resolveAppUrl({ NODE_ENV: "production", VERCEL: "1" }),
    /APP_URL ou NEXT_PUBLIC_APP_URL é obrigatório em produção/
  );
});

test("resolveAppUrl falha em deploy de produção com localhost", () => {
  assert.throws(
    () =>
      resolveAppUrl({
        NODE_ENV: "production",
        VERCEL: "1",
        APP_URL: "http://localhost:3000"
      }),
    /APP_URL ou NEXT_PUBLIC_APP_URL aponta para localhost em produção/
  );
});

test("resolveAppUrl falha quando APP_URL e NEXT_PUBLIC_APP_URL divergem", () => {
  assert.throws(
    () =>
      resolveAppUrl({
        APP_URL: "https://mantosoficial.com.br",
        NEXT_PUBLIC_APP_URL: "https://preview.mantosoficial.com.br"
      }),
    /APP_URL e NEXT_PUBLIC_APP_URL devem apontar para a mesma origem/
  );
});

test("cookies permanecem inseguros apenas em produção local", () => {
  assert.equal(shouldUseSecureCookies({ NODE_ENV: "production" }), false);
  assert.equal(
    shouldUseSecureCookies({
      NODE_ENV: "production",
      VERCEL: "1",
      APP_URL: "https://mantosoficial.com"
    }),
    true
  );
});

test("Stripe exige webhook secret em produção real", () => {
  assert.throws(
    () =>
      assertStripeWebhookSecurity({
        NODE_ENV: "production",
        APP_URL: "https://mantosoficial.com.br",
        STRIPE_SECRET_KEY: "sk_live_example",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example"
      }),
    /STRIPE_WEBHOOK_SECRET é obrigatório/
  );
});

test("Stripe falha cedo quando as chaves secret e publishable nao estao pareadas", () => {
  assert.throws(
    () =>
      assertStripeEnvironmentPairing({
        STRIPE_SECRET_KEY: "sk_test_example"
      }),
    /NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY é obrigatório/
  );

  assert.throws(
    () =>
      assertStripeEnvironmentPairing({
        STRIPE_SECRET_KEY: "sk_test_example",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example"
      }),
    /precisam ser da mesma modalidade/
  );
});

test("Stripe aceita ambiente completo e coerente", () => {
  assert.equal(
    isStripeConfigured({
      NODE_ENV: "production",
      APP_URL: "https://mantosoficial.com.br",
      NEXT_PUBLIC_APP_URL: "https://mantosoficial.com.br",
      STRIPE_SECRET_KEY: "sk_live_example",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example"
    }),
    true
  );
});

test("Stripe expõe issue operacional quando a configuração está parcial", () => {
  assert.match(
    String(
      getStripeConfigurationIssue({
        STRIPE_SECRET_KEY: "sk_test_example"
      })
    ),
    /NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY é obrigatório/
  );
});

test("next/image só aceita hosts remotos configurados", () => {
  const env = {
    NODE_ENV: "production",
    NEXT_IMAGE_REMOTE_HOSTS: "cdn.mantos.com,*.storage.example.com"
  };

  assert.equal(isRemoteImageUrlAllowed("https://cdn.mantos.com/banner.jpg", env), true);
  assert.equal(isRemoteImageUrlAllowed("https://assets.storage.example.com/file.webp", env), true);
  assert.equal(isRemoteImageUrlAllowed("https://evil.example.org/file.webp", env), false);

  assert.deepEqual(buildNextImageRemotePatterns(env), [
    {
      protocol: "https",
      hostname: "cdn.mantos.com",
      port: undefined
    },
    {
      protocol: "https",
      hostname: "**.storage.example.com",
      port: undefined
    }
  ]);
});
