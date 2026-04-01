import type { OrderStatus, PaymentStatus, ShippingStatus } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  buildAccountOrderHref,
  buildTrackingHref,
  formatCompactDate,
  getOrderJourneySummary,
  getOrderPaymentSummary,
  getOrderNextStep,
  getOrderTrackingSummary,
  getStatusToneClasses
} from "@/lib/account";
import { getOrderStatusLabel, getPaymentStatusLabel, getShippingStatusLabel } from "@/lib/order-status";
import type { StorefrontProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type ActionLink = {
  label: string;
  href: string;
};

type OrderCardItem = {
  id: string;
  productName: string;
  productSlug: string;
  quantity: number;
  sizeLabel: string;
  colorName: string;
  imageUrl: string;
};

type OrderCardData = {
  id: string;
  number: string;
  createdAt: Date;
  updatedAt: Date;
  customerEmail: string;
  customerName: string;
  total: number | string | { toString(): string };
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  shippingMethod?: string | null;
  paymentProvider?: string | null;
  paymentMethod?: string | null;
  paymentStatusDetail?: string | null;
  items: OrderCardItem[];
};

type AccountPanelHeadingProps = {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

type AccountMetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  emphasize?: boolean;
};

type AccountStatusTagProps = {
  status: string;
  children: ReactNode;
};

type AccountEmptyPanelProps = {
  title: string;
  description: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
};

type AccountOrderCardProps = {
  order: OrderCardData;
  showPreview?: boolean;
};

type AccountFavoriteCardProps = {
  product: StorefrontProduct;
  priority?: boolean;
};

type AccountActionTileProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
};

type AccountProgressStep = {
  id: string;
  label: string;
  detail: string;
  state: "complete" | "current" | "upcoming";
};

type AccountProgressStepsProps = {
  steps: AccountProgressStep[];
};

export function AccountPanelHeading({
  kicker,
  title,
  description,
  action
}: AccountPanelHeadingProps) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate">
          {kicker}
        </p>
        <h2 className="mt-1.5 text-[0.98rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.08rem]">
          {title}
        </h2>
        {description ? <p className="mt-1.5 text-[0.82rem] leading-5 text-slate">{description}</p> : null}
      </div>
      {action ? <div className="sm:self-start">{action}</div> : null}
    </div>
  );
}

