import { notFound } from "next/navigation";

import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { updateLeadAction } from "@/lib/actions/admin";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getLeadStatusMeta } from "@/lib/admin-format";
import { getLeadById } from "@/lib/repositories/leads";
import { LEAD_STATUS_VALUES } from "@/lib/validators";

type AdminLeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminLeadDetailPage({ params }: AdminLeadDetailPageProps) {
  const session = await requireAdminAuth("leads");
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  const statusMeta = getLeadStatusMeta(lead.status);

  return (
    <AdminShell
      currentPath={`/admin/leads/${lead.id}`}
      description="Acompanhe contexto, origem e notas internas do lead."
      session={session}
      title={lead.name || lead.email}
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel description="Dados principais da captação." title="Resumo">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <AdminStatusBadge label={statusMeta.label} tone={statusMeta.tone} />
              <AdminStatusBadge
                label={lead.type === "CONTACT" ? "Contato" : "Newsletter"}
                tone="neutral"
              />
            </div>
            <div className="rounded-[1.75rem] bg-black/5 p-5">
              <p className="text-sm text-slate">E-mail</p>
              <p className="mt-2 text-lg font-semibold text-ink">{lead.email}</p>
            </div>
            {lead.phone ? (
              <div className="rounded-[1.75rem] bg-black/5 p-5">
                <p className="text-sm text-slate">Telefone</p>
                <p className="mt-2 text-lg font-semibold text-ink">{lead.phone}</p>
              </div>
            ) : null}
            <div className="rounded-[1.75rem] bg-black/5 p-5">
              <p className="text-sm text-slate">Origem</p>
              <p className="mt-2 text-lg font-semibold text-ink">{lead.origin}</p>
              <p className="mt-2 text-sm leading-7 text-slate">{lead.source}</p>
            </div>
            <div className="rounded-[1.75rem] bg-black/5 p-5">
              <p className="text-sm text-slate">Capturado em</p>
              <p className="mt-2 text-lg font-semibold text-ink">
                {lead.createdAt.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel description="Atualize o andamento comercial e registre notas internas." title="Qualificação">
          <form action={updateLeadAction} className="space-y-4">
            <input name="id" type="hidden" value={lead.id} />
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">Status do lead</span>
              <select className="field-input" defaultValue={lead.status} name="status">
                {LEAD_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">Observações internas</span>
              <textarea
                className="field-input min-h-40 resize-y"
                defaultValue={lead.internalNotes ?? ""}
                name="internalNotes"
              />
            </label>
            <button className="button-primary justify-center" type="submit">
              Salvar lead
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="rounded-[1.75rem] bg-black/5 p-5">
              <p className="text-sm font-medium text-ink">Contexto</p>
              <p className="mt-3 text-sm leading-7 text-slate">
                {lead.context || "Sem contexto adicional registrado."}
              </p>
            </div>
            {lead.message ? (
              <div className="rounded-[1.75rem] bg-black/5 p-5">
                <p className="text-sm font-medium text-ink">Mensagem</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate">{lead.message}</p>
              </div>
            ) : null}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
