import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getActivityLogs } from "@/lib/repositories/activity-logs";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const session = await requireAdminAuth("logs");
  const logs = await getActivityLogs();

  return (
    <AdminShell
      currentPath="/admin/logs"
      description="Rastro administrativo simples com eventos relevantes do painel."
      session={session}
      title="Registro de atividade"
    >
      <AdminPanel description="Produtos, campanhas, leads, contatos, uploads e sessões administrativas." title="Eventos recentes">
        <div className="grid gap-4">
          {logs.length > 0 ? (
            logs.map((log) => (
              <article className="rounded-[2rem] border border-black/5 bg-white p-5" key={log.id}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <AdminStatusBadge label={log.entityType} tone="neutral" />
                      <p className="text-xs uppercase tracking-[0.18em] text-slate">{log.type}</p>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-ink">{log.description}</p>
                    <p className="mt-2 text-sm text-slate">
                      {log.actorName || log.actorEmail || "Sistema"} •{" "}
                      {log.createdAt.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[2rem] border border-dashed border-black/10 bg-black/5 p-6 text-sm text-slate">
              Nenhum evento registrado ainda.
            </div>
          )}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
