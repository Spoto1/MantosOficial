import Link from "next/link";
import { ContactLeadStatus } from "@prisma/client";

import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { CopyButton } from "@/components/admin/copy-button";
import { updateContactLeadAction } from "@/lib/actions/admin";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getContactStatusMeta } from "@/lib/admin-format";
import { getContactLeads } from "@/lib/repositories/marketing";
import { CONTACT_LEAD_STATUS_VALUES } from "@/lib/validators";

type AdminContactsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: ContactLeadStatus | "ALL";
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

export default async function AdminContactsPage({ searchParams }: AdminContactsPageProps) {
  const session = await requireAdminAuth("contacts");
  const filters = (await searchParams) ?? {};
  const contacts = await getContactLeads({
    query: filters.q,
    status: filters.status ?? "ALL",
    dateFrom: parseDate(filters.from),
    dateTo: parseDate(filters.to)
  });

  return (
    <AdminShell
      currentPath="/admin/contacts"
      description="Mensagens do formulário de contato com status operacional, leitura detalhada e notas internas."
      session={session}
      title="Contatos"
    >
      <AdminPanel description="Busque por nome, e-mail, assunto ou período." title="Filtros">
        <form className="grid gap-4 lg:grid-cols-5" method="get">
          <input
            className="field-input lg:col-span-2"
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Buscar mensagens"
            type="search"
          />
          <select className="field-input" defaultValue={filters.status ?? "ALL"} name="status">
            <option value="ALL">Todos os status</option>
            {CONTACT_LEAD_STATUS_VALUES.map((status) => (
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
          <Link className="button-secondary justify-center" href="/admin/contacts">
            Limpar
          </Link>
        </form>
      </AdminPanel>

      <AdminPanel description="A equipe pode ler, responder e arquivar sem perder o contexto." title="Mensagens">
        <div className="grid gap-4">
          {contacts.length > 0 ? (
            contacts.map((lead) => {
              const statusMeta = getContactStatusMeta(lead.status);

              return (
                <article className="rounded-[2rem] border border-black/5 bg-white p-5" key={lead.id}>
                  <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate">{lead.subject}</p>
                        <AdminStatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold text-ink">{lead.name}</h3>
                      <p className="mt-2 text-sm text-slate">
                        {lead.email}
                        {lead.phone ? ` • ${lead.phone}` : ""}
                      </p>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate">{lead.message}</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link className="button-secondary justify-center" href={`/admin/contacts/${lead.id}`}>
                          Abrir detalhe
                        </Link>
                        <CopyButton label="Copiar e-mail" value={lead.email} />
                        {lead.phone ? (
                          <CopyButton label="Copiar telefone" value={lead.phone} />
                        ) : null}
                      </div>
                    </div>

                    <form action={updateContactLeadAction} className="grid gap-3">
                      <input name="id" type="hidden" value={lead.id} />
                      <select className="field-input" defaultValue={lead.status} name="status">
                        {CONTACT_LEAD_STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <textarea
                        className="field-input min-h-28 resize-y"
                        defaultValue={lead.internalNotes ?? ""}
                        name="internalNotes"
                        placeholder="Observação interna"
                      />
                      <button className="button-primary justify-center" type="submit">
                        Salvar status
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-black/10 bg-black/5 p-6 text-sm text-slate">
              Nenhuma mensagem encontrada para os filtros atuais.
            </div>
          )}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
