import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminKanbanTaskForm } from "@/components/admin/admin-kanban-task-form";
import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { getAdminRoleLabel } from "@/lib/admin-format";
import {
  addKanbanTaskCommentAction,
  setKanbanTaskArchivedStateAction,
  toggleKanbanChecklistItemAction
} from "@/lib/actions/kanban";
import { adminCanManageKanban, requireAdminAuth } from "@/lib/auth/admin";
import {
  getKanbanPriorityMeta,
  getKanbanStatusMeta,
  getKanbanTypeLabel,
  isKanbanTaskOverdue
} from "@/lib/kanban";
import {
  getKanbanAssignees,
  getKanbanTaskById,
  type KanbanTaskDetailRecord
} from "@/lib/repositories/kanban";

type AdminKanbanTaskDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    saved?: string;
    commented?: string;
    commentError?: string;
    archived?: string;
    restored?: string;
    archiveError?: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "Não registrado";
  }

  return value.toLocaleString("pt-BR");
}

function resolveCommentAuthor(comment: KanbanTaskDetailRecord["comments"][number]) {
  const name = comment.authorName?.trim() || comment.author?.name?.trim() || "Admin interno";
  const email = comment.authorEmail?.trim() || comment.author?.email?.trim() || null;
  const role = comment.author?.role ? getAdminRoleLabel(comment.author.role) : null;

  return {
    name,
    email,
    role
  };
}

