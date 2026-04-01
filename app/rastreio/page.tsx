import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import {
  AccountProgressSteps,
  AccountStatusTag
} from "@/components/account/account-cards";
import { EmptyState } from "@/components/empty-state";
import { PageIntro } from "@/components/page-intro";
import {
  formatCompactDateTime,
  getOrderJourneySummary,
  getOrderPaymentSummary,
  getOrderProgressSteps,
  getOrderTrackingSummary
} from "@/lib/account";
import { getCustomerSession } from "@/lib/auth/customer";
import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import {
  appendLocalValidationContext,
  isLocalValidationContext
} from "@/lib/local-validation";
import {
  getOrderStatusLabel,
  getPaymentStatusLabel,
  getShippingStatusLabel
} from "@/lib/order-status";
import { TRACKING_RATE_LIMIT } from "@/lib/rate-limit-policies";
import {
  buildRateLimitIdentifier,
  consumeRateLimit,
  getRequestIp
} from "@/lib/rate-limit";
import { getTrackableOrder } from "@/lib/repositories/orders";
import { buildMetadata, siteName } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Rastrear pedido",
  description:
    `Consulte o andamento do seu pedido na ${siteName} com número e e-mail em uma interface clara de acompanhamento.`,
  path: "/rastreio",
  noIndex: true
});

