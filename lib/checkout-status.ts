type CheckoutStatusInput = {
  status?: string | null;
  paymentStatus?: string | null;
};

export type CheckoutResultRoute = "success" | "pending" | "failure";

export function resolveCheckoutResultRoute(input: CheckoutStatusInput): CheckoutResultRoute {
  if (input.paymentStatus === "PAID" || input.status === "PAID") {
    return "success";
  }

  if (
    input.paymentStatus === "FAILED" ||
    input.paymentStatus === "CANCELLED" ||
    input.paymentStatus === "REFUNDED" ||
    input.status === "FAILED" ||
    input.status === "CANCELLED" ||
    input.status === "REFUNDED"
  ) {
    return "failure";
  }

  return "pending";
}
