import assert from "node:assert/strict";
import test from "node:test";

import { buildRateLimitIdentifier, getRequestIp } from "../lib/rate-limit-utils";

test("buildRateLimitIdentifier é determinístico para a mesma combinação", () => {
  const first = buildRateLimitIdentifier(["203.0.113.10", "cliente@mantos.com"]);
  const second = buildRateLimitIdentifier(["203.0.113.10", "cliente@mantos.com"]);
  const third = buildRateLimitIdentifier(["203.0.113.11", "cliente@mantos.com"]);

  assert.equal(first, second);
  assert.notEqual(first, third);
});

test("getRequestIp prioriza x-forwarded-for e faz fallback seguro", () => {
  const forwardedHeaders = new Headers({
    "x-forwarded-for": "203.0.113.10, 10.0.0.1"
  });
  const fallbackHeaders = new Headers({
    "x-real-ip": "198.51.100.23"
  });

  assert.equal(getRequestIp(forwardedHeaders), "203.0.113.10");
  assert.equal(getRequestIp(fallbackHeaders), "198.51.100.23");
  assert.equal(getRequestIp(new Headers()), "unknown");
});
