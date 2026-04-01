import Link from "next/link";

import {
  AccountProgressSteps,
  AccountStatusTag
} from "@/components/account/account-cards";
import {
  buildTrackingHref,
  formatCompactDateTime,
  getOrderPaymentSummary,
  getOrderProgressSteps,
  getOrderTrackingSummary
} from "@/lib/account";
import {
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getShippingMethodLabel,
  getShippingStatusLabel
} from "@/lib/order-status";
import { formatCurrency } from "@/lib/utils";

type PostPurchaseOrderItem = {
  id: string;
  productName: string;
  productSlug: string;
  sku: string;
  unitPrice: number | string | { toString(): string };
  quantity: number;
  sizeLabel: string;
  colorName: string;
};

type PostPurchaseOrder = {
  id: string;
  number: string;
  createdAt: Date;
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  paymentProvider?: string | null;
  paymentMethod?: string | null;
  paymentStatusDetail?: string | null;
  shippingMethod?: string | null;
  customerEmail: string;
  customerName: string;
  subtotal: number | string | { toString(): string };
  discountAmount: number | string | { toString(): string };
  shippingAmount: number | string | { toString(): string };
  total: number | string | { toString(): string };
  address?: {
    recipientName?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    phone?: string | null;
  } | null;
  coupon?: {
    code: string;
  } | null;
  items: PostPurchaseOrderItem[];
};

type PostPurchaseGuidanceItem = {
  title: string;
  description: string;
};

type PostPurchaseInfoCard = {
  kicker: string;
  body?: string;
  rows?: Array<{
    label: string;
    value: string;
  }>;
};

type PostPurchaseAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "accent";
};

type PostPurchaseViewProps = {
  eyebrow: string;
  title: string;
  description: string;
  journeySummary?: string | null;
  nextStep?: string | null;
  order: PostPurchaseOrder | null;
  guidanceTitle: string;
  guidanceItems: PostPurchaseGuidanceItem[];
  infoCards: PostPurchaseInfoCard[];
  actions: PostPurchaseAction[];
  notice?: {
    tone?: "neutral" | "danger";
    message: string;
  } | null;
  emptyMessage: string;
  progressTitle?: string;
};

function resolveActionClass(variant: PostPurchaseAction["variant"]) {
  if (variant === "secondary") {
    return "button-secondary";
  }

  if (variant === "ghost") {
    return "button-ghost";
  }

  if (variant === "accent") {
    return "button-accent";
  }

  return "button-primary";
}

