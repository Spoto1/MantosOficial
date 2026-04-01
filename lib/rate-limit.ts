import "server-only";

import { prisma } from "@/lib/prisma";
import { buildRateLimitIdentifier, getRequestIp } from "@/lib/rate-limit-utils";

export { buildRateLimitIdentifier, getRequestIp } from "@/lib/rate-limit-utils";

export type RateLimitPolicy = {
  scope: string;
  limit: number;
  windowMs: number;
  message: string;
};

export class RateLimitExceededError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function resolveWindowStart(now: Date, windowMs: number) {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

export async function consumeRateLimit(input: {
  policy: RateLimitPolicy;
  identifier: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const windowStart = resolveWindowStart(now, input.policy.windowMs);
  const expiresAt = new Date(windowStart.getTime() + input.policy.windowMs * 2);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      scope_identifier_windowStart: {
        scope: input.policy.scope,
        identifier: input.identifier,
        windowStart
      }
    },
    create: {
      scope: input.policy.scope,
      identifier: input.identifier,
      windowStart,
      expiresAt,
      count: 1
    },
    update: {
      count: {
        increment: 1
      },
      expiresAt
    }
  });
  const allowed = bucket.count <= input.policy.limit;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStart.getTime() + input.policy.windowMs - now.getTime()) / 1000)
  );

  return {
    allowed,
    retryAfterSeconds,
    count: bucket.count,
    remaining: Math.max(0, input.policy.limit - bucket.count)
  };
}

export async function enforceRateLimit(input: {
  policy: RateLimitPolicy;
  identifier: string;
}) {
  const result = await consumeRateLimit(input);

  if (!result.allowed) {
    throw new RateLimitExceededError(input.policy.message, result.retryAfterSeconds);
  }

  return result;
}
