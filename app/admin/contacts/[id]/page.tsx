import { notFound } from "next/navigation";

import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { CopyButton } from "@/components/admin/copy-button";
import { updateContactLeadAction } from "@/lib/actions/admin";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getContactStatusMeta } from "@/lib/admin-format";
import { getContactLeadById } from "@/lib/repositories/marketing";
import { CONTACT_LEAD_STATUS_VALUES } from "@/lib/validators";

type AdminContactDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminContactDetailPage({ params }: AdminContactDetailPageProps) {
  const session = await requireAdminAuth("contacts");
  const { id } = await params;
  const contact = await getContactLeadById(id);

  if (!contact) {
    notFound();
  }

  const statusMeta = getContactStatusMeta(contact.status);

  return (
    <AdminShell
      currentPath={`/admin/contacts/${contact.id}`}
      description="Leitura detalhada da mensagem recebida e atualização de status para a equipe."
      session={session}
      title={contact.subject}
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <AdminPanel description="Dados de contato e atalhos rápidos." title="Resumo da mensagem">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <AdminStatusBadge label={statusMeta.label} tone={statusMeta.tone} />
            </div>
            <div className="rounded-[1.75rem] bg-black/5 p-5">
              <p className="text-sm text-slate">Nome</p>
              <p className="mt-2 text-xl font-semibold text-ink">{contact.name}</p>
            </div>
            <div className="rounded-[1.75rem] bg-black/5 p-5">
              <p className="text-sm text-slate">E-mail</p>
              <p className="mt-2 text-xl font-semibold text-ink">{contact.email}</p>
              <div className="mt-3">
                <CopyButton label="Copiar e-mail" value={contact.email} />
              </div>
            </div>
            {contact.phone ? (
              <div className="rounded-[1.75rem] bg-black/5 p-5">
                <p className="text-sm text-slate">Telefone</p>
                <p className="mt-2 text-xl font-semibold text-ink">{contact.phone}</p>
                <div className="mt-3">
                  <CopyButton label="Copiar telefone" value={contact.phone} />
                </div>
              </div>
            ) : null}
            <div className="rounded-[1.75rem] bg-black/5 p-5">
              <p className="text-sm text-slate">Recebido em</p>
              <p className="mt-2 text-lg font-semibold text-ink">
                {contact.createdAt.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel description="Status, observações internas e conteúdo da mensagem." title="Triagem">
          <form action={updateContactLeadAction} className="space-y-4">
            <input name="id" type="hidden" value={contact.id} />
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">Status</span>
              <select className="field-input" defaultValue={contact.status} name="status">
                {CONTACT_LEAD_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">Observações internas</span>
              <textarea
                className="field-input min-h-32 resize-y"
                defaultValue={contact.internalNotes ?? ""}
                name="internalNotes"
              />
            </label>
            <button className="button-primary justify-center" type="submit">
              Salvar contato
            </button>
          </form>

          <div className="mt-6 rounded-[1.75rem] bg-black/5 p-5">
            <p className="text-sm font-medium text-ink">Mensagem enviada</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate">{contact.message}</p>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
