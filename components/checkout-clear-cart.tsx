"use client";

import { useEffect } from "react";

import { useCart } from "@/providers/cart-provider";

type CheckoutClearCartProps = {
  enabled: boolean;
};

export function CheckoutClearCart({ enabled }: CheckoutClearCartProps) {
  const { clearCart, items } = useCart();

  useEffect(() => {
    if (!enabled || items.length === 0) {
      return;
    }

    clearCart();
  }, [clearCart, enabled, items.length]);

  return null;
}
