import Link from "next/link";
import { NewsletterLeadStatus } from "@prisma/client";

import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { updateNewsletterLeadAction } from "@/lib/actions/admin";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getNewsletterStatusMeta } from "@/lib/admin-format";
import { getNewsletterLeads } from "@/lib/repositories/marketing";
import { NEWSLETTER_STATUS_VALUES } from "@/lib/validators";

type AdminNewsletterPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: NewsletterLeadStatus | "ALL";
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

export default async function AdminNewsletterPage({ searchParams }: AdminNewsletterPageProps) {
  const session = await requireAdminAuth("newsletter");
  const filters = (await searchParams) ?? {};
  const leads = await getNewsletterLeads({
    query: filters.q,
    status: filters.status ?? "ALL",
    dateFrom: parseDate(filters.from),
    dateTo: parseDate(filters.to)
  });

  return (
    <AdminShell
      actions={
        <Link className="button-secondary justify-center" href="/admin/leads">
          Abrir leads
        </Link>
      }
      currentPath="/admin/newsletter"
      description="Inscritos da newsletter com busca, filtros e atualização operacional do status."
      session={session}
      title="Newsletter"
    >
      <AdminPanel description="Encontre inscritos por e-mail e período de captura." title="Filtros">
        <form className="grid gap-4 lg:grid-cols-5" method="get">
          <input
            className="field-input lg:col-span-2"
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Buscar por e-mail"
            type="search"
          />
          <select className="field-input" defaultValue={filters.status ?? "ALL"} name="status">
            <option value="ALL">Todos os status</option>
            {NEWSLETTER_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input className="field-input" defaultValue={filters.from ?? ""} name="from" type="date" />
          <input className="field-input" defaultValue={filters.to ?? ""} name="to" type="date" />
          <button className="button-primary justify-center" type="submit">
            Aplicar
          </button>
          <Link className="button-secondary justify-center" href="/admin/newsletter">
            Limpar
          </Link>
        </form>
      </AdminPanel>

      <AdminPanel
        actions={
          <div className="rounded-full border border-black/10 bg-black/5 px-4 py-2 text-sm text-slate">
            Total: {leads.length}
          </div>
        }
        description="Atualize status e notas rápidas sem sair da listagem."
        title="Inscritos"
      >
        <div className="grid gap-4">
          {leads.length > 0 ? (
            leads.map((lead) => {
              const statusMeta = getNewsletterStatusMeta(lead.status);

              return (
                <article className="rounded-[2rem] border border-black/5 bg-white p-5" key={lead.id}>
                  <div className="grid gap-5 xl:grid-cols-[1fr_18rem]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate">{lead.source}</p>
                        <AdminStatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold text-ink">{lead.email}</h3>
                      <p className="mt-2 text-sm text-slate">
                        Capturado em {lead.createdAt.toLocaleString("pt-BR")}
                      </p>
                      {lead.internalNotes ? (
                        <p className="mt-3 text-sm leading-7 text-slate">{lead.internalNotes}</p>
                      ) : null}
                    </div>

                    <form action={updateNewsletterLeadAction} className="grid gap-3">
                      <input name="id" type="hidden" value={lead.id} />
                      <select className="field-input" defaultValue={lead.status} name="status">
                        {NEWSLETTER_STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <textarea
                        className="field-input min-h-24 resize-y"
                        defaultValue={lead.internalNotes ?? ""}
                        name="internalNotes"
                        placeholder="Observação interna"
                      />
                      <button className="button-secondary justify-center" type="submit">
                        Atualizar
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-black/10 bg-black/5 p-6 text-sm text-slate">
              Nenhum inscrito encontrado para os filtros atuais.
            </div>
          )}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
