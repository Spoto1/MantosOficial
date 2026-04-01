type RuntimeEnv = NodeJS.ProcessEnv | Record<string, string | undefined>;
type RequestHeaderLike = Pick<Headers, "get">;
type StripeCredentialMode = "test" | "live";

export const LOCALHOST_APP_URL = "http://localhost:3000";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const HOSTED_PRODUCTION_ENV_KEYS = [
  "VERCEL",
  "VERCEL_ENV",
  "RAILWAY_ENVIRONMENT",
  "RAILWAY_ENVIRONMENT_NAME",
  "RENDER",
  "RENDER_EXTERNAL_URL",
  "NETLIFY",
  "CF_PAGES",
  "FLY_APP_NAME",
  "AWS_EXECUTION_ENV",
  "K_SERVICE",
  "WEBSITE_HOSTNAME"
] as const;

type ParsedRemoteHost = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  wildcard: boolean;
};

const DEFAULT_ALLOWED_DEV_HOSTS = [
  "127.0.0.1",
  "0.0.0.0",
  "host.docker.internal",
  "*.local",
  "10.*.*.*",
  "172.*.*.*",
  "192.168.*.*"
] as const;

function normalizeUrlOrigin(rawValue: string) {
  const url = new URL(rawValue);
  return url.origin;
}

function safeParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function stripProtocol(value: string) {
  return value.replace(/^https?:\/\//i, "");
}

function normalizePortToken(value: string | undefined) {
  const trimmed = String(value ?? "").trim();

  return /^\d+$/.test(trimmed) ? trimmed : null;
}

function isPrivateIpv4Host(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  if (parts[0] === 10) {
    return true;
  }

  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  return parts[0] === 192 && parts[1] === 168;
}

function resolveConfiguredAppUrlValue(env: RuntimeEnv) {
  const appUrl = String(env.APP_URL ?? "").trim();
  const publicAppUrl = String(env.NEXT_PUBLIC_APP_URL ?? "").trim();

  if (appUrl && publicAppUrl) {
    const normalizedAppUrl = normalizeUrlOrigin(appUrl);
    const normalizedPublicAppUrl = normalizeUrlOrigin(publicAppUrl);

    if (normalizedAppUrl !== normalizedPublicAppUrl) {
      throw new Error(
        "APP_URL e NEXT_PUBLIC_APP_URL devem apontar para a mesma origem pública."
      );
    }

    return normalizedAppUrl;
  }

  return appUrl || publicAppUrl;
}

function buildLocalPreviewOrigin(hostname: string, port?: string) {
  return `http://${hostname}${port ? `:${port}` : ""}`;
}

function normalizeHeaderToken(value: string | null | undefined) {
  const token = String(value ?? "")
    .split(",")[0]
    ?.trim()
    .replace(/^https?:\/\//i, "");

  return token || null;
}

function normalizeForwardedProtocol(value: string | null | undefined) {
  const token = String(value ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();

  return token === "http" || token === "https" ? token : null;
}

function parseRemoteHostToken(token: string): ParsedRemoteHost | null {
  const trimmed = token.trim();

  if (!trimmed) {
    return null;
  }

  const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = safeParseUrl(prefixed);

  if (!url) {
    return null;
  }

  const wildcard = url.hostname.startsWith("*.");
  const hostname = wildcard ? url.hostname.slice(2) : url.hostname;

  if (!hostname) {
    return null;
  }

  return {
    protocol: (url.protocol.replace(":", "") || "https") as "http" | "https",
    hostname,
    port: url.port || undefined,
    wildcard
  };
}

function appendRemoteHost(
  collection: ParsedRemoteHost[],
  token: string | null | undefined,
  protocolOverride?: "http" | "https"
) {
  const parsed = parseRemoteHostToken(String(token ?? ""));

  if (!parsed) {
    return;
  }

  const nextValue = {
    ...parsed,
    protocol: protocolOverride ?? parsed.protocol
  };

  const alreadyIncluded = collection.some(
    (item) =>
      item.protocol === nextValue.protocol &&
      item.hostname === nextValue.hostname &&
      item.port === nextValue.port &&
      item.wildcard === nextValue.wildcard
  );

  if (!alreadyIncluded) {
    collection.push(nextValue);
  }
}

export function isProductionEnvironment(env: RuntimeEnv = process.env) {
  return String(env.NODE_ENV ?? "").trim() === "production";
}

export function shouldEnforcePublicAppUrl(env: RuntimeEnv = process.env) {
  if (!isProductionEnvironment(env)) {
    return false;
  }

  const explicit = String(env.ENFORCE_PUBLIC_APP_URL ?? "")
    .trim()
    .toLowerCase();

  if (explicit === "true") {
    return true;
  }

  if (explicit === "false") {
    return false;
  }

  return HOSTED_PRODUCTION_ENV_KEYS.some((key) => Boolean(String(env[key] ?? "").trim()));
}

export function isLoopbackHost(hostname: string) {
  return LOOPBACK_HOSTS.has(hostname.trim().toLowerCase());
}

export function isLoopbackUrl(value: string) {
  const parsed = safeParseUrl(value);
  return parsed ? isLoopbackHost(parsed.hostname) : false;
}

export function isLocalPreviewHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  return (
    isLoopbackHost(normalized) ||
    normalized === "0.0.0.0" ||
    normalized === "host.docker.internal" ||
    normalized.endsWith(".local") ||
    isPrivateIpv4Host(normalized)
  );
}

export function isLocalPreviewUrl(value: string) {
  const parsed = safeParseUrl(value);
  return parsed ? isLocalPreviewHost(parsed.hostname) : false;
}

export function resolveAppUrl(env: RuntimeEnv = process.env) {
  const configured = resolveConfiguredAppUrlValue(env);
  const enforcePublicAppUrl = shouldEnforcePublicAppUrl(env);
  const localPort = normalizePortToken(env.PORT);

  if (configured) {
    const origin = normalizeUrlOrigin(configured);

    if (enforcePublicAppUrl && isLoopbackUrl(origin)) {
      throw new Error(
        "APP_URL ou NEXT_PUBLIC_APP_URL aponta para localhost em produção. Configure a URL pública real antes do deploy."
      );
    }

    if (!enforcePublicAppUrl) {
      const parsedOrigin = safeParseUrl(origin);

      if (
        parsedOrigin &&
        localPort &&
        isLocalPreviewHost(parsedOrigin.hostname) &&
        parsedOrigin.port !== localPort
      ) {
        return buildLocalPreviewOrigin(parsedOrigin.hostname, localPort);
      }
    }

    return origin;
  }

  if (enforcePublicAppUrl) {
    throw new Error(
      "APP_URL ou NEXT_PUBLIC_APP_URL é obrigatório em produção para SEO, callbacks e integrações externas."
    );
  }

  if (localPort) {
    return buildLocalPreviewOrigin("localhost", localPort);
  }

  return LOCALHOST_APP_URL;
}

export function shouldUseSecureCookies(env: RuntimeEnv = process.env) {
  if (!isProductionEnvironment(env)) {
    return false;
  }

  try {
    return !isLocalPreviewUrl(resolveAppUrl(env));
  } catch {
    return true;
  }
}

function resolveRequestOriginFromHeaders(
  requestHeaders: RequestHeaderLike,
  env: RuntimeEnv = process.env
) {
  void env;

  const hostHeader =
    normalizeHeaderToken(requestHeaders.get("x-forwarded-host")) ??
    normalizeHeaderToken(requestHeaders.get("host"));

  if (!hostHeader) {
    return null;
  }

  const parsedHost = safeParseUrl(`http://${hostHeader}`);

  if (!parsedHost || !isLocalPreviewHost(parsedHost.hostname)) {
    return null;
  }

  const protocol = normalizeForwardedProtocol(requestHeaders.get("x-forwarded-proto")) ?? "http";

  return normalizeUrlOrigin(`${protocol}://${hostHeader}`);
}

export function resolveAppUrlFromHeaders(
  requestHeaders: RequestHeaderLike,
  env: RuntimeEnv = process.env
) {
  const configuredOrigin = resolveAppUrl(env);
  const configuredValue = resolveConfiguredAppUrlValue(env);
  const requestOrigin = resolveRequestOriginFromHeaders(requestHeaders, env);

  if (!requestOrigin) {
    return configuredOrigin;
  }

  if (!configuredValue) {
    return requestOrigin;
  }

  return isLocalPreviewUrl(configuredOrigin) ? requestOrigin : configuredOrigin;
}

export function getConfiguredRemoteImageHosts(env: RuntimeEnv = process.env) {
  const hosts: ParsedRemoteHost[] = [];
  const configuredTokens = String(env.NEXT_IMAGE_REMOTE_HOSTS ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of configuredTokens) {
    appendRemoteHost(hosts, token);
  }

  const storageUrl = String(env.STORAGE_PUBLIC_BASE_URL ?? "").trim();

  if (storageUrl) {
    appendRemoteHost(hosts, storageUrl);
  }

  if (!isProductionEnvironment(env)) {
    appendRemoteHost(hosts, "http://localhost", "http");
    appendRemoteHost(hosts, "http://127.0.0.1", "http");
  }

  return hosts;
}

export function buildNextImageRemotePatterns(env: RuntimeEnv = process.env) {
  return getConfiguredRemoteImageHosts(env).map((host) => ({
    protocol: host.protocol,
    hostname: host.wildcard ? `**.${host.hostname}` : host.hostname,
    port: host.port
  }));
}

export function buildAllowedDevOrigins(env: RuntimeEnv = process.env) {
  const hosts = new Set<string>(DEFAULT_ALLOWED_DEV_HOSTS);
  const configuredAppUrl = resolveConfiguredAppUrlValue(env);

  if (configuredAppUrl) {
    const parsed = safeParseUrl(configuredAppUrl);

    if (parsed && isLocalPreviewHost(parsed.hostname)) {
      hosts.add(parsed.hostname);
    }
  }

  return Array.from(hosts);
}

export function isRemoteImageUrlAllowed(value: string, env: RuntimeEnv = process.env) {
  const parsed = safeParseUrl(value);

  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
    return false;
  }

  return getConfiguredRemoteImageHosts(env).some((host) => {
    const protocolMatches = `${host.protocol}:` === parsed.protocol;
    const portMatches = !host.port || host.port === parsed.port;
    const hostnameMatches = host.wildcard
      ? parsed.hostname === host.hostname || parsed.hostname.endsWith(`.${host.hostname}`)
      : parsed.hostname === host.hostname;

    return protocolMatches && portMatches && hostnameMatches;
  });
}

export function isStripeSecretKeyConfigured(env: RuntimeEnv = process.env) {
  return Boolean(String(env.STRIPE_SECRET_KEY ?? "").trim());
}

export function isStripePublishableKeyConfigured(env: RuntimeEnv = process.env) {
  return Boolean(
    String(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? env.STRIPE_PUBLISHABLE_KEY ?? "").trim()
  );
}

export function isStripeWebhookSecretConfigured(env: RuntimeEnv = process.env) {
  return Boolean(String(env.STRIPE_WEBHOOK_SECRET ?? "").trim());
}

export function hasAnyStripeConfiguration(env: RuntimeEnv = process.env) {
  return (
    isStripeSecretKeyConfigured(env) ||
    isStripePublishableKeyConfigured(env) ||
    isStripeWebhookSecretConfigured(env)
  );
}

function resolveStripeCredentialMode(rawValue: string | undefined): StripeCredentialMode | null {
  const value = String(rawValue ?? "").trim();

  if (!value) {
    return null;
  }

  if (value.startsWith("sk_test_") || value.startsWith("pk_test_")) {
    return "test";
  }

  if (value.startsWith("sk_live_") || value.startsWith("pk_live_")) {
    return "live";
  }

  return null;
}

export function getStripeCredentialMode(env: RuntimeEnv = process.env) {
  return (
    resolveStripeCredentialMode(String(env.STRIPE_SECRET_KEY ?? "").trim()) ??
    resolveStripeCredentialMode(
      String(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? env.STRIPE_PUBLISHABLE_KEY ?? "").trim()
    )
  );
}

export function assertStripeEnvironmentPairing(env: RuntimeEnv = process.env) {
  const secretKey = String(env.STRIPE_SECRET_KEY ?? "").trim();
  const publishableKey = String(
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? env.STRIPE_PUBLISHABLE_KEY ?? ""
  ).trim();
  const webhookSecret = String(env.STRIPE_WEBHOOK_SECRET ?? "").trim();

  if (!secretKey && !publishableKey && !webhookSecret) {
    return;
  }

  if (secretKey && !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY é obrigatório quando STRIPE_SECRET_KEY estiver configurado."
    );
  }

  if (publishableKey && !secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY é obrigatório quando NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY estiver configurado."
    );
  }

  const secretMode = resolveStripeCredentialMode(secretKey);
  const publishableMode = resolveStripeCredentialMode(publishableKey);

  if (secretKey && !secretMode) {
    throw new Error(
      "STRIPE_SECRET_KEY precisa usar uma chave válida da Stripe (`sk_test_...` ou `sk_live_...`)."
    );
  }

  if (publishableKey && !publishableMode) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY precisa usar uma chave válida da Stripe (`pk_test_...` ou `pk_live_...`)."
    );
  }

  if (secretMode && publishableMode && secretMode !== publishableMode) {
    throw new Error(
      "STRIPE_SECRET_KEY e NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY precisam ser da mesma modalidade (`test` ou `live`)."
    );
  }

  if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET precisa usar o formato oficial do Stripe (`whsec_...`)."
    );
  }
}

