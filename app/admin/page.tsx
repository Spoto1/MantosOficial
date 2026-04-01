import type { Metadata } from "next";
import Link from "next/link";

import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { loginAdminAction } from "@/lib/actions/admin";
import {
  adminHasPermission,
  getAdminSession,
  type AdminPermission
} from "@/lib/auth/admin";
import { getKanbanPriorityMeta, getKanbanStatusMeta } from "@/lib/kanban";
import { getPaymentStatusLabel } from "@/lib/order-status";
import { getAdminDashboardData } from "@/lib/repositories/admin";
import {
  isStripePublishableKeyConfigured,
  isStripeSecretKeyConfigured,
  isStripeWebhookSecretConfigured,
  summarizeStorageDriver
} from "@/lib/runtime-config";
import { buildMetadata } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

type AdminPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export const metadata: Metadata = buildMetadata({
  title: "Painel admin",
  description: "Painel operacional da Mantos Oficial para catálogo, pedidos, campanhas e kanban.",
  path: "/admin",
  noIndex: true
});

export const dynamic = "force-dynamic";

function LoginState({ error }: { error?: string }) {
  return (
    <section className="shell py-16">
      <div className="mx-auto max-w-xl rounded-[2.5rem] border border-black/5 bg-white/90 p-8 shadow-soft sm:p-10">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-3 font-display text-5xl leading-none text-ink">Acesso ao painel.</h1>
        <p className="mt-4 text-base leading-8 text-slate">
          O painel aceita usuários persistidos no banco. O bootstrap por variável de ambiente agora
          fica restrito a ambiente local ou onboarding controlado, e deixa de valer em produção
          assim que existe um admin ativo no banco.
        </p>

        <form action={loginAdminAction} className="mt-8 space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink">E-mail do admin</span>
            <input
              autoComplete="email"
              className="field-input"
              name="email"
              placeholder="seu e-mail administrativo"
              type="email"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink">Senha do admin</span>
            <input
              autoComplete="current-password"
              className="field-input"
              name="password"
              required
              type="password"
            />
          </label>
          <button className="button-primary w-full justify-center" type="submit">
            Entrar no admin
          </button>
          {error === "invalid" ? (
            <p className="text-sm leading-7 text-[#8b342e]">Credenciais inválidas.</p>
          ) : null}
          {error === "forbidden" ? (
            <p className="text-sm leading-7 text-[#8b342e]">
              Sua role atual não tem acesso ao módulo solicitado.
            </p>
          ) : null}
          {error === "rate-limit" ? (
            <p className="text-sm leading-7 text-[#8b342e]">
              Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function formatDashboardDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-black/10 bg-black/[0.02] px-4 py-3 text-[0.9rem] leading-6 text-slate">
      {message}
    </div>
  );
}

function CompactMetricTile({
  label,
  value,
  helper,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClassName = {
    neutral: "border-black/5 bg-black/[0.03]",
    success: "border-emerald-100 bg-emerald-50/80",
    warning: "border-amber-100 bg-amber-50/80"
  } satisfies Record<"neutral" | "success" | "warning", string>;

  return (
    <article className={`rounded-[1rem] border p-3.5 ${toneClassName[tone]}`}>
      <p className="text-[0.63rem] font-semibold uppercase tracking-[0.16em] text-slate">{label}</p>
      <p className="mt-1.5 text-[1.4rem] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[1.48rem]">
        {value}
      </p>
      <p className="mt-1.5 text-[0.76rem] leading-[1.25rem] text-slate">{helper}</p>
    </article>
  );
}

const quickLinkOptions: Array<{ label: string; href: string; permission: AdminPermission }> = [
  { label: "Abrir kanban", href: "/admin/kanban", permission: "kanban" },
  { label: "Criar produto", href: "/admin/products/new", permission: "products" },
  { label: "Criar campanha", href: "/admin/campaigns/new", permission: "campaigns" },
  { label: "Ver leads", href: "/admin/leads", permission: "leads" },
  { label: "Ver newsletter", href: "/admin/newsletter", permission: "newsletter" },
  { label: "Ver contatos", href: "/admin/contacts", permission: "contacts" },
  { label: "Abrir uploads", href: "/admin/uploads", permission: "uploads" }
];

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};

  if (!session) {
    return <LoginState error={resolvedSearchParams.error} />;
  }

  const dashboard = await getAdminDashboardData();
  const quickActions = [
    adminHasPermission(session, "kanban")
      ? { label: "Abrir kanban", href: "/admin/kanban", primary: true }
      : null,
    adminHasPermission(session, "products")
      ? { label: "Criar produto", href: "/admin/products/new", primary: false }
      : null,
    adminHasPermission(session, "campaigns")
      ? { label: "Criar campanha", href: "/admin/campaigns/new", primary: false }
      : null,
    adminHasPermission(session, "uploads")
      ? { label: "Subir banner", href: "/admin/uploads", primary: false }
      : null
  ].filter(Boolean) as Array<{ label: string; href: string; primary: boolean }>;
  const visibleQuickLinks = quickLinkOptions.filter((link) =>
    adminHasPermission(session, link.permission)
  );
  const stripeAccountReady =
    isStripeSecretKeyConfigured() && isStripePublishableKeyConfigured();
  const stripeWebhookReady = isStripeWebhookSecretConfigured();
  const storageDriver = summarizeStorageDriver();
  const externalAdminStorageReady = storageDriver !== "local";

  return (
    <AdminShell
      actions={
        <>
          {quickActions.map((action) => (
            <Link
              className={`${action.primary ? "button-primary" : "button-secondary"} button-compact justify-center`}
              href={action.href}
              key={action.href}
            >
              {action.label}
            </Link>
          ))}
        </>
      }
      currentPath="/admin"
      description="Visão executiva compacta do catálogo, pedidos, campanhas, atividade recente e board operacional com foco no que está realmente em operação."
      session={session}
      title="Dashboard operacional"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard
          helper={`${dashboard.overview.activeProductCount} ativo(s) no catálogo atual.`}
          label="Produtos"
          value={dashboard.overview.productCount}
        />
        <AdminStatCard
          helper={
            dashboard.overview.activeProductCount > 0
              ? "Itens publicados e disponíveis para operação."
              : "Nenhum SKU ativo publicado no momento."
          }
          label="Produtos ativos"
          value={dashboard.overview.activeProductCount}
        />
        <AdminStatCard
          helper={
            dashboard.overview.outOfStockCount > 0
              ? "Itens com estoque zerado pedindo reposição."
              : "Nenhum item zerado no catálogo agora."
          }
          label="Sem estoque"
          value={dashboard.overview.outOfStockCount}
        />
        <AdminStatCard
          helper={
            dashboard.overview.paidOrderCount > 0
              ? "Somente pedidos reais pagos entram nesta leitura."
              : "Nenhum pedido real pago ainda."
          }
          label="Pedidos pagos"
          value={dashboard.overview.paidOrderCount}
        />
        <AdminStatCard
          helper={
            dashboard.overview.activeCampaignCount > 0
              ? "Campanhas operacionais válidas no ar."
              : "Nenhuma campanha operacional ativa."
          }
          label="Campanhas ativas"
          value={dashboard.overview.activeCampaignCount}
        />
        <AdminStatCard
          helper={
            dashboard.kanban.total > 0
              ? `${dashboard.kanban.archivedCount} arquivada(s) fora do board principal.`
              : "Nenhuma tarefa operacional real ativa no board."
          }
          label="Kanban ativo"
          value={dashboard.kanban.total}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(16.75rem,0.92fr)]">
        <AdminPanel
          actions={
            <Link className="button-secondary button-compact justify-center" href="/admin/orders">
              Ver pedidos
            </Link>
          }
          description="Receita, ticket médio e sinais comerciais calculados apenas com pedidos operacionais confirmados."
          title="Resumo comercial"
        >
          <div className="grid gap-2.5 md:grid-cols-3">
            <CompactMetricTile
              helper={
                dashboard.commerce.totalRevenue > 0
                  ? "Receita confirmada em pedidos pagos."
                  : "Sem faturamento real consolidado ainda."
              }
              label="Faturamento"
              tone={dashboard.commerce.totalRevenue > 0 ? "success" : "neutral"}
              value={formatCurrency(dashboard.commerce.totalRevenue)}
            />
            <CompactMetricTile
              helper={
                dashboard.commerce.averageTicket > 0
                  ? "Valor médio por pedido pago."
                  : "O ticket médio aparece após o primeiro pagamento real."
              }
              label="Ticket médio"
              value={formatCurrency(dashboard.commerce.averageTicket)}
            />
            <CompactMetricTile
              helper={
                dashboard.overview.pendingOrderCount > 0
                  ? "Pedidos reais aguardando resolução."
                  : "Nenhum pedido real pendente agora."
              }
              label="Pedidos pendentes"
              tone={dashboard.overview.pendingOrderCount > 0 ? "warning" : "neutral"}
              value={dashboard.overview.pendingOrderCount}
            />
          </div>

          <div className="mt-3.5 grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Pedidos recentes</p>
                <AdminStatusBadge
                  label={String(dashboard.commerce.recentOrders.length)}
                  tone={dashboard.commerce.recentOrders.length > 0 ? "info" : "neutral"}
                />
              </div>
              {dashboard.commerce.recentOrders.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.commerce.recentOrders.map((order) => (
                    <article className="rounded-[0.95rem] border border-black/5 bg-sand/70 p-3" key={order.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate">
                            {order.number}
                          </p>
                          <p className="mt-1 truncate text-[0.86rem] font-semibold text-ink">
                            {order.customerName}
                          </p>
                          <p className="mt-1 text-[0.68rem] leading-5 text-slate">
                            {formatDashboardDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <AdminStatusBadge
                            label={getPaymentStatusLabel(order.paymentStatus)}
                            tone={order.paymentStatus === "PAID" ? "success" : "warning"}
                          />
                          <span className="text-[0.84rem] font-semibold text-ink">
                            {formatCurrency(Number(order.total))}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyHint message="Nenhum pedido real recente ainda." />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Produtos mais vendidos</p>
                <AdminStatusBadge
                  label={String(dashboard.commerce.topSellingProducts.length)}
                  tone={dashboard.commerce.topSellingProducts.length > 0 ? "info" : "neutral"}
                />
              </div>
              {dashboard.commerce.topSellingProducts.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.commerce.topSellingProducts.map((item) => (
                    <article className="rounded-[0.95rem] border border-black/5 bg-white p-3" key={item.productId}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[0.86rem] font-semibold text-ink">
                            {item.productName}
                          </p>
                          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-slate">
                            {item.productSlug}
                          </p>
                        </div>
                        <span className="text-[0.84rem] font-semibold text-ink">{item._sum.quantity ?? 0} un.</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyHint message="Os produtos mais vendidos aparecem depois dos primeiros pedidos reais pagos." />
              )}
            </div>
          </div>
        </AdminPanel>

        <div className="space-y-3.5">
          <AdminPanel
            description="Leitura honesta da reta final do Stripe e da operação do painel, sem inventar prontidão onde ela ainda não existe."
            title="Prontidão operacional"
          >
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              <CompactMetricTile
                helper={
                  stripeAccountReady
                    ? "Chaves pública e secreta da conta final já estão presentes no ambiente."
                    : "A conta Stripe final ainda não está completamente conectada neste ambiente."
                }
                label="Conta Stripe"
                tone={stripeAccountReady ? "success" : "warning"}
                value={stripeAccountReady ? "OK" : "Pendente"}
              />
              <CompactMetricTile
                helper={
                  stripeWebhookReady
                    ? "Segredo do webhook já está configurado para validação assinada."
                    : "O webhook público ainda não está completamente validado neste ambiente."
                }
                label="Webhook"
                tone={stripeWebhookReady ? "success" : "warning"}
                value={stripeWebhookReady ? "OK" : "Pendente"}
              />
              <CompactMetricTile
                helper={
                  externalAdminStorageReady
                    ? "O admin já aponta para storage externo nesta leitura."
                    : "Uploads continuam em storage local; falta fechar o provider externo do admin."
                }
                label="Uploads admin"
                tone={externalAdminStorageReady ? "success" : "warning"}
                value={externalAdminStorageReady ? storageDriver : "Local"}
              />
            </div>
          </AdminPanel>

          <AdminPanel
            actions={
              <Link className="button-secondary button-compact justify-center" href="/admin/kanban">
                Abrir board
              </Link>
            }
            description="Leitura compacta do estado atual do board para acompanhar backlog da reta final, revisão e bloqueios ainda abertos."
            title="Resumo do Kanban"
          >
            <div className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
              <CompactMetricTile
                helper={
                  dashboard.kanban.inProgressCount > 0
                    ? "Cards em execução agora."
                    : "Nenhum card real em andamento."
                }
                label="Em andamento"
                value={dashboard.kanban.inProgressCount}
              />
              <CompactMetricTile
                helper={
                  dashboard.kanban.blockedCount > 0
                    ? "Itens com impedimento ativo."
                    : "Nenhum bloqueio operacional aberto."
                }
                label="Bloqueadas"
                tone={dashboard.kanban.blockedCount > 0 ? "warning" : "neutral"}
                value={dashboard.kanban.blockedCount}
              />
              <CompactMetricTile
                helper={
                  dashboard.kanban.reviewCount > 0
                    ? "Cards aguardando revisão."
                    : "Nada aguardando revisão agora."
                }
                label="Em revisão"
                value={dashboard.kanban.reviewCount}
              />
              <CompactMetricTile
                helper={
                  dashboard.kanban.doneCount > 0
                    ? "Cards concluídos neste recorte."
                    : "Nenhuma entrega real concluída no board."
                }
                label="Concluídas"
                tone={dashboard.kanban.doneCount > 0 ? "success" : "neutral"}
                value={dashboard.kanban.doneCount}
              />
              <CompactMetricTile
                helper={
                  dashboard.kanban.criticalCount > 0
                    ? "Itens críticos pedindo atenção."
                    : "Sem prioridades críticas reais."
                }
                label="Críticas"
                tone={dashboard.kanban.criticalCount > 0 ? "warning" : "neutral"}
                value={dashboard.kanban.criticalCount}
              />
              <CompactMetricTile
                helper={
                  dashboard.kanban.overdueCount > 0
                    ? "Prazos vencidos no board ativo."
                    : "Nenhum prazo vencido no board."
                }
                label="Atrasadas"
                tone={dashboard.kanban.overdueCount > 0 ? "warning" : "neutral"}
                value={dashboard.kanban.overdueCount}
              />
            </div>

            <div className="mt-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Últimas tarefas atualizadas</p>
                <AdminStatusBadge
                  label={String(dashboard.kanban.recentUpdatedTasks.length)}
                  tone={dashboard.kanban.recentUpdatedTasks.length > 0 ? "info" : "neutral"}
                />
              </div>
              {dashboard.kanban.recentUpdatedTasks.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.kanban.recentUpdatedTasks.map((task) => {
                    const statusMeta = getKanbanStatusMeta(task.status);
                    const priorityMeta = getKanbanPriorityMeta(task.priority);

                    return (
                      <Link
                        className="block rounded-[0.95rem] border border-black/5 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-soft"
                        href={`/admin/kanban/${task.id}`}
                        key={task.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[0.86rem] font-semibold text-ink">{task.title}</p>
                            <p className="mt-1 text-[0.68rem] leading-5 text-slate">
                              {task.assignee?.name ?? "Sem responsável"} •{" "}
                              {task.updatedAt.toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <AdminStatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${priorityMeta.chipClassName}`}
                            >
                              {priorityMeta.label}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.58rem] uppercase tracking-[0.12em] text-slate">
                          <span>{task._count.comments} comentário(s)</span>
                          <span>{task._count.checklistItems} item(ns) de checklist</span>
                          {task.dueDate ? <span>Prazo {task.dueDate.toLocaleString("pt-BR")}</span> : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <EmptyHint message="Nenhuma tarefa operacional real foi atualizada recentemente." />
              )}
            </div>
          </AdminPanel>

          <AdminPanel description="Atalhos do dia a dia com footprint menor e navegação direta." title="Ações rápidas">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {visibleQuickLinks.map((action) => (
                <Link
                  className="rounded-[0.9rem] border border-black/5 bg-black/[0.03] px-3 py-2 text-[0.78rem] font-semibold text-ink transition hover:bg-white"
                  href={action.href}
                  key={action.href}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </AdminPanel>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.02fr)_minmax(17rem,0.98fr)]">
        <AdminPanel
          description="Leads, contatos, campanhas, uploads e log recente mostram apenas registros operacionais válidos para acompanhamento do time."
          title="Atividade recente"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Leads capturados</p>
                <AdminStatusBadge
                  label={String(dashboard.activity.recentLeads.length)}
                  tone={dashboard.activity.recentLeads.length > 0 ? "info" : "neutral"}
                />
              </div>
              {dashboard.activity.recentLeads.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.activity.recentLeads.map((lead) => (
                    <div className="rounded-[0.95rem] border border-black/5 bg-black/[0.03] p-3" key={lead.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[0.84rem] font-semibold text-ink">{lead.email}</p>
                          <p className="mt-1 text-[0.68rem] leading-5 text-slate">{lead.origin}</p>
                        </div>
                        <AdminStatusBadge label={lead.status} tone="info" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyHint message="Nenhum lead real capturado ainda." />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Mensagens de contato</p>
                <AdminStatusBadge
                  label={String(dashboard.activity.recentContacts.length)}
                  tone={dashboard.activity.recentContacts.length > 0 ? "info" : "neutral"}
                />
              </div>
              {dashboard.activity.recentContacts.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.activity.recentContacts.map((contact) => (
                    <div className="rounded-[0.95rem] border border-black/5 bg-black/[0.03] p-3" key={contact.id}>
                      <p className="text-[0.84rem] font-semibold text-ink">{contact.name}</p>
                      <p className="mt-1 text-[0.68rem] leading-5 text-slate">{contact.subject}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyHint message="Nenhuma mensagem de contato real por enquanto." />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Campanhas atualizadas</p>
                <AdminStatusBadge
                  label={String(dashboard.activity.recentCampaigns.length)}
                  tone={dashboard.activity.recentCampaigns.length > 0 ? "info" : "neutral"}
                />
              </div>
              {dashboard.activity.recentCampaigns.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.activity.recentCampaigns.map((campaign) => (
                    <div className="rounded-[0.95rem] border border-black/5 bg-black/[0.03] p-3" key={campaign.id}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[0.84rem] font-semibold text-ink">{campaign.internalTitle}</p>
                        <AdminStatusBadge label={campaign.status} tone="neutral" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyHint message="Nenhuma campanha operacional atualizada recentemente." />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Uploads recentes</p>
                <AdminStatusBadge
                  label={String(dashboard.activity.recentUploads.length)}
                  tone={dashboard.activity.recentUploads.length > 0 ? "info" : "neutral"}
                />
              </div>
              {dashboard.activity.recentUploads.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.activity.recentUploads.map((asset) => (
                    <div className="rounded-[0.95rem] border border-black/5 bg-black/[0.03] p-3" key={asset.id}>
                      <p className="text-[0.84rem] font-semibold text-ink">{asset.label}</p>
                      <p className="mt-1 text-[0.68rem] leading-5 text-slate">{asset.originalName}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyHint message="Nenhum upload operacional recente ainda." />
              )}
            </div>
          </div>

          <div className="mt-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">Activity log</p>
              <AdminStatusBadge
                label={String(dashboard.activity.recentActivity.length)}
                tone={dashboard.activity.recentActivity.length > 0 ? "info" : "neutral"}
              />
            </div>
            {dashboard.activity.recentActivity.length > 0 ? (
              <div className="space-y-2">
                {dashboard.activity.recentActivity.map((entry) => (
                  <div className="rounded-[0.95rem] border border-black/5 bg-white p-3" key={entry.id}>
                    <p className="text-[0.82rem] font-semibold leading-5 text-ink">{entry.description}</p>
                    <p className="mt-1 text-[0.58rem] uppercase tracking-[0.14em] text-slate">
                      {entry.type} • {entry.createdAt.toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint message="Nenhum registro operacional real no log recente." />
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          description="Itens que pedem ação manual, com estado neutro quando não existe risco operacional real."
          title="Alertas operacionais"
        >
          <div className="grid gap-2.5 md:grid-cols-2">
            <section className="rounded-[1rem] border border-black/5 bg-black/[0.03] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Produtos com baixo estoque</p>
                <AdminStatusBadge
                  label={String(dashboard.alerts.lowStockProducts.length)}
                  tone={dashboard.alerts.lowStockProducts.length > 0 ? "warning" : "neutral"}
                />
              </div>
              <div className="mt-3 space-y-2">
                {dashboard.alerts.lowStockProducts.length > 0 ? (
                  dashboard.alerts.lowStockProducts.slice(0, 4).map((product) => (
                    <div className="rounded-[0.9rem] border border-black/5 bg-white/80 px-3 py-2.5" key={product.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[0.84rem] font-semibold text-ink">{product.name}</p>
                        <span className="text-[0.74rem] text-slate">{product.stock} un.</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyHint message="Nenhum produto abaixo do limite de atenção." />
                )}
              </div>
            </section>

            <section className="rounded-[1rem] border border-black/5 bg-black/[0.03] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Campanhas expiradas</p>
                <AdminStatusBadge
                  label={String(dashboard.alerts.expiredCampaigns.length)}
                  tone={dashboard.alerts.expiredCampaigns.length > 0 ? "danger" : "neutral"}
                />
              </div>
              <div className="mt-3 space-y-2">
                {dashboard.alerts.expiredCampaigns.length > 0 ? (
                  dashboard.alerts.expiredCampaigns.slice(0, 4).map((campaign) => (
                    <div className="rounded-[0.9rem] border border-black/5 bg-white/80 px-3 py-2.5" key={campaign.id}>
                      <p className="text-[0.84rem] font-semibold text-ink">{campaign.internalTitle}</p>
                      <p className="mt-1 text-[0.74rem] text-slate">{campaign.slug}</p>
                    </div>
                  ))
                ) : (
                  <EmptyHint message="Nenhuma campanha expirada no momento." />
                )}
              </div>
            </section>

            <section className="rounded-[1rem] border border-black/5 bg-black/[0.03] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Campanhas sem imagem</p>
                <AdminStatusBadge
                  label={String(dashboard.alerts.campaignsWithoutImages.length)}
                  tone={dashboard.alerts.campaignsWithoutImages.length > 0 ? "warning" : "neutral"}
                />
              </div>
              <div className="mt-3 space-y-2">
                {dashboard.alerts.campaignsWithoutImages.length > 0 ? (
                  dashboard.alerts.campaignsWithoutImages.slice(0, 4).map((campaign) => (
                    <div className="rounded-[0.9rem] border border-black/5 bg-white/80 px-3 py-2.5" key={campaign.id}>
                      <p className="text-[0.84rem] font-semibold text-ink">{campaign.internalTitle}</p>
                      <p className="mt-1 text-[0.74rem] text-slate">{campaign.placement}</p>
                    </div>
                  ))
                ) : (
                  <EmptyHint message="Nenhuma campanha operacional sem imagem vinculada." />
                )}
              </div>
            </section>

            <section className="rounded-[1rem] border border-black/5 bg-black/[0.03] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Pedidos pendentes antigos</p>
                <AdminStatusBadge
                  label={String(dashboard.alerts.oldPendingOrders.length)}
                  tone={dashboard.alerts.oldPendingOrders.length > 0 ? "danger" : "neutral"}
                />
              </div>
              <div className="mt-3 space-y-2">
                {dashboard.alerts.oldPendingOrders.length > 0 ? (
                  dashboard.alerts.oldPendingOrders.slice(0, 4).map((order) => (
                    <div className="rounded-[0.9rem] border border-black/5 bg-white/80 px-3 py-2.5" key={order.id}>
                      <p className="text-[0.84rem] font-semibold text-ink">{order.number}</p>
                      <p className="mt-1 text-[0.74rem] text-slate">{order.customerName}</p>
                    </div>
                  ))
                ) : (
                  <EmptyHint message="Nenhum pedido real pendente acima do limiar de atenção." />
                )}
              </div>
            </section>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
