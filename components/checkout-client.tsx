"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { fromCents, toCents } from "@/lib/money";
import { siteName } from "@/lib/seo";
import { getShippingQuote, SHIPPING_OPTIONS, type ShippingMethod } from "@/lib/shipping";
import type {
  CustomerIdentity,
  CheckoutSessionResponse,
  CheckoutQuoteResponse
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/providers/cart-provider";

function buildCheckoutPayload(
  formData: FormData,
  shipping: ShippingMethod,
  items: ReturnType<typeof useCart>["items"]
) {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    cpf: String(formData.get("cpf") ?? "").trim() || undefined,
    postalCode: String(formData.get("postalCode") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    complement: String(formData.get("complement") ?? "").trim() || undefined,
    reference: String(formData.get("reference") ?? "").trim() || undefined,
    shipping,
    couponCode: String(formData.get("couponCode") ?? "").trim() || undefined,
    items: items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      size: item.size,
      color: item.color
    }))
  };
}

type CheckoutClientProps = {
  checkoutAvailable: boolean;
  checkoutMode: "online" | "demo" | "offline";
  customer: CustomerIdentity;
};

export function CheckoutClient({
  checkoutAvailable,
  checkoutMode,
  customer
}: CheckoutClientProps) {
  const { items, subtotal, updateQuantity } = useCart();
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>("standard");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQuoting, startQuoteTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();

  const localShipping = useMemo(
    () => getShippingQuote(selectedShipping, subtotal),
    [selectedShipping, subtotal]
  );
  const resolvedSubtotal = quote?.subtotal ?? subtotal;
  const resolvedDiscount = quote?.discountAmount ?? 0;
  const resolvedShipping = quote?.shippingAmount ?? localShipping.amount;
  const resolvedTotal =
    quote?.total ??
    fromCents(toCents(subtotal) + toCents(localShipping.amount) - toCents(resolvedDiscount));

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }

    startQuoteTransition(async () => {
      const response = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          shipping: selectedShipping,
          couponCode: appliedCouponCode,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            size: item.size,
            color: item.color
          }))
        })
      });
      const result = (await response.json()) as CheckoutQuoteResponse;

      if (response.ok && result.ok) {
        setQuote(result);
        return;
      }

      setQuote(null);
    });
  }, [appliedCouponCode, items, selectedShipping]);

  if (items.length === 0) {
    return (
      <section className="shell py-10">
        <div className="mx-auto max-w-[42rem] rounded-[1.75rem] border border-black/5 bg-white/85 p-6 text-center shadow-soft sm:p-8">
          <p className="eyebrow">Checkout</p>
          <h1 className="mt-2.5 font-display text-[2.2rem] leading-[0.95] text-ink sm:text-[2.8rem]">
            Seu carrinho está vazio.
          </h1>
          <p className="mt-3 text-[0.92rem] leading-7 text-slate">
            Adicione itens ao carrinho para revisar seu pedido, escolher a entrega e seguir para o
            pagamento com segurança.
          </p>
          <Link className="button-primary mt-8 inline-flex justify-center" href="/colecao">
            Ir para a coleção
          </Link>
        </div>
      </section>
    );
  }

  const isDemoMode = checkoutMode === "demo";
  const isOfflineMode = checkoutMode === "offline";
  const introDescription = isDemoMode
    ? `Revise contato, entrega e total do pedido antes de validar a etapa final de pagamento neste ambiente interno da ${siteName}.`
    : `Revise contato, entrega e total do pedido antes de seguir para o pagamento seguro, com continuidade clara entre checkout, conta e rastreio na ${siteName}.`;
  const submitLabel = isSubmitting
    ? "Finalizando pedido..."
    : isOfflineMode
      ? "Pagamento indisponível no momento"
      : isDemoMode
        ? "Revisar retorno interno do pedido"
        : "Seguir para o pagamento seguro";

  return (
    <section className="shell py-8">
      <div className="max-w-[40rem]">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-2.5 font-display text-[2.2rem] leading-[0.95] text-ink sm:text-[2.8rem]">
          Confirme entrega, total e próxima etapa da compra.
        </h1>
        <p className="mt-3 max-w-[36rem] text-[0.92rem] leading-7 text-slate">
          {introDescription}
        </p>
      </div>

      {isDemoMode ? (
        <div className="mt-6 rounded-[1.45rem] border border-amber-200 bg-amber-50 p-4 text-[0.86rem] leading-6 text-amber-950">
          Ambiente interno de QA: a etapa final usa retornos controlados para revisar checkout,
          retorno e pós-compra antes da ativação da conta Stripe correta do projeto.
        </div>
      ) : null}

      {isOfflineMode ? (
        <div className="mt-6 rounded-[1.45rem] border border-[#d8c9a8] bg-[#f5eddc] p-4 text-[0.86rem] leading-6 text-[#6a5330]">
          O pagamento online está temporariamente indisponível neste momento. Tente novamente em
          instantes ou fale com a equipe se precisar de apoio para concluir a compra.
        </div>
      ) : null}

      <div className="mt-6 grid gap-2.5 md:grid-cols-3">
        {[
          ["1", "Conta e entrega", "Contato, endereço e dados usados para registrar o pedido e liberar a expedição."],
          ["2", "Frete e total", "Frete, cupom e total revisados antes de abrir o pagamento."],
          [
            "3",
            isDemoMode ? "Retorno e pós-compra" : "Pagamento e acompanhamento",
            isDemoMode
              ? "Depois da revisão interna, conta, detalhe do pedido e rastreio continuam usando o mesmo número da compra."
              : "Depois da aprovação, o pedido continua disponível na conta, no detalhe e no rastreio com o mesmo número da compra."
          ]
        ].map(([step, title, description]) => (
          <div className="rounded-[1.2rem] border border-black/5 bg-white/80 p-3.5 shadow-soft" key={step}>
            <p className="text-[0.64rem] uppercase tracking-[0.18em] text-slate">Etapa {step}</p>
            <h2 className="mt-2 text-[0.94rem] font-semibold text-ink">{title}</h2>
            <p className="mt-1.5 text-[0.82rem] leading-5 text-slate">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2.5 md:grid-cols-3">
        {[
          [
            "Pagamento",
            "A confirmação acontece na etapa segura fora da vitrine e volta para a conta automaticamente."
          ],
          [
            "Situação do pedido",
            "O pedido só avança para preparação depois da aprovação do pagamento."
          ],
          [
            "Transporte",
            "O rastreio logístico só ganha destaque quando a expedição realmente começar."
          ]
        ].map(([title, description]) => (
          <div className="rounded-[1.2rem] border border-black/5 bg-black/[0.03] p-3.5" key={title}>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
              {title}
            </p>
            <p className="mt-2 text-[0.82rem] leading-6 text-slate">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <form
          className="space-y-5 rounded-[1.65rem] border border-black/5 bg-white/85 p-4 shadow-soft sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            setErrorMessage(null);

            if (!checkoutAvailable) {
              setErrorMessage(
                "O pagamento online está indisponível neste momento. Tente novamente em instantes."
              );
              return;
            }

            const formData = new FormData(event.currentTarget);
            const payload = buildCheckoutPayload(formData, selectedShipping, items);

            startSubmitTransition(async () => {
              const response = await fetch("/api/checkout/create-session", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
              });
              const result = (await response.json()) as CheckoutSessionResponse;

              if (!response.ok || !result.ok || !result.redirectUrl) {
                setErrorMessage(result.message || "Não foi possível iniciar o pagamento.");
                return;
              }

              window.location.assign(result.redirectUrl);
            });
          }}
        >
          <div className="space-y-4">
            <div className="rounded-[1.35rem] border border-black/10 bg-black/5 p-4 text-[0.84rem] leading-6 text-slate">
              <p className="font-semibold text-ink">Compra vinculada à sua conta</p>
              <p className="mt-2">
                Você está finalizando como{" "}
                <span className="font-semibold text-ink">{customer.email}</span>. O pedido ficará
                disponível na sua área do cliente para acompanhamento, detalhe e rastreio.
              </p>
            </div>

            <h2 className="text-[1rem] font-semibold text-ink">Conta e comprador</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">Nome completo</span>
                <input
                  autoComplete="name"
                  className="field-input"
                  defaultValue={customer.name}
                  name="name"
                  required
                  type="text"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">E-mail</span>
                <input
                  autoComplete="email"
                  className="field-input"
                  defaultValue={customer.email}
                  name="email"
                  readOnly
                  required
                  type="email"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">Telefone</span>
                <input
                  autoComplete="tel"
                  className="field-input"
                  defaultValue={customer.phone ?? ""}
                  name="phone"
                  required
                  type="tel"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">CPF</span>
                <input
                  className="field-input"
                  name="cpf"
                  placeholder="Opcional para conferência de pagamento"
                  type="text"
                />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[1rem] font-semibold text-ink">Endereço de entrega</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">CEP</span>
                <input
                  autoComplete="postal-code"
                  className="field-input"
                  name="postalCode"
                  required
                  type="text"
                />
              </label>
              <div className="hidden sm:block" />
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium text-ink">Rua e número</span>
                <input
                  autoComplete="street-address"
                  className="field-input"
                  name="address"
                  placeholder="Ex.: Rua da Consolação, 410"
                  required
                  type="text"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">Cidade</span>
                <input
                  autoComplete="address-level2"
                  className="field-input"
                  name="city"
                  required
                  type="text"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">Estado</span>
                <input
                  autoComplete="address-level1"
                  className="field-input"
                  name="state"
                  required
                  type="text"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">Complemento</span>
                <input className="field-input" name="complement" type="text" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">Referência</span>
                <input className="field-input" name="reference" type="text" />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[1rem] font-semibold text-ink">Entrega</h2>
            <div className="space-y-3">
              {SHIPPING_OPTIONS.map((option) => {
                const optionQuote = getShippingQuote(option.id, resolvedSubtotal);

                return (
                  <label
                    className={`block rounded-[1.15rem] border p-3 transition ${
                      selectedShipping === option.id
                        ? "border-ink bg-ink text-white"
                        : "border-black/10 bg-black/5 text-ink"
                    }`}
                    key={option.id}
                  >
                    <input
                      checked={selectedShipping === option.id}
                      className="sr-only"
                      name="shipping"
                      onChange={() => setSelectedShipping(option.id)}
                      type="radio"
                      value={option.id}
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{option.label}</p>
                        <p
                          className={`mt-1 text-[0.82rem] ${
                            selectedShipping === option.id ? "text-white/75" : "text-slate"
                          }`}
                        >
                          {option.description}
                        </p>
                      </div>
                      <strong>
                        {optionQuote.amount === 0 ? "Grátis" : formatCurrency(optionQuote.amount)}
                      </strong>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[1rem] font-semibold text-ink">Pagamento</h2>
            <div className="rounded-[1.2rem] border border-black/10 bg-black/5 p-3.5">
              <p className="font-semibold text-ink">
                {isDemoMode ? "QA interna da etapa final" : "Etapa segura de pagamento"}
              </p>
              <p className="mt-2 text-[0.82rem] leading-6 text-slate">
                {isOfflineMode
                  ? "O checkout está temporariamente indisponível. Assim que o pagamento voltar a estar ativo, a finalização segue normalmente pelo fluxo previsto."
                  : isDemoMode
                    ? "Neste ambiente, a etapa final usa retornos internos de aprovação, análise ou cancelamento para revisar a jornada até conta, pedidos e rastreio antes da ativação da conta Stripe correta."
                    : "Ao concluir, você será redirecionado para uma etapa segura fora da vitrine. Depois disso, conta, detalhe do pedido e rastreio continuam com o mesmo número da compra."}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-black/10 bg-white/85 p-3.5 text-[0.82rem] leading-6 text-slate">
              <p className="font-semibold text-ink">Depois da compra</p>
              <p className="mt-2">
                Pagamento aprovado, situação do pedido e transporte passam a aparecer em sequência
                na sua conta, no detalhe do pedido e no rastreio.
              </p>
            </div>
          </div>

          <div className="rounded-[1.2rem] bg-black/5 p-3.5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">Cupom</span>
                <input
                  className="field-input"
                  name="couponCode"
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Se tiver um cupom, informe aqui"
                  type="text"
                  value={couponCode}
                />
              </label>
              <button
                className="button-secondary self-end justify-center"
                disabled={isQuoting}
                onClick={async () => {
                  setQuoteMessage(null);

                  const response = await fetch("/api/checkout/quote", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      shipping: selectedShipping,
                      couponCode,
                      items: items.map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        size: item.size,
                        color: item.color
                      }))
                    })
                  });
                  const result = (await response.json()) as CheckoutQuoteResponse;

                  if (!response.ok || !result.ok) {
                    setQuoteMessage(result.message);
                    return;
                  }

                  setAppliedCouponCode(couponCode);
                  setQuote(result);
                  setQuoteMessage(result.message);
                }}
                type="button"
              >
                Aplicar cupom
              </button>
            </div>
            <p className="mt-2.5 text-[0.82rem] leading-6 text-slate">
              Frete padrão grátis acima de {formatCurrency(FREE_SHIPPING_THRESHOLD)}.
            </p>
            {quoteMessage ? <p className="mt-2 text-[0.82rem] leading-6 text-ink">{quoteMessage}</p> : null}
          </div>

          <button
            className="button-primary w-full justify-center"
            disabled={isSubmitting || !checkoutAvailable}
            type="submit"
          >
            {submitLabel}
          </button>
          <div className="rounded-[1.05rem] border border-black/6 bg-black/[0.03] p-3 text-[0.82rem] leading-6 text-slate">
            {isOfflineMode
              ? "Assim que o ambiente de pagamento for reativado, esta etapa volta a redirecionar para a finalização normal do pedido."
              : isDemoMode
                ? "Este ambiente valida a jornada interna antes da ativação da conta Stripe correta."
                : "Ao seguir, você sai da vitrine apenas para concluir o pagamento. Depois disso, o pedido segue sendo acompanhado pela conta, pelo detalhe e pelo rastreio."}
          </div>
          {errorMessage ? <p className="text-[0.82rem] leading-6 text-[#8b342e]">{errorMessage}</p> : null}
        </form>

        <aside className="space-y-4 rounded-[1.65rem] border border-black/5 bg-[#111111] p-4 text-white shadow-soft sm:p-5">
          <div>
            <p className="eyebrow !text-white/50">Resumo do pedido</p>
            <h2 className="font-display text-[1.75rem] leading-none">Revise antes de finalizar</h2>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <article className="rounded-[1.2rem] border border-white/10 bg-white/5 p-3" key={item.id}>
                <div className="flex gap-4">
                  <div className="rounded-[1rem] bg-white/10 p-2.5">
                    <Image
                      alt={item.name}
                      className="h-auto w-auto"
                      height={96}
                      sizes="84px"
                      src={item.image}
                      width={84}
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[0.9rem] font-semibold">{item.name}</h3>
                          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-white/45">
                            {item.size} • {item.color}
                          </p>
                        </div>
                        <span className="text-[0.82rem] font-medium">{formatCurrency(item.price)}</span>
                      </div>
                      <p className="mt-2 text-[0.82rem] leading-6 text-white/65">{item.subtitle}</p>
                    </div>

                    <div className="mt-3 flex items-center rounded-full border border-white/10 bg-black/20">
                      <button
                        className="h-9 w-9 text-lg"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        type="button"
                      >
                        −
                      </button>
                      <span className="min-w-9 text-center text-[0.82rem]">{item.quantity}</span>
                      <button
                        className="h-9 w-9 text-lg"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="space-y-2.5 rounded-[1.2rem] bg-white/5 p-3.5">
            <div className="flex items-center justify-between text-[0.82rem] text-white/70">
              <span>Subtotal</span>
              <span>{formatCurrency(resolvedSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[0.82rem] text-white/70">
              <span>Desconto</span>
              <span>{resolvedDiscount > 0 ? `- ${formatCurrency(resolvedDiscount)}` : "R$ 0,00"}</span>
            </div>
            <div className="flex items-center justify-between text-[0.82rem] text-white/70">
              <span>Entrega</span>
              <span>{resolvedShipping === 0 ? "Grátis" : formatCurrency(resolvedShipping)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[0.92rem] font-semibold">
              <span>Total</span>
              <span>{formatCurrency(resolvedTotal)}</span>
            </div>
          </div>

          {quote?.couponCode ? (
            <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3.5 text-[0.82rem] leading-6 text-white/75">
              Cupom aplicado: <span className="font-semibold text-white">{quote.couponCode}</span>
              {quote.couponDescription ? ` • ${quote.couponDescription}` : ""}
            </div>
          ) : null}

          <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3.5 text-[0.82rem] leading-6 text-white/72">
            {isOfflineMode
              ? "Quando o pagamento online estiver disponível novamente, o mesmo número do pedido seguirá aparecendo na conta e no rastreio."
              : isDemoMode
                ? "Depois da revisão interna, conta, detalhe do pedido e rastreio continuam usando o mesmo número para validar a jornada."
                : "Depois da finalização, você acompanha tudo pela conta e pelo rastreio usando o mesmo número do pedido."}
          </div>
        </aside>
      </div>
    </section>
  );
}