export function isStripeWebhookSecretRequired(env: RuntimeEnv = process.env) {
  if (!isStripeSecretKeyConfigured(env)) {
    return false;
  }

  const configuredAppUrl = resolveConfiguredAppUrlValue(env);

  if (configuredAppUrl && !isLocalPreviewUrl(normalizeUrlOrigin(configuredAppUrl))) {
    return true;
  }

  return shouldEnforcePublicAppUrl(env);
}

export function isStripeConfigured(env: RuntimeEnv = process.env) {
  if (!isStripeSecretKeyConfigured(env) || !isStripePublishableKeyConfigured(env)) {
    return false;
  }

  try {
    assertStripeEnvironmentPairing(env);
    assertStripeWebhookSecurity(env);

    return true;
  } catch {
    return false;
  }
}

export function getStripeConfigurationIssue(env: RuntimeEnv = process.env) {
  if (!hasAnyStripeConfiguration(env)) {
    return null;
  }

  try {
    assertStripeEnvironmentPairing(env);
    assertStripeWebhookSecurity(env);

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Configuração Stripe inválida.";
  }
}

export function assertStripeWebhookSecurity(env: RuntimeEnv = process.env) {
  assertStripeEnvironmentPairing(env);

  if (isStripeWebhookSecretRequired(env) && !isStripeWebhookSecretConfigured(env)) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET é obrigatório em ambiente publicado quando o checkout Stripe está ativo."
    );
  }
}

export function summarizeStorageDriver(env: RuntimeEnv = process.env) {
  return String(env.STORAGE_DRIVER ?? "local").trim().toLowerCase() || "local";
}

export function resolveStoragePublicBaseUrl(env: RuntimeEnv = process.env) {
  const configured = String(env.STORAGE_PUBLIC_BASE_URL ?? "").trim();

  return configured ? stripProtocol(normalizeUrlOrigin(configured)) : null;
}
