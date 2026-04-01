export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toCents(value: number | string) {
  const normalized = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return Math.round((normalized + Number.EPSILON) * 100);
}

export function fromCents(cents: number) {
  return roundCurrency(cents / 100);
}

export function formatMoneyValue(value: number | string) {
  return fromCents(toCents(value));
}
