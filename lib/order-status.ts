import {
  CONTROLLED_PAYMENT_METHODS,
  CONTROLLED_PAYMENT_PROVIDERS
} from "@/lib/local-validation";

export const ORDER_STATUS_VALUES = [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED"
] as const;

export const PAYMENT_STATUS_VALUES = [
  "PENDING",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED"
] as const;

export const SHIPPING_STATUS_VALUES = [
  "PENDING",
  "READY_TO_SHIP",
  "IN_TRANSIT",
  "DELIVERED",
  "RETURNED"
] as const;

const ORDER_STATUS_LABELS: Record<(typeof ORDER_STATUS_VALUES)[number], string> = {
  PENDING: "Em acompanhamento",
  PAID: "Pagamento aprovado",
  FAILED: "Pagamento não concluído",
  CANCELLED: "Pedido cancelado",
  REFUNDED: "Pagamento estornado"
};

const PAYMENT_STATUS_LABELS: Record<(typeof PAYMENT_STATUS_VALUES)[number], string> = {
  PENDING: "Pagamento em análise",
  AUTHORIZED: "Pagamento autorizado",
  PAID: "Pagamento aprovado",
  FAILED: "Pagamento recusado",
  CANCELLED: "Pagamento cancelado",
  REFUNDED: "Pagamento estornado"
};

const SHIPPING_STATUS_LABELS: Record<(typeof SHIPPING_STATUS_VALUES)[number], string> = {
  PENDING: "Aguardando expedição",
  READY_TO_SHIP: "Pronto para envio",
  IN_TRANSIT: "Em transporte",
  DELIVERED: "Entregue",
  RETURNED: "Devolvido ao remetente"
};

export function getOrderStatusLabel(status: (typeof ORDER_STATUS_VALUES)[number] | string) {
  return ORDER_STATUS_LABELS[status as (typeof ORDER_STATUS_VALUES)[number]] ?? status;
}

export function getPaymentStatusLabel(status: (typeof PAYMENT_STATUS_VALUES)[number] | string) {
  return PAYMENT_STATUS_LABELS[status as (typeof PAYMENT_STATUS_VALUES)[number]] ?? status;
}

export function getShippingStatusLabel(status: (typeof SHIPPING_STATUS_VALUES)[number] | string) {
  return SHIPPING_STATUS_LABELS[status as (typeof SHIPPING_STATUS_VALUES)[number]] ?? status;
}

export function getPaymentProviderLabel(provider: string | null | undefined) {
  if (provider === "stripe") {
    return "Stripe Checkout";
  }

  if (CONTROLLED_PAYMENT_PROVIDERS.includes(String(provider ?? ""))) {
    return "Simulação interna";
  }

  return "Pagamento online";
}

export function getPaymentMethodLabel(method: string | null | undefined) {
  if (method === "checkout_session") {
    return "Checkout seguro";
  }

  if (CONTROLLED_PAYMENT_METHODS.includes(String(method ?? ""))) {
    return "Simulação interna";
  }

  return "Pagamento online";
}

export function getShippingMethodLabel(method: string | null | undefined) {
  if (method === "standard") {
    return "Entrega padrão";
  }

  if (method === "express") {
    return "Entrega expressa";
  }

  if (method === "pickup") {
    return "Retirada";
  }

  return "Entrega";
}
