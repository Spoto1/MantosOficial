import Link from "next/link";
import { CampaignPlacement, CampaignStatus, CampaignType } from "@prisma/client";

import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getCampaignStatusMeta } from "@/lib/admin-format";
import {
  getAdminCampaigns,
  resolveCampaignLifecycle
} from "@/lib/repositories/campaigns";
import {
  CAMPAIGN_PLACEMENT_VALUES,
  CAMPAIGN_STATUS_VALUES,
  CAMPAIGN_TYPE_VALUES
} from "@/lib/validators";

type AdminCampaignsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: CampaignStatus | "ALL";
    type?: CampaignType | "ALL";
    placement?: CampaignPlacement | "ALL";
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage({ searchParams }: AdminCampaignsPageProps) {
  const session = await requireAdminAuth("campaigns");
  const filters = (await searchParams) ?? {};
  const campaigns = await getAdminCampaigns({
    query: filters.q,
    status: filters.status ?? "ALL",
    type: filters.type ?? "ALL",
    placement: filters.placement ?? "ALL"
  });

  return (
    <AdminShell
      actions={
        <>
          <Link className="button-primary button-compact justify-center" href="/admin/campaigns/new">
            Nova campanha
          </Link>
          <Link className="button-secondary button-compact justify-center" href="/admin/uploads">
            Ver uploads
          </Link>
        </>
      }
      currentPath="/admin/campaigns"
      description="Gerencie campanhas operacionais sem editar código, com a listagem focada no que está pronto para publicação."
      session={session}
      title="Campanhas"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard
          helper={
            campaigns.length > 0
              ? "Campanhas reais disponíveis neste recorte."
              : "Nenhuma campanha operacional encontrada neste recorte."
          }
          label="Visíveis"
          value={campaigns.length}
        />
        <AdminStatCard
          helper="A listagem mostra somente campanhas relevantes para a operação atual."
          label="Leitura"
          value="Real"
        />
        <AdminStatCard
          helper="Use uploads reais para aprovar o módulo antes do go-live."
          label="Foco"
          value="Ops"
        />
      </div>

      <AdminPanel description="Filtre por status, tipo, local de exibição ou texto sem inflar a listagem." title="Filtros">
        <form className="grid gap-2.5 lg:grid-cols-5" method="get">
          <input
            className="field-input field-input-compact lg:col-span-2"
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Buscar campanha"
            type="search"
          />
          <select className="field-input field-input-compact" defaultValue={filters.status ?? "ALL"} name="status">
            <option value="ALL">Todos os status</option>
            {CAMPAIGN_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="field-input field-input-compact" defaultValue={filters.type ?? "ALL"} name="type">
            <option value="ALL">Todos os tipos</option>
            {CAMPAIGN_TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select className="field-input field-input-compact" defaultValue={filters.placement ?? "ALL"} name="placement">
            <option value="ALL">Todos os locais</option>
            {CAMPAIGN_PLACEMENT_VALUES.map((placement) => (
              <option key={placement} value={placement}>
                {placement}
              </option>
            ))}
          </select>
          <button className="button-primary button-compact justify-center" type="submit">
            Aplicar
          </button>
          <Link className="button-secondary button-compact justify-center" href="/admin/campaigns">
            Limpar
          </Link>
        </form>
      </AdminPanel>

      <AdminPanel description="Campanhas coexistem por prioridade, posição e janela de exibição, sempre focadas no que ainda é operacional." title="Listagem">
        <div className="grid gap-4">
          {campaigns.length > 0 ? (
            campaigns.map((campaign) => {
              const statusMeta = getCampaignStatusMeta(campaign.status);
              const lifecycle = resolveCampaignLifecycle(campaign);

              return (
                <article className="rounded-[1.35rem] border border-black/5 bg-white p-4" key={campaign.id}>
                  <div className="grid gap-4 xl:grid-cols-[1fr_15rem]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate">{campaign.placement}</p>
                        <AdminStatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                        <AdminStatusBadge label={lifecycle} tone="neutral" />
                        {campaign.isPrimary ? <AdminStatusBadge label="Principal" tone="info" /> : null}
                      </div>
                      <h3 className="mt-2 text-[1.02rem] font-semibold text-ink">{campaign.internalTitle}</h3>
                      <p className="mt-2 text-[0.82rem] leading-6 text-slate">
                        {campaign.description || "Sem descrição operacional registrada."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-[0.76rem] text-slate">
                        <span>Tipo: {campaign.type}</span>
                        <span>Prioridade: {campaign.priority}</span>
                        <span>Posição: {campaign.position}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Link className="button-primary button-compact justify-center" href={`/admin/campaigns/${campaign.id}`}>
                        Editar campanha
                      </Link>
                      <div className="rounded-[1rem] bg-black/5 p-3 text-[0.76rem] leading-6 text-slate">
                        <p>Desktop: {campaign.desktopImageUrl ? "ok" : "pendente"}</p>
                        <p>Mobile: {campaign.mobileImageUrl ? "ok" : "pendente"}</p>
                        <p>
                          Agenda:{" "}
                          {campaign.startsAt
                            ? `${campaign.startsAt.toLocaleDateString("pt-BR")} → ${
                                campaign.endsAt?.toLocaleDateString("pt-BR") ?? "aberta"
                              }`
                            : "sempre ativa"}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-black/10 bg-black/5 p-6 text-sm text-slate">
              Nenhuma campanha operacional corresponde aos filtros atuais.
            </div>
          )}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
