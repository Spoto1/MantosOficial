import { createHash } from "node:crypto";

type HeaderSource = Pick<Headers, "get">;

function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeIdentifierPart(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase() || "unknown";
}

export function getRequestIp(headers: HeaderSource) {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-client-ip") ??
    "unknown"
  );
}

export function buildRateLimitIdentifier(parts: Array<string | null | undefined>) {
  return hashIdentifier(parts.map((part) => normalizeIdentifierPart(part)).join("|"));
}
