"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { CART_STORAGE_KEY, FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { fromCents, toCents } from "@/lib/money";
import type { CartItem, StorefrontProduct, StorefrontProductVariant } from "@/lib/types";
import { clampQuantity } from "@/lib/utils";

type CartMutationResult = {
  ok: boolean;
  quantity: number;
  message?: string;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: number;
  freeShippingThreshold: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (
    product: StorefrontProduct,
    variant: StorefrontProductVariant,
    quantity: number
  ) => CartMutationResult;
  updateQuantity: (id: string, quantity: number) => CartMutationResult;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function normalizeStoredCartItem(item: CartItem) {
  const availableStock = Math.max(
    0,
    Number.isFinite(item.availableStock) ? item.availableStock : item.quantity || 1
  );
  const safeMax = Math.max(1, availableStock || item.quantity || 1);

  return {
    ...item,
    availableStock,
    quantity: clampQuantity(item.quantity || 1, safeMax)
  };
}

function persistCartItems(items: CartItem[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        setItems(parsed.map(normalizeStoredCartItem));
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const setItemsAndPersist = useCallback(
    (updater: (currentItems: CartItem[]) => CartItem[]) => {
      setItems((currentItems) => {
        const nextItems = updater(currentItems);

        if (hasLoaded) {
          persistCartItems(nextItems);
        }

        return nextItems;
      });
    },
    [hasLoaded]
  );

  const openCart = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearCart = useCallback(() => {
    setItemsAndPersist((currentItems) => (currentItems.length > 0 ? [] : currentItems));
  }, [setItemsAndPersist]);

  const removeItem = useCallback((id: string) => {
    setItemsAndPersist((currentItems) => currentItems.filter((item) => item.id !== id));
  }, [setItemsAndPersist]);

  const addItem = useCallback<CartContextValue["addItem"]>((product, variant, quantity) => {
    const availableStock = Math.max(0, variant.stock);

    if (!variant.available || availableStock === 0) {
      return {
        ok: false,
        quantity: 0,
        message: "Esta variação está sem estoque no momento."
      };
    }

    let result: CartMutationResult = {
      ok: true,
      quantity: Math.min(quantity, availableStock)
    };

    setItemsAndPersist((currentItems) => {
      const existing = currentItems.find((item) => item.id === variant.id);
      const currentQuantity = existing?.quantity ?? 0;
      const requestedQuantity = Math.max(1, quantity);
      const nextQuantity = Math.min(currentQuantity + requestedQuantity, availableStock);

      if (nextQuantity <= currentQuantity) {
        result = {
          ok: false,
          quantity: currentQuantity,
          message: `Você já atingiu o limite de ${availableStock} unidade(s) para esta variação.`
        };

        return currentItems.map((item) =>
          item.id === variant.id ? { ...item, availableStock } : item
        );
      }

      result = {
        ok: true,
        quantity: nextQuantity,
        message:
          nextQuantity < currentQuantity + requestedQuantity
            ? `Quantidade ajustada ao estoque disponível: ${availableStock} unidade(s).`
            : `${product.name} foi adicionado ao carrinho com sucesso.`
      };

      if (existing) {
        return currentItems.map((item) =>
          item.id === variant.id
            ? {
                ...item,
                availableStock,
                quantity: nextQuantity
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          id: variant.id,
          productId: product.id,
          variantId: variant.id,
          slug: product.slug,
          sku: variant.sku,
          name: product.name,
          subtitle: product.subtitle,
          image: product.image,
          price: product.price,
          size: variant.size,
          color: variant.color,
          availableStock,
          quantity: nextQuantity
        }
      ];
    });

    if (result.ok) {
      setIsOpen(true);
    }

    return result;
  }, [setItemsAndPersist]);

  const updateQuantity = useCallback<CartContextValue["updateQuantity"]>((id, quantity) => {
    let result: CartMutationResult = {
      ok: true,
      quantity: Math.max(0, quantity)
    };

    setItemsAndPersist((currentItems) => {
      const existing = currentItems.find((item) => item.id === id);

      if (!existing) {
        result = {
          ok: false,
          quantity: 0,
          message: "Item não encontrado no carrinho."
        };

        return currentItems;
      }

      if (quantity <= 0) {
        result = {
          ok: true,
          quantity: 0,
          message: "Item removido do carrinho."
        };

        return currentItems.filter((item) => item.id !== id);
      }

      const maxAllowed = Math.max(0, existing.availableStock);

      if (maxAllowed === 0) {
        result = {
          ok: false,
          quantity: existing.quantity,
          message: "Esta variação está sem estoque disponível para aumentar."
        };

        return currentItems;
      }

      const nextQuantity = clampQuantity(quantity, maxAllowed);
      result = {
        ok: true,
        quantity: nextQuantity,
        message:
          nextQuantity < quantity
            ? `Quantidade ajustada ao estoque disponível: ${maxAllowed} unidade(s).`
            : undefined
      };

      return currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: nextQuantity
            }
          : item
      );
    });

    return result;
  }, [setItemsAndPersist]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = fromCents(
      items.reduce((total, item) => total + toCents(item.price) * item.quantity, 0)
    );
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    return {
      items,
      isOpen,
      itemCount,
      subtotal,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      openCart,
      closeCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart
    };
  }, [addItem, clearCart, closeCart, isOpen, items, openCart, removeItem, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