type TrackingPageProps = {
  searchParams?: Promise<{
    pedido?: string;
    email?: string;
    context?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function TrackingPage({ searchParams }: TrackingPageProps) {
  const resolved = (await searchParams) ?? {};
  const customerSession = await getCustomerSession();
  const orderNumber = String(resolved.pedido ?? "").trim();
  const email = String(resolved.email ?? "").trim();
  const localValidationLookup =
    isLocalCheckoutDemoAllowed() && isLocalValidationContext(resolved.context);
  const hasLookup = Boolean(orderNumber || email);
  const requestHeaders = await headers();
  const trackingGate =
    orderNumber && email
      ? await consumeRateLimit({
          policy: TRACKING_RATE_LIMIT,
          identifier: buildRateLimitIdentifier([getRequestIp(requestHeaders), orderNumber, email])
        })
      : null;
  const trackingBlocked = Boolean(trackingGate && !trackingGate.allowed);
  const order =
    orderNumber && email && !trackingBlocked
      ? await getTrackableOrder({
          orderNumber,
          email,
          controlledOnly: localValidationLookup
        })
      : null;
  const journeySummary = order ? getOrderJourneySummary(order) : null;
  const paymentSummary = order ? getOrderPaymentSummary(order) : null;
  const trackingSummary = order ? getOrderTrackingSummary(order) : null;
  const progressSteps = order ? getOrderProgressSteps(order) : [];
  const ordersHref = appendLocalValidationContext("/conta/pedidos", localValidationLookup);
  const accountHistoryHref = customerSession
    ? ordersHref
    : `/entrar?next=${encodeURIComponent(ordersHref)}`;
  const accountHistoryLabel = customerSession ? "Ver pedidos na conta" : "Entrar para ver pedidos";

  return (
    <section className="shell py-6 lg:py-7">
      <PageIntro
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Rastreio" }
        ]}
        description="Informe o número do pedido e o e-mail usado na compra. Primeiro mostramos a situação do pedido e do pagamento; quando a expedição começar, a movimentação de transporte passa a aparecer com prioridade."
        eyebrow="Rastreio"
        title="Acompanhe seu pedido com leitura clara do pós-compra."
      />

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(16rem,0.58fr)_minmax(0,1.42fr)]">
        <aside className="panel rounded-[1.7rem] p-4 sm:p-5 xl:sticky xl:top-24">
          <h2 className="text-[1.02rem] font-semibold text-ink">Consultar pedido</h2>
          <form className="mt-4 grid gap-3" method="get">
            {localValidationLookup ? (
              <input name="context" type="hidden" value={resolved.context} />
            ) : null}
            <label className="space-y-2">
              <span className="text-[0.84rem] font-medium text-ink">Número do pedido</span>
              <input
                autoComplete="off"
                className="field-input"
                defaultValue={orderNumber}
                name="pedido"
                placeholder="MNT-1234ABCD"
              />
            </label>
            <label className="space-y-2">
              <span className="text-[0.84rem] font-medium text-ink">E-mail do comprador</span>
              <input
                autoComplete="email"
                className="field-input"
                defaultValue={email}
                name="email"
                placeholder="voce@dominio.com"
                type="email"
              />
            </label>
            <button className="button-primary justify-center" type="submit">
              Consultar andamento
            </button>
          </form>

          {localValidationLookup ? (
            <div className="mt-4 rounded-[1.1rem] border border-amber-200 bg-amber-50 p-3.5 text-[0.82rem] leading-6 text-amber-950">
              Consulta interna local ativa. Este modo só procura pedidos controlados e não se
              mistura ao rastreio público da conta.
            </div>
          ) : null}

          <div className="mt-4 rounded-[1.1rem] bg-black/5 p-3.5 text-[0.82rem] leading-6 text-slate">
            <p className="font-medium text-ink">Como ler este acompanhamento</p>
            <p className="mt-1.5">
              Status do pedido mostra pagamento, preparação e conferência. Transporte só aparece
              quando a expedição realmente começa.
            </p>
          </div>

          <div className="mt-3 rounded-[1.1rem] bg-black/5 p-3.5 text-[0.82rem] leading-6 text-slate">
            <p className="font-medium text-ink">Quando falar com a equipe</p>
            <p className="mt-1.5">
              Se não encontrar o pedido ou se o andamento parecer parado por muito tempo, abra o
              contato informando o número da compra.
            </p>
          </div>

          <div className="mt-3 rounded-[1.1rem] bg-black/5 p-3.5 text-[0.82rem] leading-6 text-slate">
            <p className="font-medium text-ink">Conta e histórico</p>
            <p className="mt-1.5">
              {customerSession
                ? "Sua conta já está ativa neste navegador. O mesmo pedido também fica disponível no histórico com detalhe completo, totais e próximos passos."
                : "Se você já tem acesso à área do cliente, o mesmo pedido também fica disponível no histórico com detalhe completo, totais e próximos passos."}
            </p>
          </div>
        </aside>

        <div>
          {trackingBlocked ? (
            <div className="panel rounded-[1.6rem] p-5 text-[0.84rem] leading-6 text-[#8b342e]">
              Muitas consultas foram feitas em sequência para esta combinação de dados. Aguarde
              alguns minutos antes de tentar novamente.
            </div>
          ) : !hasLookup ? (
            <EmptyState
              eyebrow="Rastreio"
              description="Use o número do pedido e o e-mail da compra para consultar o andamento. Se o pagamento ainda estiver em análise ou a expedição não tiver começado, isso aparece de forma clara nesta página."
              primaryAction={{ label: accountHistoryLabel, href: accountHistoryHref }}
              secondaryAction={{ label: "Falar com o suporte", href: "/contato" }}
              title="Nenhuma consulta foi feita ainda."
            />
          ) : !order ? (
            <EmptyState
              eyebrow="Rastreio"
              description="Nenhum pedido foi localizado com essa combinação de número e e-mail. Revise os dados informados ou fale com a equipe para confirmar os detalhes."
              primaryAction={{
                label: "Tentar novamente",
                href: localValidationLookup ? `/rastreio?context=${resolved.context}` : "/rastreio"
              }}
              secondaryAction={{
                label: customerSession ? "Ver pedidos na conta" : "Abrir contato",
                href: customerSession ? ordersHref : "/contato"
              }}
              title="Não localizamos esse pedido."
            />
          ) : (
            <div className="grid gap-4">
              <article className="panel rounded-[1.7rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="eyebrow">Pedido localizado</p>
                    <h2 className="mt-2.5 text-[1.5rem] font-semibold text-ink sm:text-[1.8rem]">
                      {order.number}
                    </h2>
                    <p className="mt-1.5 text-[0.84rem] leading-5 text-slate">
                      {order.customerName} • {order.customerEmail}
                    </p>
                    <p className="mt-1 text-[0.84rem] leading-5 text-slate">
                      Pedido feito em {formatCompactDateTime(order.createdAt)}
                    </p>
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

                <div className="mt-4 grid gap-2.5 md:grid-cols-3">
                  <div className="rounded-[1.1rem] border border-black/6 bg-black/[0.03] p-3.5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                      Situação do pedido
                    </p>
                    <p className="mt-2 text-[0.84rem] leading-6 text-slate">{journeySummary}</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-black/6 bg-black/[0.03] p-3.5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                      Pagamento
                    </p>
                    <p className="mt-2 text-[0.84rem] leading-6 text-slate">{paymentSummary}</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-black/6 bg-black/[0.03] p-3.5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                      Transporte
                    </p>
                    <p className="mt-2 text-[0.84rem] leading-6 text-slate">{trackingSummary}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2.5 md:grid-cols-3">
                  <div className="metric-card">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-slate">Total</p>
                    <p className="mt-2 text-[1.18rem] font-semibold text-ink">
                      {formatCurrency(Number(order.total))}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-slate">
                      Pagamento
                    </p>
                    <p className="mt-2 text-[0.84rem] font-semibold text-ink">
                      {getPaymentStatusLabel(order.paymentStatus)}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-slate">
                      Transporte
                    </p>
                    <p className="mt-2 text-[0.84rem] font-semibold text-ink">
                      {getShippingStatusLabel(order.shippingStatus)}
                    </p>
                  </div>
                </div>
              </article>

              <article className="panel rounded-[1.7rem] p-4 sm:p-5">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                  Linha do pedido
                </p>
                <div className="mt-4">
                  <AccountProgressSteps steps={progressSteps} />
                </div>
              </article>

              <div className="grid gap-4 lg:grid-cols-[1.04fr_0.96fr]">
                <article className="panel rounded-[1.7rem] p-4">
                  <p className="text-[0.62rem] uppercase tracking-[0.16em] text-slate">
                    Itens do pedido
                  </p>
                  <div className="mt-3.5 grid gap-2.5">
                    {order.items.map((item) => (
                      <div className="metric-card" key={item.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[0.88rem] font-semibold text-ink">{item.productName}</p>
                            <p className="mt-1 text-[0.82rem] leading-5 text-slate">
                              {item.colorName} • {item.sizeLabel} • {item.quantity}{" "}
                              {item.quantity === 1 ? "unidade" : "unidades"}
                            </p>
                          </div>
                          <p className="text-[0.84rem] font-semibold text-ink">
                            {formatCurrency(Number(item.unitPrice) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel-dark rounded-[1.7rem] p-4">
                  <p className="eyebrow !text-white/55">Resumo de entrega</p>
                  <div className="mt-3.5 space-y-2.5 text-[0.84rem] leading-6 text-white/72">
                    <p>
                      <span className="font-semibold text-white">Destinatário:</span>{" "}
                      {order.address?.recipientName ?? order.customerName}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Endereço:</span>{" "}
                      {order.address?.line1 ?? "Não informado"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Cidade:</span>{" "}
                      {order.address?.city ?? "Não informado"} • {order.address?.state ?? "--"}
                    </p>
                    <p>
                      Se precisar de apoio, fale com a equipe informando o número{" "}
                      <span className="font-semibold text-white">{order.number}</span>.
                    </p>
                  </div>
                </article>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link className="button-ghost justify-center" href={accountHistoryHref}>
              {customerSession ? "Ver histórico na conta" : "Entrar para ver histórico"}
            </Link>
            <Link className="button-secondary justify-center" href="/contato">
              Falar com o suporte
            </Link>
            <Link className="button-ghost justify-center" href="/trocas">
              Política de trocas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
