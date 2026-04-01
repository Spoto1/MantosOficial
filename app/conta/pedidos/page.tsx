import type { Metadata } from "next";
import Link from "next/link";

import {
  appendLocalValidationContext,
  isLocalValidationContext
} from "@/lib/local-validation";
import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import {
  AccountEmptyPanel,
  AccountMetricCard,
  AccountOrderCard,
  AccountPanelHeading
} from "@/components/account/account-cards";
import { AccountShell } from "@/components/account/account-shell";
import { formatCompactDate, isOrderInProgress } from "@/lib/account";
import { requireCustomerAuth } from "@/lib/auth/customer";
import { getCustomerOrders } from "@/lib/repositories/customers";
import { buildMetadata } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Meus pedidos",
  description: "Lista de pedidos com histórico completo e atalhos de acompanhamento.",
  path: "/conta/pedidos",
  noIndex: true
});

export const dynamic = "force-dynamic";

type AccountOrdersPageProps = {
  searchParams?: Promise<{
    context?: string;
  }>;
};

export default async function AccountOrdersPage({ searchParams }: AccountOrdersPageProps) {
  const resolved = (await searchParams) ?? {};
  const localValidationLookup =
    isLocalCheckoutDemoAllowed() && isLocalValidationContext(resolved.context);
  const dashboardHref = appendLocalValidationContext("/conta", localValidationLookup);
  const ordersHref = appendLocalValidationContext("/conta/pedidos", localValidationLookup);
  const trackingHref = appendLocalValidationContext("/rastreio", localValidationLookup);
  const session = await requireCustomerAuth({
    next: ordersHref
  });
  const orders = await getCustomerOrders(session.customerId, {
    controlledOnly: localValidationLookup
  });
  const activeOrders = orders.filter((order) => isOrderInProgress(order));
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const averageTicket = orders.length > 0 ? totalSpent / orders.length : 0;
  const latestOrder = orders[0];
  const activeOrdersGridClass =
    activeOrders.length > 1 ? "mt-4 grid gap-2.5 lg:grid-cols-2" : "mt-4 grid gap-2.5";

  return (
    <AccountShell
      actions={
        <>
          <Link className="button-secondary button-compact justify-center" href={dashboardHref}>
            Voltar ao dashboard
          </Link>
          <Link className="button-ghost button-compact justify-center" href={trackingHref}>
            Abrir rastreio
          </Link>
        </>
      }
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Minha conta", href: dashboardHref },
        { label: "Pedidos" }
      ]}
      description="Todos os pedidos vinculados à sua conta, organizados para facilitar leitura de pagamento, situação do pedido, transporte e acesso rápido ao detalhe."
      eyebrow="Pedidos da conta"
      preserveLocalValidationContext={localValidationLookup}
      section="orders"
      title="Histórico de pedidos"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <AccountMetricCard
          detail="Pedidos vinculados a esta conta."
          emphasize
          label="Pedidos totais"
          value={String(orders.length)}
        />
        <AccountMetricCard
          detail="Pedidos em confirmação, preparação, expedição ou transporte."
          label="Em andamento"
          value={String(activeOrders.length)}
        />
        <AccountMetricCard
          detail={
            latestOrder
              ? `Última atualização em ${formatCompactDate(latestOrder.createdAt)}.`
              : "Nenhuma movimentação registrada até agora."
          }
          label="Último pedido"
          value={latestOrder?.number ?? "Sem histórico"}
        />
        <AccountMetricCard
          detail={orders.length > 0 ? "Média por pedido registrado na conta." : "Valor aparece após o primeiro pedido."}
          label="Ticket médio"
          value={orders.length > 0 ? formatCurrency(averageTicket) : "R$ 0,00"}
        />
      </div>

      {orders.length === 0 ? (
        <section className="account-panel mt-3">
          <AccountEmptyPanel
            description="Finalize uma compra com esta conta para começar a acompanhar o pós-compra com status, detalhe e atalho de rastreio em um painel mais organizado."
            primaryAction={{ label: "Explorar coleção", href: "/colecao" }}
            secondaryAction={{ label: "Voltar ao dashboard", href: dashboardHref }}
            title="Nenhum pedido encontrado ainda."
          />
        </section>
      ) : (
        <div className="mt-3 grid gap-3">
          <section className="account-panel">
            <AccountPanelHeading
              description="Pedidos ativos aparecem primeiro para reduzir busca manual por pagamento, andamento e detalhe."
              kicker="Acompanhamento"
              title="Pedidos em acompanhamento"
            />

            <div className={activeOrdersGridClass}>
              {activeOrders.length === 0 ? (
                <div className="lg:col-span-2">
                  <AccountEmptyPanel
                    description="No momento não há nenhum pedido em separação, expedição ou transporte. O histórico completo continua disponível logo abaixo."
                    primaryAction={{ label: "Voltar ao dashboard", href: dashboardHref }}
                    secondaryAction={{ label: "Continuar comprando", href: "/colecao" }}
                    title="Tudo em dia nesta conta."
                  />
                </div>
              ) : (
                activeOrders.map((order) => (
                  <AccountOrderCard key={order.id} order={order} showPreview={false} />
                ))
              )}
            </div>
          </section>

          <section className="account-panel">
            <AccountPanelHeading
              description="O histórico completo permanece acessível com destaque para valor, status e abertura rápida do detalhe."
              kicker="Histórico"
              title="Histórico completo"
            />

            <div className="mt-4 grid gap-2.5">
              {orders.map((order) => (
                <AccountOrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        </div>
      )}
    </AccountShell>
  );
}
