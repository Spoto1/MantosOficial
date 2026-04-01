"use client";

import { useEffect, useState } from "react";

import { isTournamentCapsule } from "@/lib/storefront-editorial";
import type { StorefrontProduct } from "@/lib/types";
import { clampQuantity } from "@/lib/utils";
import { useCart } from "@/providers/cart-provider";

type AddToCartFormProps = {
  product: StorefrontProduct;
};

function resolveInitialVariant(product: StorefrontProduct) {
  return product.variants.find((variant) => variant.available) ?? product.variants[0] ?? null;
}

export function AddToCartForm({ product }: AddToCartFormProps) {
  const { addItem, openCart } = useCart();
  const initialVariant = resolveInitialVariant(product);
  const [selectedSize, setSelectedSize] = useState(
    initialVariant?.size ?? product.sizes[2] ?? product.sizes[0]
  );
  const [selectedColor, setSelectedColor] = useState(
    initialVariant?.color ?? product.colors[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isCapsule = isTournamentCapsule(product);
  const selectedVariantRaw =
    product.variants.find(
      (variant) => variant.size === selectedSize && variant.color === selectedColor
    ) ?? null;
  const selectedVariant = selectedVariantRaw?.available ? selectedVariantRaw : null;
  const availableStock = selectedVariantRaw?.stock ?? 0;

  useEffect(() => {
    if (availableStock <= 0) {
      setQuantity(1);
      return;
    }

    setQuantity((current) => clampQuantity(current, availableStock));
  }, [availableStock]);

  return (
    <div className="panel space-y-3.5 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Seleção</p>
          <h2 className="mt-1.5 text-[1.12rem] font-semibold leading-tight text-ink sm:text-[1.24rem]">
            Defina tamanho, cor e quantidade antes de seguir para o carrinho
          </h2>
          <p className="mt-1.5 max-w-xl text-[0.82rem] leading-6 text-slate">
            Monte a combinação da peça com leitura clara de disponibilidade. A variação escolhida
            organiza estoque, carrinho e continuidade do checkout na mesma jornada.
          </p>
        </div>
        <span className="status-badge">
          {selectedVariant ? `Estoque disponível: ${selectedVariant.stock}` : "Combinação indisponível"}
        </span>
      </div>

      {isCapsule ? (
        <div className="rounded-[1.05rem] border border-[#9e7b2f]/20 bg-[#17342d] p-3 text-white">
          <p className="text-[0.6rem] uppercase tracking-[0.16em] text-white/55">Edição especial</p>
          <p className="mt-1.5 text-[0.78rem] leading-5 text-white/78">
            Peça destacada da linha especial, com a mesma leitura clara de disponibilidade, envio e
            pós-compra do restante da coleção.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[0.76rem] font-medium uppercase tracking-[0.16em] text-slate">Tamanho</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <button
                className={`min-w-10 rounded-full border px-3 py-1.5 text-[0.8rem] transition ${
                  selectedSize === size
                    ? "border-ink bg-ink text-white shadow-sm"
                    : "border-black/10 bg-black/5 text-ink hover:border-black/25 hover:bg-white"
                }`}
                key={size}
                onClick={() => setSelectedSize(size)}
                type="button"
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[0.76rem] font-medium uppercase tracking-[0.16em] text-slate">Cor</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((color) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-[0.8rem] transition ${
                  selectedColor === color
                    ? "border-ink bg-ink text-white shadow-sm"
                    : "border-black/10 bg-black/5 text-ink hover:border-black/25 hover:bg-white"
                }`}
                key={color}
                onClick={() => setSelectedColor(color)}
                type="button"
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[1.1rem] border border-black/5 bg-black/5 p-3 sm:p-3.5">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center rounded-full border border-black/10 bg-black/5">
              <button
                className="h-8 w-8 text-lg text-ink"
                onClick={() =>
                  setQuantity((current) =>
                    clampQuantity(current - 1, Math.max(1, availableStock || 1))
                  )
                }
                type="button"
              >
                −
              </button>
              <span className="min-w-8 text-center text-[0.8rem] font-medium">{quantity}</span>
              <button
                className="h-8 w-8 text-lg text-ink"
                disabled={!selectedVariant || quantity >= availableStock}
                onClick={() => {
                  if (!selectedVariant || availableStock <= 0) {
                    setFeedback("Esta variação está sem estoque no momento.");
                    return;
                  }

                  setQuantity((current) => clampQuantity(current + 1, availableStock));
                  if (quantity + 1 > availableStock) {
                    setFeedback(`Limite de ${availableStock} unidade(s) para esta variação.`);
                  } else {
                    setFeedback(null);
                  }
                }}
                type="button"
              >
                +
              </button>
            </div>
            <button
              className={`${isCapsule ? "button-accent" : "button-primary"} min-h-9 flex-1 justify-center`}
              disabled={!selectedVariant}
              onClick={() => {
                if (!selectedVariant) {
                  setFeedback(
                    availableStock > 0
                      ? "Essa combinação de cor e tamanho está indisponível no momento."
                      : "Esta variação está sem estoque no momento."
                  );
                  return;
                }

                const result = addItem(product, selectedVariant, quantity);
                setFeedback(result.message ?? null);
              }}
              type="button"
            >
              {selectedVariant ? "Adicionar ao carrinho" : "Combinação indisponível"}
            </button>
          </div>

          <button className="button-secondary button-compact justify-center" onClick={openCart} type="button">
            Abrir carrinho e revisar a seleção
          </button>
        </div>
        <p className="mt-2 text-[0.78rem] leading-5 text-slate">
          Depois de adicionar ao carrinho, confirme entrega, frete e pagamento no checkout. O
          pedido segue para conta, detalhe e rastreio com o mesmo número.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Entrega", "Frete padrão grátis acima de R$ 650,00."],
          ["Troca", "Primeira solicitação em até 30 dias após o recebimento."],
          [
            "Pedido",
            "Carrinho, checkout, conta e rastreio usam a mesma leitura de compra depois da aprovação."
          ]
        ].map(([label, value]) => (
          <div className="metric-card" key={label}>
            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-slate">{label}</p>
            <p className="mt-1.5 text-[0.78rem] leading-5 text-ink">{value}</p>
          </div>
        ))}
      </div>

      {feedback ? (
        <p
          aria-live="polite"
          className={`text-[0.78rem] leading-5 ${
            feedback.includes("sem estoque") || feedback.includes("indisponível")
              ? "text-[#8b342e]"
              : "text-slate"
          }`}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