export function AccountMetricCard({
  label,
  value,
  detail,
  emphasize = false
}: AccountMetricCardProps) {
  return (
    <div
      className={`account-stat flex h-full flex-col justify-between gap-2.5 ${emphasize ? "border-black/80 bg-ink text-white shadow-soft" : ""}`}
    >
      <p
        className={`text-[0.6rem] font-semibold uppercase tracking-[0.16em] ${
          emphasize ? "text-white/62" : "text-slate"
        }`}
      >
        {label}
      </p>
      <p className={`text-[1rem] font-semibold tracking-[-0.03em] sm:text-[1.08rem] ${emphasize ? "text-white" : "text-ink"}`}>
        {value}
      </p>
      {detail ? (
        <p className={`text-[0.78rem] leading-5 ${emphasize ? "text-white/72" : "text-slate"}`}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function AccountStatusTag({ status, children }: AccountStatusTagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.12em] ${getStatusToneClasses(status)}`}
    >
      {children}
    </span>
  );
}

export function AccountEmptyPanel({
  title,
  description,
  primaryAction,
  secondaryAction
}: AccountEmptyPanelProps) {
  return (
    <div className="account-panel-muted border-dashed text-center">
      <div className="mx-auto max-w-xl">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate">
          Área do cliente
        </p>
        <h3 className="mt-2.5 text-[1.02rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.12rem]">
          {title}
        </h3>
        <p className="mt-2.5 text-[0.86rem] leading-6 text-slate">{description}</p>
      </div>

      {primaryAction || secondaryAction ? (
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          {primaryAction ? (
            <Link className="button-primary justify-center" href={primaryAction.href}>
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link className="button-secondary justify-center" href={secondaryAction.href}>
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AccountOrderCard({ order, showPreview = true }: AccountOrderCardProps) {
  const previewItems = order.items.slice(0, 2);
  const journeySummary = getOrderJourneySummary(order);
  const nextStep = getOrderNextStep(order);
  const paymentSummary = getOrderPaymentSummary(order);
  const trackingSummary = getOrderTrackingSummary(order);

  return (
    <article className="rounded-[1.2rem] border border-black/6 bg-white/92 p-3.5 shadow-sm backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3.5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="account-chip">{order.number}</span>
            <span className="text-[0.58rem] uppercase tracking-[0.12em] text-slate">
              Feito em {formatCompactDate(order.createdAt)}
            </span>
            <span className="text-[0.58rem] uppercase tracking-[0.12em] text-slate">
              Atualizado em {formatCompactDate(order.updatedAt)}
            </span>
          </div>

          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[auto_auto_1fr] xl:max-w-3xl">
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate">
                Total
              </p>
              <p className="mt-1 text-[0.9rem] font-semibold tracking-[-0.02em] text-ink">
                {formatCurrency(Number(order.total))}
              </p>
            </div>
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate">
                Itens
              </p>
              <p className="mt-1 text-[0.84rem] font-medium text-ink">
                {order.items.length} {order.items.length === 1 ? "item" : "itens"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate">
                Situação atual
              </p>
              <p className="mt-1 line-clamp-2 text-[0.8rem] leading-5 text-slate">{journeySummary}</p>
            </div>
          </div>

          {showPreview && previewItems.length > 0 ? (
            <div className="mt-2.5 min-w-0 rounded-[0.95rem] border border-black/6 bg-black/[0.025] px-3 py-2.5">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate">
                Itens do pedido
              </p>
              <p className="mt-1 truncate text-[0.78rem] text-slate">
                {previewItems.map((item) => item.productName).join(" • ")}
                {order.items.length > previewItems.length ? " • +" : ""}
              </p>
            </div>
          ) : null}

          <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
            <div className="rounded-[0.95rem] border border-black/6 bg-black/[0.025] p-2.5">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate">
                Pagamento
              </p>
              <p className="mt-1 text-[0.78rem] leading-5 text-slate">{paymentSummary}</p>
            </div>
            <div className="rounded-[0.95rem] border border-black/6 bg-black/[0.025] p-2.5">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate">
                Transporte e próxima etapa
              </p>
              <p className="mt-1 text-[0.78rem] leading-5 text-slate">{trackingSummary}</p>
              <p className="mt-2 text-[0.78rem] leading-5 text-slate">{nextStep}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 xl:max-w-[20rem] xl:justify-end">
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

      <div className="mt-3 flex flex-col gap-1.5 border-t border-black/5 pt-2.5 sm:flex-row">
        <Link className="button-secondary button-compact justify-center px-3.5" href={buildAccountOrderHref(order)}>
          Ver detalhe completo
        </Link>
        <Link className="button-ghost button-compact justify-center px-3.5" href={buildTrackingHref(order)}>
          Abrir rastreio
        </Link>
      </div>
    </article>
  );
}

export function AccountFavoriteCard({
  product,
  priority = false
}: AccountFavoriteCardProps) {
  return (
    <article className="rounded-[1.05rem] border border-black/6 bg-white/88 p-2.5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex gap-3">
        <Link
          className="relative block h-[4.5rem] w-[3.9rem] shrink-0 overflow-hidden rounded-[0.8rem] border border-black/6"
          href={`/produto/${product.slug}`}
          style={{ backgroundImage: product.gradient }}
        >
          <div className="absolute inset-0 bg-campaign-lines opacity-95" />
          <Image
            alt={`Camisa ${product.name}`}
            className="relative h-full w-full object-contain p-2.5"
            fill
            priority={priority}
            sizes="96px"
            src={product.image}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate">
              {product.collection}
            </p>
            {product.badge ? <span className="status-badge">{product.badge}</span> : null}
          </div>

          <h3 className="mt-1.5 text-[0.88rem] font-semibold text-ink">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-[0.78rem] leading-5 text-slate">{product.subtitle}</p>

          <div className="mt-2.5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.8rem] font-semibold text-ink">{formatCurrency(product.price)}</p>
              <p className="mt-1 text-[0.64rem] uppercase tracking-[0.12em] text-slate">
                {product.stock > 0 ? "Pronto para escolher tamanho" : "Estoque sob consulta"}
              </p>
            </div>
            <Link className="button-secondary button-compact justify-center px-3.5" href={`/produto/${product.slug}`}>
              Ver produto
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AccountActionTile({
  eyebrow,
  title,
  description,
  href
}: AccountActionTileProps) {
  return (
    <Link
      className="account-panel-muted flex items-center justify-between gap-4 transition hover:-translate-y-0.5 hover:shadow-soft"
      href={href}
    >
      <div className="min-w-0">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate">
          {eyebrow}
        </p>
        <h3 className="mt-1.5 text-[0.9rem] font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-[0.78rem] leading-5 text-slate">{description}</p>
      </div>
      <span className="shrink-0 text-[0.76rem] font-semibold text-ink">Abrir</span>
    </Link>
  );
}

export function AccountProgressSteps({ steps }: AccountProgressStepsProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => {
        const appearance =
          step.state === "complete"
            ? "border-forest/15 bg-forest/[0.08]"
            : step.state === "current"
              ? "border-ink/15 bg-white"
              : "border-black/6 bg-black/[0.03]";

        const indicator =
          step.state === "complete"
            ? "border-forest/20 bg-forest text-white"
            : step.state === "current"
              ? "border-ink bg-ink text-white"
              : "border-black/10 bg-white text-slate";

        return (
          <div className={`rounded-[0.95rem] border p-3 ${appearance}`} key={step.id}>
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[0.6rem] font-semibold ${indicator}`}
            >
              {index + 1}
            </span>
            <h3 className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink">
              {step.label}
            </h3>
            <p className="mt-1.5 text-[0.78rem] leading-5 text-slate">{step.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
