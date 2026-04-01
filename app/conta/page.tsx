import type { Metadata } from "next";
import Link from "next/link";

import {
  AccountActionTile,
  AccountEmptyPanel,
  AccountFavoriteCard,
  AccountOrderCard,
  AccountPanelHeading
} from "@/components/account/account-cards";
import { AccountShell } from "@/components/account/account-shell";
import {
  formatCompactDate,
  getCustomerInitials,
  isOrderInProgress
} from "@/lib/account";
import { logoutCustomerAction } from "@/lib/actions/customer";
import { requireCustomerAuth } from "@/lib/auth/customer";
import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import {
  appendLocalValidationContext,
  isLocalValidationContext
} from "@/lib/local-validation";
import { getCustomerOrders } from "@/lib/repositories/customers";
import { getFavoriteProductsByCustomerId } from "@/lib/repositories/storefront";
import { buildMetadata } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Minha conta",
  description: "Área do cliente com pedidos, favoritos e visão geral da conta.",
  path: "/conta",
  noIndex: true
});

export const dynamic = "force-dynamic";

function pluralizeOrders(count: number) {
  return `${count} ${count === 1 ? "pedido" : "pedidos"}`;
}

type AccountPageProps = {
  searchParams?: Promise<{
    context?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const resolved = (await searchParams) ?? {};
  const localValidationLookup =
    isLocalCheckoutDemoAllowed() && isLocalValidationContext(resolved.context);
  const dashboardHref = appendLocalValidationContext("/conta", localValidationLookup);
  const ordersHref = appendLocalValidationContext("/conta/pedidos", localValidationLookup);
  const favoritesHref = appendLocalValidationContext("/favoritos", localValidationLookup);
  const trackingHref = appendLocalValidationContext("/rastreio", localValidationLookup);
  const session = await requireCustomerAuth({
    next: dashboardHref
  });
  const [orders, favorites] = await Promise.all([
    getCustomerOrders(session.customerId, {
      controlledOnly: localValidationLookup
    }),
    getFavoriteProductsByCustomerId(session.customerId)
  ]);

  const firstName = session.customer.firstName || session.customer.name.split(" ")[0] || "Cliente";
  const initials = getCustomerInitials(session.customer.name || firstName);
  const recentOrders = orders.slice(0, 3);
  const inProgressOrders = orders.filter((order) => isOrderInProgress(order));
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const latestOrder = orders[0];

  const overviewTitle =
    inProgressOrders.length > 0
      ? inProgressOrders.length === 1
        ? "1 pedido em acompanhamento agora"
        : `${pluralizeOrders(inProgressOrders.length)} em acompanhamento agora`
      : orders.length > 0
        ? "Histórico organizado para consulta rápida"
        : "Conta pronta para acompanhar sua primeira compra";

  const overviewDescription =
    inProgressOrders.length > 0
      ? "Aqui ficam os pedidos que ainda passam por confirmação de pagamento, preparação ou transporte, com acesso direto ao detalhe e ao rastreio."
      : orders.length > 0
        ? "Seu histórico, seus favoritos e os próximos passos do pós-compra ficam reunidos aqui para consulta rápida."
        : "Quando a primeira compra for concluída, esta área passa a mostrar andamento, histórico e atalhos claros do pós-compra.";

  return (
    <AccountShell
      actions={
        <>
          <Link className="button-secondary button-compact justify-center" href={ordersHref}>
            Ver pedidos
          </Link>
          <Link className="button-accent button-compact justify-center" href={favoritesHref}>
            Abrir favoritos
          </Link>
        </>
      }
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Minha conta" }
      ]}
      description="Sua conta reúne pedidos, favoritos, detalhe da compra e próximos passos em uma leitura mais direta do pós-compra."
      eyebrow="Área do cliente"
      preserveLocalValidationContext={localValidationLookup}
      section="overview"
      title={`Olá, ${firstName}.`}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_19rem]">
        <article className="panel-dark rounded-[1.35rem] p-3.5 sm:p-4">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow !text-white/58">Visão geral</p>
              <h2 className="mt-2 text-[1.28rem] font-semibold leading-tight text-white sm:text-[1.48rem]">
                {overviewTitle}
              </h2>
              <p className="mt-2 text-[0.82rem] leading-5 text-white/72">{overviewDescription}</p>
            </div>

            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] border border-white/12 bg-white/10 text-[0.92rem] font-semibold uppercase tracking-[0.08em] text-white">
              {initials}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-[0.95rem] border border-white/10 bg-white/7 p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Pedidos na conta
              </p>
              <p className="mt-1 text-[0.96rem] font-semibold text-white">{orders.length}</p>
              <p className="mt-1 text-[0.78rem] leading-5 text-white/66">
                {orders.length > 0
                  ? "Seu histórico fica organizado para consulta rápida."
                  : "Ainda não há compras vinculadas a esta conta."}
              </p>
            </div>

            <div className="rounded-[0.95rem] border border-white/10 bg-white/7 p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Em acompanhamento
              </p>
              <p className="mt-1 text-[0.96rem] font-semibold text-white">
                {inProgressOrders.length}
              </p>
              <p className="mt-1 text-[0.78rem] leading-5 text-white/66">
                {inProgressOrders.length > 0
                  ? "Pedidos que ainda passam por pagamento, separação ou entrega."
                  : "Nenhum pedido ativo neste momento."}
              </p>
            </div>

            <div className="rounded-[0.95rem] border border-white/10 bg-white/7 p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                Total em pedidos
              </p>
              <p className="mt-1 text-[0.96rem] font-semibold text-white">
                {orders.length > 0 ? formatCurrency(totalSpent) : "R$ 0,00"}
              </p>
              <p className="mt-1 text-[0.78rem] leading-5 text-white/66">
                {orders.length > 0
                  ? "Soma dos pedidos registrados nesta conta."
                  : "O valor aparece após o primeiro pedido."}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-[0.95rem] border border-white/10 bg-black/10 p-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/50">
              Última movimentação
            </p>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.9rem] font-semibold text-white">
                  {latestOrder ? latestOrder.number : "Nenhum pedido ainda"}
                </p>
                <p className="mt-1 text-[0.78rem] leading-5 text-white/66">
                  {latestOrder
                    ? `Atualizado em ${formatCompactDate(latestOrder.createdAt)}.`
                    : "A conta já está pronta para salvar favoritos e acompanhar a primeira compra."}
                </p>
              </div>
              <span className="rounded-full border border-white/12 px-2.5 py-1 text-[0.54rem] font-semibold uppercase tracking-[0.12em] text-white/74">
                {favorites.length} {favorites.length === 1 ? "favorito salvo" : "favoritos salvos"}
              </span>
            </div>
          </div>
        </article>

        <aside className="grid gap-2.5">
          <section className="account-panel">
            <AccountPanelHeading
              description="Dados principais da conta e acesso rápido ao seu perfil."
              kicker="Perfil"
              title="Seus dados"
            />

            <div className="mt-3.5 grid gap-2.5">
              <div className="account-panel-muted">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[0.8rem] bg-ink text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.84rem] font-semibold text-ink">{session.customer.name}</p>
                    <p className="mt-1 text-[0.78rem] leading-5 text-slate">{session.customer.email}</p>
                    <p className="mt-1 text-[0.78rem] leading-5 text-slate">
                      {session.customer.phone || "Telefone ainda não informado nesta conta."}
                    </p>
                  </div>
                </div>
              </div>

              <AccountActionTile
                description="Volte à coleção com a conta ativa e continue a navegação."
                eyebrow="Coleção"
                href="/colecao"
                title="Continuar comprando"
              />
              <AccountActionTile
                description="Abra atendimento para tirar dúvidas de pedido, tamanho ou disponibilidade."
                eyebrow="Suporte"
                href="/contato"
                title="Falar com a equipe"
              />
            </div>
          </section>

          <div className="rounded-[1rem] border border-black/6 bg-black/[0.03] p-3">
            <p className="text-[0.84rem] font-semibold text-ink">Encerrar sessão com segurança</p>
            <p className="mt-1 text-[0.78rem] leading-5 text-slate">
              Use este botão para sair deste navegador mantendo a conta protegida.
            </p>

            <form action={logoutCustomerAction} className="mt-3.5">
              <input name="next" type="hidden" value="/" />
              <button className="button-secondary button-compact justify-center" type="submit">
                Sair da conta
              </button>
            </form>
          </div>
        </aside>
      </div>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="grid gap-3">
          <section className="account-panel">
            <AccountPanelHeading
              action={
                <Link className="button-secondary button-compact justify-center px-4" href={ordersHref}>
                  Ver todos
                </Link>
              }
              description="Pedidos recentes com valor, status e acesso direto ao detalhe."
              kicker="Pedidos"
              title="Pedidos recentes"
            />

            <div className="mt-3.5 grid gap-2.5">
              {recentOrders.length === 0 ? (
                <AccountEmptyPanel
                  description="Você ainda não tem pedidos vinculados a esta conta. Quando a primeira compra for concluída, esta área passa a mostrar status, total e andamento do pós-compra."
                  primaryAction={{ label: "Explorar coleção", href: "/colecao" }}
                  secondaryAction={{ label: "Salvar produtos", href: favoritesHref }}
                  title="Seu histórico começa aqui."
                />
              ) : (
                recentOrders.map((order) => (
                  <AccountOrderCard key={order.id} order={order} showPreview={false} />
                ))
              )}
            </div>
          </section>

          <section className="account-panel">
            <AccountPanelHeading
              action={
                <Link className="button-ghost button-compact justify-center px-4" href={trackingHref}>
                  Ir para rastreio
                </Link>
              }
              description="Pedidos ativos ficam separados para reduzir a busca por status interno, envio e próximas etapas."
              kicker="Acompanhamento"
              title="Pedidos em andamento"
            />

            <div className="mt-3.5 grid gap-2.5">
              {inProgressOrders.length === 0 ? (
                <AccountEmptyPanel
                  description="Neste momento não há nenhum pedido em separação ou transporte. Quando um novo fluxo começar, ele aparece aqui com prioridade visual."
                  primaryAction={{ label: "Ver pedidos anteriores", href: ordersHref }}
                  secondaryAction={{ label: "Continuar comprando", href: "/colecao" }}
                  title="Nenhum acompanhamento ativo agora."
                />
              ) : (
                inProgressOrders
                  .slice(0, 2)
                  .map((order) => <AccountOrderCard key={order.id} order={order} showPreview={false} />)
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-3">
          <section className="account-panel">
            <AccountPanelHeading
              action={
                <Link className="button-secondary button-compact justify-center px-4" href={favoritesHref}>
                  Ver lista completa
                </Link>
              }
              description="A curadoria salva fica integrada à conta para retomar produtos, voltar ao carrinho e seguir para a compra com mais contexto."
              kicker="Favoritos"
              title="Favoritos da conta"
            />

            <div className="mt-3.5 grid gap-2.5">
              {favorites.length === 0 ? (
                <AccountEmptyPanel
                  description="Salve peças durante a navegação e volte depois com a mesma seleção preservada. A lista fica privada e vinculada à sua conta."
                  primaryAction={{ label: "Salvar novas peças", href: "/colecao" }}
                  secondaryAction={{ label: "Ver minha conta", href: dashboardHref }}
                  title="Sua curadoria ainda está vazia."
                />
              ) : (
                favorites
                  .slice(0, 2)
                  .map((product, index) => (
                    <AccountFavoriteCard key={product.id} priority={index === 0} product={product} />
                  ))
              )}
            </div>
          </section>

          <section className="account-panel">
            <AccountPanelHeading
              description="Atalhos para pedidos, rastreio e nova navegação sem depender de menus espalhados."
              kicker="Próximos passos"
              title="Ações rápidas"
            />

            <div className="mt-3.5 grid gap-2.5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <AccountActionTile
                  description="Abra a lista completa de pedidos para revisar histórico e detalhes."
                  eyebrow="Pedidos"
                  href={ordersHref}
                  title="Ver histórico"
                />
                <AccountActionTile
                  description="Use a consulta por número e e-mail quando precisar compartilhar o acompanhamento."
                  eyebrow="Rastreio"
                  href={trackingHref}
                  title="Consultar andamento"
                />
              </div>
              <AccountActionTile
                description="Retome a coleção em tela cheia para salvar novas peças ou seguir para o checkout."
                eyebrow="Coleção"
                href="/colecao"
                title="Explorar produtos"
              />
            </div>
          </section>
        </div>
      </div>
    </AccountShell>
  );
}
