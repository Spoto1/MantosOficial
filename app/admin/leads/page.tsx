import Link from "next/link";
import { LeadStatus, LeadType } from "@prisma/client";

import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getLeadStatusMeta } from "@/lib/admin-format";
import { getLeadOrigins, getLeads } from "@/lib/repositories/leads";
import { LEAD_STATUS_VALUES } from "@/lib/validators";

type AdminLeadsPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: LeadType | "ALL";
    origin?: string;
    status?: LeadStatus | "ALL";
    from?: string;
    to?: string;
  }>;
};

export const dynamic = "force-dynamic";

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function AdminLeadsPage({ searchParams }: AdminLeadsPageProps) {
  const session = await requireAdminAuth("leads");
  const filters = (await searchParams) ?? {};
  const [leads, origins] = await Promise.all([
    getLeads({
      query: filters.q,
      type: filters.type ?? "ALL",
      origin: filters.origin ?? "ALL",
      status: filters.status ?? "ALL",
      dateFrom: parseDate(filters.from),
      dateTo: parseDate(filters.to)
    }),
    getLeadOrigins()
  ]);

  return (
    <AdminShell
      actions={
        <Link className="button-secondary justify-center" href="/admin/newsletter">
          Ver newsletter
        </Link>
      }
      currentPath="/admin/leads"
      description="Visão consolidada de leads vindos de newsletter e contato, com filtros e leitura operacional."
      session={session}
      title="Leads"
    >
      <AdminPanel description="Busque por e-mail, nome, origem, tipo ou período." title="Filtros">
        <form className="grid gap-4 lg:grid-cols-6" method="get">
          <input
            className="field-input lg:col-span-2"
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Buscar lead"
            type="search"
          />
          <select className="field-input" defaultValue={filters.type ?? "ALL"} name="type">
            <option value="ALL">Todos os tipos</option>
            <option value="CONTACT">Contato</option>
            <option value="NEWSLETTER">Newsletter</option>
          </select>
          <select className="field-input" defaultValue={filters.origin ?? "ALL"} name="origin">
            <option value="ALL">Todas as origens</option>
            {origins.map((origin) => (
              <option key={origin} value={origin}>
                {origin}
              </option>
            ))}
          </select>
          <select className="field-input" defaultValue={filters.status ?? "ALL"} name="status">
            <option value="ALL">Todos os status</option>
            {LEAD_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button className="button-primary justify-center" type="submit">
            Aplicar
          </button>
          <input className="field-input" defaultValue={filters.from ?? ""} name="from" type="date" />
          <input className="field-input" defaultValue={filters.to ?? ""} name="to" type="date" />
          <Link className="button-secondary justify-center" href="/admin/leads">
            Limpar
          </Link>
        </form>
      </AdminPanel>

      <AdminPanel
        actions={
          <div className="rounded-full border border-black/10 bg-black/5 px-4 py-2 text-sm text-slate">
            Total filtrado: {leads.length}
          </div>
        }
        description="Cada lead mantém status, contexto e origem da captura."
        title="Listagem"
      >
        <div className="grid gap-4">
          {leads.length > 0 ? (
            leads.map((lead) => {
              const statusMeta = getLeadStatusMeta(lead.status);

              return (
                <article className="rounded-[2rem] border border-black/5 bg-white p-5" key={lead.id}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate">{lead.origin}</p>
                        <AdminStatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                        <AdminStatusBadge
                          label={lead.type === "CONTACT" ? "Contato" : "Newsletter"}
                          tone="neutral"
                        />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-ink">
                          {lead.name || lead.email}
                        </h3>
                        <p className="mt-1 text-sm text-slate">
                          {lead.email}
                          {lead.phone ? ` • ${lead.phone}` : ""}
                        </p>
                      </div>
                      <p className="max-w-3xl text-sm leading-7 text-slate">
                        {lead.context || lead.message || "Sem contexto adicional registrado."}
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-3 xl:items-end">
                      <p className="text-sm text-slate">{lead.createdAt.toLocaleString("pt-BR")}</p>
                      <Link className="button-secondary justify-center" href={`/admin/leads/${lead.id}`}>
                        Ver detalhes
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-black/10 bg-black/5 p-6 text-sm text-slate">
              Nenhum lead corresponde aos filtros atuais.
            </div>
          )}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