export function PostPurchaseView({
  eyebrow,
  title,
  description,
  journeySummary,
  nextStep,
  order,
  guidanceTitle,
  guidanceItems,
  infoCards,
  actions,
  notice,
  emptyMessage,
  progressTitle = "Andamento do pedido"
}: PostPurchaseViewProps) {
  const progressSteps = order ? getOrderProgressSteps(order) : [];
  const shippingAmount = Number(order?.shippingAmount ?? 0);
  const discountAmount = Number(order?.discountAmount ?? 0);
  const subtotal = Number(order?.subtotal ?? 0);
  const total = Number(order?.total ?? 0);
  const trackingHref = order ? buildTrackingHref(order) : null;
  const paymentSummary = order ? getOrderPaymentSummary(order) : null;
  const trackingSummary = order ? getOrderTrackingSummary(order) : null;

  return (
    <section className="shell py-10">
      <div className="mx-auto max-w-[72rem] rounded-[2rem] border border-black/5 bg-white/90 p-5 shadow-soft sm:p-6">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2.5 font-display text-[2.25rem] leading-[0.95] text-ink sm:text-[2.8rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-[0.92rem] leading-7 text-slate">{description}</p>

        {notice ? (
          <div
            className={`mt-6 rounded-[1.3rem] p-4 text-[0.86rem] leading-6 ${
              notice.tone === "danger"
                ? "bg-[#f6e9e4] text-[#8b342e]"
                : "border border-black/8 bg-black/[0.03] text-slate"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        {order ? (
          <>
            <div className="mt-7 grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
              <section className="panel-dark rounded-[1.55rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="eyebrow !text-white/55">Pedido {order.number}</p>
                    <h2 className="mt-2.5 text-[1.5rem] font-semibold text-white">{order.number}</h2>
                    <p className="mt-2.5 max-w-xl text-[0.84rem] leading-6 text-white/72">
                      {journeySummary ?? "O pedido segue disponível para consulta na sua conta."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <AccountStatusTag status={order.status}>
                      {getOrderStatusLabel(order.status)}
                    </AccountStatusTag>
                    <AccountStatusTag status={order.paymentStatus}>
                      {getPaymentStatusLabel(order.paymentStatus)}
                    </AccountStatusTag>
                    <AccountStatusTag status={order.shippingStatus}>
                      {getShippingStatusLabel(order.shippingStatus)}
                    </AccountStatusTag>
                  </div>
                </div>

                <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.06] p-3.5">
                    <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-white/50">
                      Feito em
                    </p>
                    <p className="mt-1.5 text-[0.84rem] font-semibold text-white">
                      {formatCompactDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.06] p-3.5">
                    <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-white/50">
                      Total
                    </p>
                    <p className="mt-1.5 text-[0.84rem] font-semibold text-white">
                      {formatCurrency(total)}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.06] p-3.5">
                    <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-white/50">
                      Próxima etapa
                    </p>
                    <p className="mt-1.5 text-[0.84rem] font-semibold text-white">
                      {nextStep ?? "Acompanhe a próxima atualização na conta."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.55rem] border border-black/6 bg-black/[0.03] p-4 sm:p-5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
                  {progressTitle}
                </p>
                <div className="mt-4">
                  <AccountProgressSteps steps={progressSteps} />
                </div>
              </section>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-[1.35rem] border border-black/6 bg-black/[0.03] p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
                  Situação do pedido
                </p>
                <p className="mt-2 text-[0.92rem] font-semibold text-ink">
                  {getOrderStatusLabel(order.status)}
                </p>
                <p className="mt-2 text-[0.82rem] leading-6 text-slate">
                  {journeySummary ?? "O pedido segue disponível para consulta na sua conta."}
                </p>
              </div>

              <div className="rounded-[1.35rem] border border-black/6 bg-black/[0.03] p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
                  Pagamento
                </p>
                <p className="mt-2 text-[0.92rem] font-semibold text-ink">
                  {getPaymentStatusLabel(order.paymentStatus)}
                </p>
                <p className="mt-2 text-[0.82rem] leading-6 text-slate">{paymentSummary}</p>
                <p className="mt-2 text-[0.72rem] uppercase tracking-[0.16em] text-slate">
                  Canal {getPaymentMethodLabel(order.paymentMethod)}
                </p>
              </div>

              <div className="rounded-[1.35rem] border border-black/6 bg-black/[0.03] p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
                  Transporte
                </p>
                <p className="mt-2 text-[0.92rem] font-semibold text-ink">
                  {getShippingStatusLabel(order.shippingStatus)}
                </p>
                <p className="mt-2 text-[0.82rem] leading-6 text-slate">{trackingSummary}</p>
                <p className="mt-2 text-[0.72rem] uppercase tracking-[0.16em] text-slate">
                  Modalidade {getShippingMethodLabel(order.shippingMethod)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.04fr_0.96fr]">
              <section className="rounded-[1.55rem] border border-black/6 bg-black/[0.03] p-4 sm:p-5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
                  Itens do pedido
                </p>
                <div className="mt-3.5 grid gap-2.5">
                  {order.items.map((item) => (
                    <article className="rounded-[1.1rem] border border-black/6 bg-white/90 p-3.5" key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[0.92rem] font-semibold text-ink">{item.productName}</p>
                          <p className="mt-1 text-[0.82rem] leading-5 text-slate">
                            {item.colorName} • {item.sizeLabel} • {item.quantity}{" "}
                            {item.quantity === 1 ? "unidade" : "unidades"}
                          </p>
                          <p className="mt-2 text-[0.64rem] uppercase tracking-[0.14em] text-slate">
                            SKU {item.sku}
                          </p>
                        </div>
                        <p className="text-[0.84rem] font-semibold text-ink">
                          {formatCurrency(Number(item.unitPrice) * item.quantity)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="grid gap-4">
                <div className="rounded-[1.55rem] border border-black/6 bg-black/[0.03] p-4 sm:p-5">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
                    Totais do pedido
                  </p>
                  <div className="mt-3.5 space-y-2.5 text-[0.84rem] leading-6 text-slate">
                    <div className="flex items-center justify-between gap-4">
                      <span>Subtotal</span>
                      <span className="font-semibold text-ink">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Frete</span>
                      <span className="font-semibold text-ink">
                        {shippingAmount > 0 ? formatCurrency(shippingAmount) : "Grátis"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span>Desconto</span>
                        {order.coupon ? (
                          <p className="mt-1 text-[0.72rem] uppercase tracking-[0.16em] text-slate">
                            Cupom {order.coupon.code}
                          </p>
                        ) : null}
                      </div>
                      <span className="font-semibold text-ink">
                        {discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : "Sem desconto"}
                      </span>
                    </div>
                    <div className="h-px w-full bg-black/6" />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[0.92rem] font-semibold text-ink">Total</span>
                      <span className="text-[0.92rem] font-semibold text-ink">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.55rem] border border-black/6 bg-black/[0.03] p-4 sm:p-5">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
                    {guidanceTitle}
                  </p>
                  <div className="mt-3.5 grid gap-2.5">
                    {guidanceItems.map((item) => (
                      <div className="rounded-[1.1rem] border border-black/6 bg-white/90 p-3.5" key={item.title}>
                        <p className="text-[0.88rem] font-semibold text-ink">{item.title}</p>
                        <p className="mt-1.5 text-[0.82rem] leading-5 text-slate">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {infoCards.map((card) => (
                  <div className="rounded-[1.55rem] border border-black/6 bg-black/[0.03] p-4 sm:p-5" key={card.kicker}>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
                      {card.kicker}
                    </p>
                    {card.body ? <p className="mt-2.5 text-[0.84rem] leading-6 text-slate">{card.body}</p> : null}
                    {card.rows?.length ? (
                      <div className="mt-2.5 space-y-2 text-[0.84rem] leading-6 text-slate">
                        {card.rows.map((row) => (
                          <p key={row.label}>
                            <span className="font-semibold text-ink">{row.label}:</span> {row.value}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}

                {trackingHref ? (
                  <Link className="button-ghost justify-center" href={trackingHref}>
                    Abrir rastreio deste pedido
                  </Link>
                ) : null}
              </aside>
            </div>
          </>
        ) : (
          <div className="mt-7 rounded-[1.55rem] bg-black/5 p-5 text-[0.86rem] leading-6 text-slate">
            {emptyMessage}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
          {actions.map((action) => (
            <Link
              className={`${resolveActionClass(action.variant)} justify-center`}
              href={action.href}
              key={`${action.label}-${action.href}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
