import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { fromCents } from "@/lib/money";

export const SHIPPING_OPTIONS = [
  {
    id: "standard",
    label: "Padrão",
    description: "Receba em 3 a 5 dias úteis",
    eta: "3 a 5 dias úteis",
    price: fromCents(2490)
  },
  {
    id: "express",
    label: "Expressa",
    description: "Receba em até 24h nas regiões elegíveis",
    eta: "até 24h",
    price: fromCents(4290)
  },
  {
    id: "pickup",
    label: "Retirada",
    description: "Retirada agendada em showroom parceiro",
    eta: "agendamento imediato",
    price: 0
  }
] as const;

export type ShippingMethod = (typeof SHIPPING_OPTIONS)[number]["id"];

export function getShippingOption(method: ShippingMethod) {
  return SHIPPING_OPTIONS.find((option) => option.id === method) ?? SHIPPING_OPTIONS[0];
}

export function getShippingAmount(method: ShippingMethod, subtotal: number) {
  if (method === "pickup") {
    return 0;
  }

  if (method === "standard" && subtotal >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }

  return getShippingOption(method).price;
}

export function getShippingQuote(method: ShippingMethod, subtotal: number) {
  const option = getShippingOption(method);
  const amount = getShippingAmount(method, subtotal);

  return {
    ...option,
    amount,
    freeShipping: amount === 0
  };
}
