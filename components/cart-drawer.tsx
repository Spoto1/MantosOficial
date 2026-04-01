"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { freeShippingProgress, formatCurrency } from "@/lib/utils";
import { useCart } from "@/providers/cart-provider";
import { useCustomerSession } from "@/providers/customer-session-provider";

export function CartDrawer() {
  const {
    closeCart,
    freeShippingThreshold,
    isOpen,
    items,
    removeItem,
    subtotal,
    updateQuantity
  } = useCart();
  const { status } = useCustomerSession();
  const pathname = usePathname();
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const checkoutHref =
    status === "authenticated" ? "/checkout" : "/checkout/acesso?next=%2Fcheckout";
  const checkoutLabel =
    status === "authenticated" ? "Revisar no checkout" : "Entrar para continuar";

  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progress = freeShippingProgress(subtotal, freeShippingThreshold);

  const navigateFromDrawer = (href: string) => {
    setFeedback(null);
    closeCart();
    window.requestAnimationFrame(() => {
      router.push(href);
    });
  };

  useEffect(() => {
    if (!isOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isOpen]);

  useEffect(() => {
    setFeedback(null);
    closeCart();
  }, [closeCart, pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCart, isOpen]);

  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-40 bg-black/45 transition ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
      />

      <aside
        aria-hidden={!isOpen}
        aria-label="Carrinho de compras"
        aria-modal="true"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[23rem] flex-col bg-[#101212] text-white shadow-2xl transition duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="eyebrow !text-white/50">Carrinho</p>
            <h2 className="font-display text-[2rem] leading-none">Sua seleção</h2>
          </div>
          <button
            aria-label="Fechar carrinho"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-lg text-white/80"
            onClick={closeCart}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between text-[0.84rem] text-white/70">
            <span>Frete grátis</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#d7cbb8] via-[#9e7b2f] to-[#4f8576]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2.5 text-[0.84rem] leading-6 text-white/70">
            {remaining > 0
              ? `Faltam ${formatCurrency(remaining)} para liberar frete padrão grátis.`
              : "Frete padrão grátis liberado para este pedido."}
          </p>
        </div>

        <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <h3 className="text-base font-semibold">Seu carrinho está vazio.</h3>
              <p className="mt-2 text-[0.88rem] leading-6 text-white/70">
                Explore a coleção e monte uma seleção com tamanho, cor e caimento definidos antes
                de seguir para o pagamento.
              </p>
              <div className="mt-6 grid gap-2.5">
                <button
                  className="button-accent w-full justify-center"
                  onClick={() => navigateFromDrawer("/colecao")}
                  type="button"
                >
                  Ver coleção
                </button>
                {status === "authenticated" ? (
                  <button
                    className="button-secondary w-full justify-center"
                    onClick={() => navigateFromDrawer("/favoritos")}
                    type="button"
                  >
                    Abrir favoritos
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            items.map((item) => (
              <article className="rounded-[1.35rem] border border-white/10 bg-white/5 p-3.5" key={item.id}>
                <div className="flex gap-3.5">
                  <div className="rounded-[1rem] bg-white/10 p-2.5">
                    <Image
                      alt={item.name}
                      className="h-auto w-auto"
                      height={120}
                      sizes="100px"
                      src={item.image}
                      width={100}
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[0.96rem] font-semibold leading-5">{item.name}</h3>
                          <p className="mt-1 text-[0.64rem] uppercase tracking-[0.16em] text-white/50">
                            {item.color} • {item.size}
                          </p>
                        </div>
                        <button
                          className="text-[0.82rem] text-white/55 transition hover:text-white"
                          onClick={() => {
                            removeItem(item.id);
                            setFeedback("Item removido do carrinho.");
                          }}
                          type="button"
                        >
                          Remover
                        </button>
                      </div>
                      <p className="mt-2 text-[0.84rem] leading-6 text-white/70">{item.subtitle}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-white/10 bg-black/20">
                        <button
                          className="h-9 w-9 text-lg"
                          onClick={() => {
                            const result = updateQuantity(item.id, item.quantity - 1);
                            setFeedback(result.message ?? null);
                          }}
                          type="button"
                        >
                          −
                        </button>
                        <span className="min-w-9 text-center text-[0.84rem]">{item.quantity}</span>
                        <button
                          className="h-9 w-9 text-lg"
                          disabled={item.availableStock === 0 || item.quantity >= item.availableStock}
                          onClick={() => {
                            const result = updateQuantity(item.id, item.quantity + 1);
                            setFeedback(result.message ?? null);
                          }}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[0.92rem] font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                    <p className="mt-2.5 text-[0.64rem] uppercase tracking-[0.16em] text-white/45">
                      Estoque disponível: {item.availableStock}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center justify-between text-[0.84rem] text-white/70">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <p className="mt-2 text-[0.62rem] uppercase tracking-[0.16em] text-white/40">
            Frete e cupom são confirmados no checkout
          </p>
          {status !== "authenticated" ? (
            <p className="mt-3 text-[0.84rem] leading-6 text-white/70">
              Entre ou crie sua conta para acompanhar pedidos, detalhe e rastreio no mesmo lugar.
            </p>
          ) : null}
          <div className="mt-3 rounded-[1.1rem] border border-white/10 bg-white/5 p-3 text-[0.82rem] leading-6 text-white/72">
            No checkout você confirma entrega, frete e total. A aprovação do pagamento atualiza o
            pedido; o transporte só aparece quando a expedição realmente começar.
          </div>
          {feedback ? (
            <p aria-live="polite" className="mt-3 text-[0.84rem] leading-6 text-white/70">
              {feedback}
            </p>
          ) : null}
          <button
            className="button-accent mt-4 w-full justify-center"
            onClick={() => navigateFromDrawer(checkoutHref)}
            type="button"
          >
            {checkoutLabel}
          </button>
        </div>
      </aside>
    </>
  );
}
