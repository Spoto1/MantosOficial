import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AccountPanelHeading,
  AccountProgressSteps,
  AccountStatusTag
} from "@/components/account/account-cards";
import { AccountShell } from "@/components/account/account-shell";
import {
  buildTrackingHref,
  formatCompactDateTime,
  getOrderJourneySummary,
  getOrderPaymentSummary,
  getOrderNextStep,
  getOrderProgressSteps,
  getOrderTrackingSummary
} from "@/lib/account";
import { requireCustomerAuth } from "@/lib/auth/customer";
import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import {
  appendLocalValidationContext,
  isLocalValidationContext
} from "@/lib/local-validation";
import {
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getShippingMethodLabel,
  getShippingStatusLabel
} from "@/lib/order-status";
import { getCustomerOrderById } from "@/lib/repositories/customers";
import { buildMetadata } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

type AccountOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    context?: string;
  }>;
};

export async function generateMetadata({
  params
}: AccountOrderDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;

  return buildMetadata({
    title: "Detalhe do pedido",
    description: "Visão detalhada do pedido com andamento, itens, entrega e resumo financeiro.",
    path: `/conta/pedidos/${resolvedParams.id}`,
    noIndex: true
  });
}

function getPaymentContext(order: {
  status: string;
  paymentStatus: string;
  paidAt: Date | null;
  paymentProvider?: string | null;
  paymentMethod?: string | null;
}) {
  if (order.paymentStatus === "PAID") {
    const prefix = "Pagamento online confirmado";

    return order.paidAt
      ? `${prefix} em ${formatCompactDateTime(order.paidAt)}.`
      : `${prefix} e pedido liberado para preparação.`;
  }

  if (order.paymentStatus === "AUTHORIZED") {
    return "O pagamento foi autorizado e a confirmação final ainda pode levar alguns instantes.";
  }

  if (order.paymentStatus === "REFUNDED" || order.status === "REFUNDED") {
    return "O estorno foi registrado para este pedido.";
  }

  if (order.paymentStatus === "FAILED" || order.status === "FAILED") {
    return "O pagamento não foi concluído. Se quiser comprar novamente, gere um novo checkout.";
  }

  if (order.paymentStatus === "CANCELLED" || order.status === "CANCELLED") {
    return "Não há cobrança pendente para este pedido.";
  }

  return "A aprovação do pagamento ainda está em andamento e o pedido avança automaticamente quando houver confirmação.";
}

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({
  params,
  searchParams
}: AccountOrderDetailPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const localValidationLookup =
    isLocalCheckoutDemoAllowed() && isLocalValidationContext(resolvedSearchParams.context);
  const ordersHref = appendLocalValidationContext("/conta/pedidos", localValidationLookup);
  const dashboardHref = appendLocalValidationContext("/conta", localValidationLookup);
  const session = await requireCustomerAuth({
    next: ordersHref
  });
  const resolvedParams = await params;
  const order = await getCustomerOrderById(session.customerId, resolvedParams.id, {
    controlledOnly: localValidationLookup
  });

  if (!order) {
    notFound();
  }

  const progressSteps = getOrderProgressSteps(order);
  const shippingAmount = Number(order.shippingAmount);
  const discountAmount = Number(order.discountAmount);
  const subtotal = Number(order.subtotal);
  const total = Number(order.total);
  const journeySummary = getOrderJourneySummary(order);
  const trackingSummary = getOrderTrackingSummary(order);
  const nextStep = getOrderNextStep(order);
  const paymentSummary = getOrderPaymentSummary(order);
  const paymentContext = getPaymentContext(order);
  const trackingHref = buildTrackingHref(order);
  const addressPhone = order.address?.phone ?? order.customerPhone;

  return (
    <AccountShell
      actions={
        <>
          <Link className="button-secondary button-compact justify-center" href={ordersHref}>
            Voltar aos pedidos
          </Link>
          <Link className="button-accent button-compact justify-center" href={trackingHref}>
            Acompanhar pedido
          </Link>
        </>
      }
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Minha conta", href: dashboardHref },
        { label: "Pedidos", href: ordersHref },
        { label: order.number }
      ]}
      description="Resumo completo do pedido com leitura clara de status, entrega, pagamento, itens e próximos passos."
      eyebrow="Detalhe do pedido"
      preserveLocalValidationContext={localValidationLookup}
      section="orders"
      title={order.number}
    >
      <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="panel-dark rounded-[1.35rem] p-3.5 sm:p-4">
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow !text-white/58">Resumo do pedido</p>
              <h2 className="mt-2 text-[1.28rem] font-semibold leading-tight text-white sm:text-[1.48rem]">
                Pedido, pagamento e transporte organizados em uma única leitura.
              </h2>
              <p className="mt-2 text-[0.82rem] leading-5 text-white/72">{journeySummary}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
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

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Pedido
              </p>
              <p className="mt-1 text-[0.88rem] font-semibold text-white">{order.number}</p>
            </div>
            <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Feito em
              </p>
              <p className="mt-1 text-[0.88rem] font-semibold text-white">
                {formatCompactDateTime(order.createdAt)}
              </p>
            </div>
            <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Pagamento
              </p>
              <p className="mt-1 text-[0.88rem] font-semibold text-white">
                {getPaymentStatusLabel(order.paymentStatus)}
              </p>
            </div>
            <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Total
              </p>
              <p className="mt-1 text-[0.88rem] font-semibold text-white">{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="mt-3.5 grid gap-2 md:grid-cols-3">
            <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Situação do pedido
              </p>
              <p className="mt-1.5 text-[0.86rem] font-semibold text-white">
                {getOrderStatusLabel(order.status)}
              </p>
              <p className="mt-1.5 text-[0.78rem] leading-5 text-white/72">{journeySummary}</p>
            </div>
            <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Pagamento
              </p>
              <p className="mt-1.5 text-[0.86rem] font-semibold text-white">
                {getPaymentStatusLabel(order.paymentStatus)}
              </p>
              <p className="mt-1.5 text-[0.78rem] leading-5 text-white/72">{paymentSummary}</p>
            </div>
            <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Transporte
              </p>
              <p className="mt-1.5 text-[0.86rem] font-semibold text-white">
                {getShippingStatusLabel(order.shippingStatus)}
              </p>
              <p className="mt-1.5 text-[0.78rem] leading-5 text-white/72">{trackingSummary}</p>
            </div>
          </div>

          <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
            <Link className="button-accent button-compact justify-center" href={trackingHref}>
              Acompanhar este pedido
            </Link>
            <Link className="button-secondary button-compact justify-center" href="/colecao">
              Continuar comprando
            </Link>
          </div>
        </section>

        <section className="account-panel">
          <AccountPanelHeading
            description="Depois da leitura principal, este bloco destaca o que acompanhar agora e qual ação faz sentido em seguida."
            kicker="Próximos passos"
            title="O que acompanhar agora"
          />

          <div className="mt-4 grid gap-2.5">
            <div className="account-panel-muted">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                Próxima atualização
              </p>
              <p className="mt-1.5 text-[0.84rem] leading-5 text-slate">{nextStep}</p>
            </div>

            <div className="account-panel-muted">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                Entrega e acompanhamento
              </p>
              <p className="mt-1.5 text-[0.84rem] leading-5 text-slate">{trackingSummary}</p>
            </div>

            <div className="account-panel-muted">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                Pagamento
              </p>
              <p className="mt-1.5 text-[0.84rem] leading-5 text-slate">{paymentContext}</p>
            </div>

            {order.notes ? (
              <div className="account-panel-muted">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                  Observações do pedido
                </p>
                <p className="mt-1.5 text-[0.84rem] leading-5 text-slate">{order.notes}</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="account-panel mt-3">
        <AccountPanelHeading
          action={
            <Link className="button-ghost button-compact justify-center px-4" href="/contato">
              Falar com a equipe
            </Link>
          }
          description="Um resumo visual para separar pedido recebido, confirmação de pagamento, preparação e entrega."
          kicker="Andamento"
          title="Linha do pedido"
        />

        <div className="mt-3.5">
          <AccountProgressSteps steps={progressSteps} />
        </div>
      </section>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[1.06fr_0.94fr]">
        <section className="account-panel">
          <AccountPanelHeading
            description="Itens comprados com variante, quantidade e valor unitário organizados para consulta rápida."
            kicker="Itens"
            title="Composição do pedido"
          />

          <div className="mt-3.5 grid gap-2.5">
            {order.items.map((item) => (
              <article
                className="rounded-[1rem] border border-black/6 bg-white/88 p-3 shadow-sm"
                key={item.id}
              >
                <div className="flex flex-col gap-3.5 sm:flex-row">
                  <Link
                    className="relative block h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[0.85rem] border border-black/6 bg-[#f4efe6]"
                    href={`/produto/${item.productSlug}`}
                  >
                    <Image
                      alt={`Peça ${item.productName}`}
                      className="object-contain p-2.5"
                      fill
                      sizes="96px"
                      src={item.imageUrl}
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          className="text-[0.88rem] font-semibold text-ink hover:text-forest"
                          href={`/produto/${item.productSlug}`}
                        >
                          {item.productName}
                        </Link>
                        <p className="mt-1 text-[0.78rem] leading-5 text-slate">
                          {item.colorName} • {item.sizeLabel} • {item.quantity}{" "}
                          {item.quantity === 1 ? "unidade" : "unidades"}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <span className="account-chip">SKU {item.sku}</span>
                          <span className="account-chip">
                            Unitário {formatCurrency(Number(item.unitPrice))}
                          </span>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-[0.58rem] uppercase tracking-[0.12em] text-slate">
                          Total do item
                        </p>
                        <p className="mt-1 text-[0.88rem] font-semibold text-ink">
                          {formatCurrency(Number(item.unitPrice) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-3">
          <section className="account-panel">
            <AccountPanelHeading
              description="Valores finais do checkout, incluindo frete e desconto aplicado."
              kicker="Resumo financeiro"
              title="Totais do pedido"
            />

            <div className="mt-3.5 account-panel-muted">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[0.84rem] text-slate">Subtotal</p>
                <p className="text-[0.84rem] font-semibold text-ink">{formatCurrency(subtotal)}</p>
              </div>
              <div className="account-divider my-2.5" />
              <div className="flex items-center justify-between gap-4">
                <p className="text-[0.84rem] text-slate">Frete</p>
                <p className="text-[0.84rem] font-semibold text-ink">
                  {shippingAmount > 0 ? formatCurrency(shippingAmount) : "Grátis"}
                </p>
              </div>
              <div className="account-divider my-2.5" />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.84rem] text-slate">Desconto</p>
                  {order.coupon ? (
                    <p className="mt-1 text-[0.72rem] uppercase tracking-[0.14em] text-slate">
                      Cupom {order.coupon.code}
                    </p>
                  ) : null}
                </div>
                <p className="text-[0.84rem] font-semibold text-ink">
                  {discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : "Sem desconto"}
                </p>
              </div>
              <div className="account-divider my-2.5" />
              <div className="flex items-center justify-between gap-4">
                <p className="text-[0.92rem] font-semibold text-ink">Total do pedido</p>
                <p className="text-[0.96rem] font-semibold text-ink">{formatCurrency(total)}</p>
              </div>
            </div>
          </section>

          <section className="account-panel">
            <AccountPanelHeading
              description="Endereço, modalidade, status do transporte e leitura logística vinculados a este pedido."
              kicker="Entrega"
              title="Onde o pedido será recebido"
            />

            <div className="mt-3.5 account-panel-muted">
              <div className="space-y-2 text-[0.84rem] leading-6 text-slate">
                <p>
                  <span className="font-semibold text-ink">Destinatário:</span>{" "}
                  {order.address?.recipientName ?? order.customerName}
                </p>
                <p>
                  <span className="font-semibold text-ink">Endereço:</span>{" "}
                  {order.address?.line1 ?? "Não informado"}
                </p>
                <p>
                  <span className="font-semibold text-ink">Cidade:</span>{" "}
                  {order.address?.city ?? "Não informado"} • {order.address?.state ?? "--"}
                </p>
                <p>
                  <span className="font-semibold text-ink">CEP:</span>{" "}
                  {order.address?.postalCode ?? "Não informado"}
                </p>
                {order.address?.line2 ? (
                  <p>
                    <span className="font-semibold text-ink">Complemento:</span>{" "}
                    {order.address.line2}
                  </p>
                ) : null}
                <p>
                  <span className="font-semibold text-ink">Modalidade:</span>{" "}
                  {getShippingMethodLabel(order.shippingMethod)}
                </p>
                <p>
                  <span className="font-semibold text-ink">Status do transporte:</span>{" "}
                  {getShippingStatusLabel(order.shippingStatus)}
                </p>
                {addressPhone ? (
                  <p>
                    <span className="font-semibold text-ink">Contato para entrega:</span>{" "}
                    {addressPhone}
                  </p>
                ) : null}
              </div>

              <div className="account-divider my-3.5" />

              <p className="text-[0.84rem] leading-6 text-slate">{trackingSummary}</p>
            </div>
          </section>

          <section className="account-panel">
            <AccountPanelHeading
              description="Informações de pagamento, atendimento e próxima ação recomendada."
              kicker="Pagamento e suporte"
              title="Informações úteis"
            />

            <div className="mt-3.5 grid gap-2.5">
              <div className="account-panel-muted">
                <div className="space-y-2 text-[0.84rem] leading-6 text-slate">
                  <p>
                    <span className="font-semibold text-ink">Canal:</span>{" "}
                    {getPaymentMethodLabel(order.paymentMethod)}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Status:</span>{" "}
                    {getPaymentStatusLabel(order.paymentStatus)}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Contato:</span> {order.customerEmail}
                  </p>
                </div>

                <div className="account-divider my-3.5" />

                <p className="text-[0.84rem] leading-6 text-slate">{paymentContext}</p>
              </div>

              <div className="account-panel-muted">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                  Próximo passo recomendado
                </p>
                <p className="mt-1.5 text-[0.84rem] leading-5 text-slate">{nextStep}</p>

                <div className="mt-3.5 flex flex-col gap-2">
                  <Link className="button-secondary button-compact justify-center" href={trackingHref}>
                    Abrir rastreio deste pedido
                  </Link>
                  <Link className="button-ghost button-compact justify-center" href="/contato">
                    Falar com a equipe
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AccountShell>
  );
}
