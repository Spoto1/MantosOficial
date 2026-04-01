type ControlledOrderLike = {
  paymentProvider?: string | null;
  paymentMethod?: string | null;
  paymentStatusDetail?: string | null;
  customerEmail?: string | null;
  notes?: string | null;
};

export const LOCAL_VALIDATION_CONTEXT = "validacao-local";
export const LOCAL_VALIDATION_FLOW = "local-validacao";
export const LEGACY_LOCAL_VALIDATION_FLOWS = ["local-homologacao"];
export const CONTROLLED_PAYMENT_PROVIDERS = ["stripe_demo", "mercado_pago_demo"];
export const CONTROLLED_PAYMENT_METHODS = ["checkout_session_demo", "checkout_demo"];
export const CONTROLLED_PAYMENT_STATUS_DETAILS = [
  "demo-approved",
  "demo-failed",
  "demo-pending"
];
export const CONTROLLED_ORDER_EMAIL_SUFFIXES = [
  "@mantos.local",
  "@example.com",
  "@cliente.test",
  "@mantos-preview.test"
];
export const CONTROLLED_ORDER_NOTE_MARKERS = [
  "seed",
  "homologação local",
  "homologacao local",
  "validação local",
  "validacao local"
];

export function isLocalValidationContext(value: string | null | undefined) {
  return String(value ?? "").trim() === LOCAL_VALIDATION_CONTEXT;
}

export function isLocalValidationFlow(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  return normalized === LOCAL_VALIDATION_FLOW || LEGACY_LOCAL_VALIDATION_FLOWS.includes(normalized);
}

function hasControlledEmailSuffix(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return CONTROLLED_ORDER_EMAIL_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function hasControlledNoteMarker(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return CONTROLLED_ORDER_NOTE_MARKERS.some((marker) => normalized.includes(marker));
}

export function isControlledValidationOrder(order: ControlledOrderLike | null | undefined) {
  if (!order) {
    return false;
  }

  return (
    CONTROLLED_PAYMENT_PROVIDERS.includes(String(order.paymentProvider ?? "")) ||
    CONTROLLED_PAYMENT_METHODS.includes(String(order.paymentMethod ?? "")) ||
    CONTROLLED_PAYMENT_STATUS_DETAILS.includes(String(order.paymentStatusDetail ?? "")) ||
    hasControlledEmailSuffix(order.customerEmail) ||
    hasControlledNoteMarker(order.notes)
  );
}

export function appendLocalValidationContext(href: string, enabled: boolean) {
  if (!enabled) {
    return href;
  }

  const [pathname, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.set("context", LOCAL_VALIDATION_CONTEXT);

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}
