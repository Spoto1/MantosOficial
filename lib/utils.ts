import { formatMoneyValue } from "@/lib/money";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(formatMoneyValue(value));
}

export function clampQuantity(quantity: number, max = 10) {
  return Math.max(1, Math.min(max, quantity));
}

export function freeShippingProgress(subtotal: number, threshold: number) {
  return Math.min(100, Math.round((subtotal / threshold) * 100));
}
