import type { RateLimitPolicy } from "@/lib/rate-limit";

export const ADMIN_LOGIN_RATE_LIMIT: RateLimitPolicy = {
  scope: "admin-login",
  limit: 8,
  windowMs: 1000 * 60 * 15,
  message: "Muitas tentativas de login no admin. Aguarde alguns minutos antes de tentar novamente."
};

export const CUSTOMER_LOGIN_RATE_LIMIT: RateLimitPolicy = {
  scope: "customer-login",
  limit: 10,
  windowMs: 1000 * 60 * 15,
  message:
    "Muitas tentativas de acesso nesta conta. Aguarde alguns minutos antes de tentar novamente."
};

export const CUSTOMER_REGISTER_RATE_LIMIT: RateLimitPolicy = {
  scope: "customer-register",
  limit: 6,
  windowMs: 1000 * 60 * 30,
  message: "Muitos cadastros em sequência. Aguarde antes de tentar novamente."
};

export const NEWSLETTER_RATE_LIMIT: RateLimitPolicy = {
  scope: "newsletter-submit",
  limit: 6,
  windowMs: 1000 * 60 * 60,
  message: "Muitas inscrições de newsletter em sequência. Aguarde antes de tentar novamente."
};

export const CONTACT_RATE_LIMIT: RateLimitPolicy = {
  scope: "contact-submit",
  limit: 5,
  windowMs: 1000 * 60 * 60,
  message: "Muitas mensagens enviadas em sequência. Aguarde antes de tentar novamente."
};

export const TRACKING_RATE_LIMIT: RateLimitPolicy = {
  scope: "tracking-lookup",
  limit: 20,
  windowMs: 1000 * 60 * 15,
  message: "Muitas consultas de rastreio em sequência. Aguarde alguns minutos antes de continuar."
};