export default async function AdminKanbanTaskDetailPage({
  params,
  searchParams
}: AdminKanbanTaskDetailPageProps) {
  const session = await requireAdminAuth("kanban");
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const [task, assignees] = await Promise.all([getKanbanTaskById(id), getKanbanAssignees()]);

  if (!task) {
    notFound();
  }

  const canManage = adminCanManageKanban(session);
  const canComment = true;
  const statusMeta = getKanbanStatusMeta(task.status);
  const priorityMeta = getKanbanPriorityMeta(task.priority);
  const overdue =
    !task.isArchived &&
    isKanbanTaskOverdue({
      dueDate: task.dueDate,
      status: task.status
    });
  const completedChecklistItems = task.checklistItems.filter((item) => item.isDone).length;
  const checklistProgress =
    task.checklistItems.length > 0
      ? Math.round((completedChecklistItems / task.checklistItems.length) * 100)
      : 0;

  return (
    <AdminShell
      actions={
        <>
          <Link className="button-secondary justify-center" href="/admin/kanban">
            Voltar ao board
          </Link>
          {task.isArchived ? (
            <Link className="button-secondary justify-center" href="/admin/kanban?archiveScope=ARCHIVED">
              Ver arquivadas
            </Link>
          ) : null}
          {canManage ? (
            <Link className="button-primary justify-center" href="/admin/kanban/new">
              Nova tarefa
            </Link>
          ) : null}
        </>
      }
      currentPath={`/admin/kanban/${task.id}`}
      description="Leitura completa da tarefa do roadmap com ownership, comentários internos, checklist, histórico de arquivamento e edição persistida no banco."
      session={session}
      title={task.title}
    >
      <div className="space-y-3">
        {resolvedSearchParams.saved === "1" ? (
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            Tarefa salva com sucesso.
          </div>
        ) : null}
        {resolvedSearchParams.commented === "1" ? (
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            Comentário interno registrado com sucesso.
          </div>
        ) : null}
        {resolvedSearchParams.archived === "1" ? (
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            Tarefa arquivada. Ela sai do board principal, mas o histórico continua preservado.
          </div>
        ) : null}
        {resolvedSearchParams.restored === "1" ? (
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            Tarefa restaurada para o board principal.
          </div>
        ) : null}
        {resolvedSearchParams.commentError ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            {resolvedSearchParams.commentError}
          </div>
        ) : null}
        {resolvedSearchParams.archiveError ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            {resolvedSearchParams.archiveError}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <AdminPanel
            actions={
              canManage ? (
                <form action={setKanbanTaskArchivedStateAction}>
                  <input name="taskId" type="hidden" value={task.id} />
                  <input name="isArchived" type="hidden" value={task.isArchived ? "false" : "true"} />
                  <button className="button-secondary justify-center" type="submit">
                    {task.isArchived ? "Restaurar tarefa" : "Arquivar tarefa"}
                  </button>
                </form>
              ) : null
            }
            description="Status atual, prioridade, ownership, datas principais e estado de arquivamento."
            title="Resumo"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <AdminStatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${priorityMeta.chipClassName}`}
                >
                  {priorityMeta.label}
                </span>
                <AdminStatusBadge label={getKanbanTypeLabel(task.type)} tone="neutral" />
                {task.isArchived ? <AdminStatusBadge label="Arquivada" tone="neutral" /> : null}
                {overdue ? <AdminStatusBadge label="Atrasada" tone="danger" /> : null}
              </div>

              <div className="rounded-[1.75rem] bg-black/5 p-5">
                <p className="text-sm text-slate">Descrição</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink">{task.description}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] bg-black/5 p-5">
                  <p className="text-sm text-slate">Responsável</p>
                  <p className="mt-2 text-lg font-semibold text-ink">
                    {task.assignee?.name ?? "Sem responsável"}
                  </p>
                  {task.assignee ? (
                    <p className="mt-1 text-sm leading-6 text-slate">
                      {getAdminRoleLabel(task.assignee.role)} • {task.assignee.email}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm leading-6 text-slate">
                      A tarefa continua pronta para receber ownership assim que houver definição.
                    </p>
                  )}
                </div>

                <div className="rounded-[1.75rem] bg-black/5 p-5">
                  <p className="text-sm text-slate">Prazo</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{formatDateTime(task.dueDate)}</p>
                </div>

                <div className="rounded-[1.75rem] bg-black/5 p-5">
                  <p className="text-sm text-slate">Criada em</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{formatDateTime(task.createdAt)}</p>
                  <p className="mt-1 text-sm leading-6 text-slate">
                    Por {task.createdBy?.name ?? "sistema"}.
                  </p>
                </div>

                <div className="rounded-[1.75rem] bg-black/5 p-5">
                  <p className="text-sm text-slate">Atualizada em</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{formatDateTime(task.updatedAt)}</p>
                  <p className="mt-1 text-sm leading-6 text-slate">
                    Último responsável: {task.updatedBy?.name ?? "não identificado"}.
                  </p>
                </div>

                <div className="rounded-[1.75rem] bg-black/5 p-5">
                  <p className="text-sm text-slate">Comentários internos</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{task._count.comments}</p>
                  <p className="mt-1 text-sm leading-6 text-slate">
                    Histórico rápido para contexto, decisões e bloqueios.
                  </p>
                </div>

                <div className="rounded-[1.75rem] bg-black/5 p-5">
                  <p className="text-sm text-slate">Arquivamento</p>
                  <p className="mt-2 text-lg font-semibold text-ink">
                    {task.isArchived ? "Fora do board principal" : "Ativa no board"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate">
                    {task.isArchived
                      ? `Arquivada em ${formatDateTime(task.archivedAt)} por ${task.archivedBy?.name ?? "admin interno"}.`
                      : "Sem arquivamento registrado."}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-black/5 p-5">
                <p className="text-sm text-slate">Observações consolidadas</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink">
                  {task.notes || "Sem observações adicionais registradas."}
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel
            description="Comentários internos em ordem cronológica para registrar contexto, decisões rápidas, bloqueios e próximos passos."
            title="Comentários internos"
          >
            <div className="space-y-4" id="comments">
              {canComment ? (
                <form action={addKanbanTaskCommentAction} className="space-y-3 rounded-[1.75rem] bg-black/5 p-5">
                  <input name="taskId" type="hidden" value={task.id} />
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink">Novo comentário</span>
                    <textarea
                      className="field-input min-h-28 resize-y"
                      maxLength={4000}
                      name="body"
                      placeholder="Registre contexto, bloqueios, decisões rápidas ou próximos passos."
                      required
                    />
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm leading-6 text-slate">
                      Comentários são internos do admin e aparecem em ordem cronológica.
                    </p>
                    <button className="button-primary justify-center" type="submit">
                      Adicionar comentário
                    </button>
                  </div>
                </form>
              ) : null}

              {task.comments.length > 0 ? (
                <div className="space-y-3">
                  {task.comments.map((comment) => {
                    const author = resolveCommentAuthor(comment);

                    return (
                      <article className="rounded-[1.6rem] border border-black/5 bg-white p-5 shadow-sm" key={comment.id}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-ink">{author.name}</p>
                            <p className="mt-1 text-sm leading-6 text-slate">
                              {[author.role, author.email].filter(Boolean).join(" • ") || "Admin interno"}
                            </p>
                          </div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate">
                            {formatDateTime(comment.createdAt)}
                          </p>
                        </div>
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink">{comment.body}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/70 p-5 text-sm text-slate">
                  Ainda não existem comentários internos nesta tarefa.
                </div>
              )}
            </div>
          </AdminPanel>

          <AdminPanel
            description="Itens de execução da tarefa. O progresso aparece no board, no detalhe e no resumo do dashboard."
            title="Checklist"
          >
            <div className="mb-4 space-y-3 rounded-[1.5rem] bg-black/5 px-4 py-4 text-sm text-slate">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {task.checklistItems.length > 0
                    ? `${completedChecklistItems} de ${task.checklistItems.length} itens concluídos.`
                    : "Nenhum item de checklist cadastrado."}
                </span>
                <span className="font-semibold text-ink">{checklistProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3">
              {task.checklistItems.length > 0 ? (
                task.checklistItems.map((item) =>
                  canManage ? (
                    <form action={toggleKanbanChecklistItemAction} key={item.id}>
                      <input name="itemId" type="hidden" value={item.id} />
                      <input name="isDone" type="hidden" value={item.isDone ? "false" : "true"} />
                      <button
                        className={`flex w-full items-start gap-3 rounded-[1.5rem] border px-4 py-4 text-left text-sm transition ${
                          item.isDone
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-black/10 bg-white text-ink hover:border-black/20 hover:bg-black/5"
                        }`}
                        type="submit"
                      >
                        <span
                          className={`mt-0.5 inline-flex size-6 items-center justify-center rounded-full border text-xs font-semibold ${
                            item.isDone
                              ? "border-emerald-400 bg-emerald-500 text-white"
                              : "border-black/20 bg-white text-slate"
                          }`}
                        >
                          {item.isDone ? "ok" : ""}
                        </span>
                        <span className={item.isDone ? "line-through" : undefined}>{item.label}</span>
                      </button>
                    </form>
                  ) : (
                    <div
                      className={`flex items-start gap-3 rounded-[1.5rem] border px-4 py-4 text-sm ${
                        item.isDone
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-black/10 bg-white text-ink"
                      }`}
                      key={item.id}
                    >
                      <span
                        className={`mt-0.5 inline-flex size-6 items-center justify-center rounded-full border text-xs font-semibold ${
                          item.isDone
                            ? "border-emerald-400 bg-emerald-500 text-white"
                            : "border-black/20 bg-white text-slate"
                        }`}
                      >
                        {item.isDone ? "ok" : ""}
                      </span>
                      <span className={item.isDone ? "line-through" : undefined}>{item.label}</span>
                    </div>
                  )
                )
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/70 p-5 text-sm text-slate">
                  Adicione itens de checklist na edição desta tarefa quando fizer sentido operacional.
                </div>
              )}
            </div>
          </AdminPanel>
        </div>

        {canManage ? (
          <AdminKanbanTaskForm
            assignees={assignees.map((assignee) => ({
              id: assignee.id,
              name: assignee.name,
              role: assignee.role
            }))}
            task={{
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              type: task.type,
              dueDate: task.dueDate?.toISOString() ?? null,
              assigneeId: task.assigneeId,
              notes: task.notes,
              isArchived: task.isArchived,
              checklistItems: task.checklistItems.map((item) => ({
                label: item.label,
                isDone: item.isDone
              }))
            }}
          />
        ) : (
          <AdminPanel
            description="Sua role atual só visualiza os metadados da tarefa. Comentários internos continuam disponíveis para colaboração diária."
            title="Modo leitura"
          >
            <div className="rounded-[1.75rem] bg-black/5 p-5 text-sm leading-7 text-slate">
              Use o board principal para acompanhar status e prioridades. Se precisar alterar esta
              tarefa, entre com uma role administrativa com permissão de escrita.
            </div>
          </AdminPanel>
        )}
      </div>
    </AdminShell>
  );
}
