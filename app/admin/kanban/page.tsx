import type { Metadata } from "next";
import Link from "next/link";

import { AdminKanbanBoard } from "@/components/admin/admin-kanban-board";
import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { adminCanManageKanban, requireAdminAuth } from "@/lib/auth/admin";
import {
  KANBAN_ARCHIVE_SCOPE_VALUES,
  KANBAN_PRIORITY_VALUES,
  KANBAN_SORT_VALUES,
  KANBAN_STATUS_VALUES,
  KANBAN_TYPE_VALUES,
  getKanbanArchiveScopeLabel,
  getKanbanPriorityMeta,
  getKanbanSortLabel,
  getKanbanStatusMeta,
  getKanbanTypeLabel
} from "@/lib/kanban";
import { getKanbanBoardData } from "@/lib/repositories/kanban";
import { buildMetadata } from "@/lib/seo";

type AdminKanbanPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    type?: string;
    assigneeId?: string;
    sort?: string;
    archiveScope?: string;
    error?: string;
  }>;
};

export const metadata: Metadata = buildMetadata({
  title: "Kanban do admin",
  description: "Board operacional da Mantos Oficial para acompanhar backlog, revisão, bloqueios e entrega.",
  path: "/admin/kanban",
  noIndex: true
});

export const dynamic = "force-dynamic";

export default async function AdminKanbanPage({ searchParams }: AdminKanbanPageProps) {
  const session = await requireAdminAuth("kanban");
  const resolvedSearchParams = (await searchParams) ?? {};
  const canManage = adminCanManageKanban(session);
  const archiveScope =
    resolvedSearchParams.archiveScope &&
    KANBAN_ARCHIVE_SCOPE_VALUES.includes(
      resolvedSearchParams.archiveScope as (typeof KANBAN_ARCHIVE_SCOPE_VALUES)[number]
    )
      ? (resolvedSearchParams.archiveScope as (typeof KANBAN_ARCHIVE_SCOPE_VALUES)[number])
      : "ACTIVE";
  const sort =
    resolvedSearchParams.sort &&
    KANBAN_SORT_VALUES.includes(resolvedSearchParams.sort as (typeof KANBAN_SORT_VALUES)[number])
      ? (resolvedSearchParams.sort as (typeof KANBAN_SORT_VALUES)[number])
      : "manual";
  const board = await getKanbanBoardData({
    query: resolvedSearchParams.q,
    status:
      resolvedSearchParams.status &&
      (resolvedSearchParams.status === "ALL" ||
        KANBAN_STATUS_VALUES.includes(resolvedSearchParams.status as (typeof KANBAN_STATUS_VALUES)[number]))
        ? (resolvedSearchParams.status as (typeof KANBAN_STATUS_VALUES)[number] | "ALL")
        : "ALL",
    priority:
      resolvedSearchParams.priority &&
      (resolvedSearchParams.priority === "ALL" ||
        KANBAN_PRIORITY_VALUES.includes(
          resolvedSearchParams.priority as (typeof KANBAN_PRIORITY_VALUES)[number]
        ))
        ? (resolvedSearchParams.priority as (typeof KANBAN_PRIORITY_VALUES)[number] | "ALL")
        : "ALL",
    type:
      resolvedSearchParams.type &&
      (resolvedSearchParams.type === "ALL" ||
        KANBAN_TYPE_VALUES.includes(resolvedSearchParams.type as (typeof KANBAN_TYPE_VALUES)[number]))
        ? (resolvedSearchParams.type as (typeof KANBAN_TYPE_VALUES)[number] | "ALL")
        : "ALL",
    assigneeId:
      resolvedSearchParams.assigneeId === "ALL" || resolvedSearchParams.assigneeId === "UNASSIGNED"
        ? resolvedSearchParams.assigneeId
        : resolvedSearchParams.assigneeId || "ALL",
    sort,
    archiveScope
  });

  const serializedColumns = Object.fromEntries(
    KANBAN_STATUS_VALUES.map((status) => [
      status,
      board.groupedTasks[status].map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        type: task.type,
        dueDate: task.dueDate?.toISOString() ?? null,
        updatedAt: task.updatedAt.toISOString(),
        archivedAt: task.archivedAt?.toISOString() ?? null,
        isArchived: task.isArchived,
        commentCount: task._count.comments,
        assignee: task.assignee
          ? {
              id: task.assignee.id,
              name: task.assignee.name
            }
          : null,
        checklistItems: task.checklistItems.map((item) => ({
          id: item.id,
          isDone: item.isDone
        }))
      }))
    ])
  ) as Record<(typeof KANBAN_STATUS_VALUES)[number], Array<any>>;

  return (
    <AdminShell
      actions={
        <>
          {canManage ? (
            <Link className="button-primary button-compact justify-center" href="/admin/kanban/new">
              Nova tarefa
            </Link>
          ) : null}
          <Link className="button-secondary button-compact justify-center" href="/admin/kanban">
            Limpar filtros
          </Link>
        </>
      }
      currentPath="/admin/kanban"
      description="Quadro administrativo da reta final, com filtros objetivos, backlog persistido e histórico arquivado para tudo que já saiu do go-live imediato."
      session={session}
      title="Kanban do projeto"
    >
      {resolvedSearchParams.error === "readonly" ? (
        <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sua role atual pode visualizar o board, mas não criar, editar, mover ou arquivar tarefas.
        </div>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          helper={
            board.stats.total > 0
              ? "Quantidade de cards operacionais visíveis no recorte atual."
              : "Nenhuma tarefa operacional real apareceu neste recorte."
          }
          label="Total visível"
          value={board.stats.total}
        />
        <AdminStatCard
          helper={
            board.stats.archivedTotalCount > 0
              ? `${board.stats.archivedTotalCount} tarefa(s) arquivada(s) fora do board principal.`
              : "Nenhum histórico arquivado relevante no momento."
          }
          label="Arquivadas"
          value={board.stats.archivedTotalCount}
        />
        <AdminStatCard
          helper={
            board.stats.total > 0
              ? `${board.stats.completionRate}% do recorte atual já concluído.`
              : "Taxa zerada porque ainda não existe tarefa válida no board."
          }
          label="Concluídas"
          value={board.stats.completedCount}
        />
        <AdminStatCard
          helper={
            board.stats.overdueCount > 0
              ? "Itens ativos com prazo vencido."
              : "Nenhum prazo vencido entre os cards operacionais."
          }
          label="Atrasadas"
          value={board.stats.overdueCount}
        />
        <AdminStatCard
          helper={
            board.stats.criticalCount > 0
              ? "Itens ativos em prioridade crítica."
              : "Nenhum card real marcado como crítico."
          }
          label="Críticas"
          value={board.stats.criticalCount}
        />
      </div>

      <AdminPanel
        description="Combine busca textual, filtros por coluna, prioridade, tipo, responsável, histórico e ordenação sem inflar a leitura do board."
        title="Filtros do board"
      >
        <form className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6" method="get">
          <input
            className="field-input field-input-compact xl:col-span-2 2xl:col-span-2"
            defaultValue={resolvedSearchParams.q ?? ""}
            name="q"
            placeholder="Buscar título, descrição ou checklist"
            type="search"
          />

          <select
            className="field-input field-input-compact"
            defaultValue={resolvedSearchParams.status ?? "ALL"}
            name="status"
          >
            <option value="ALL">Todas as colunas</option>
            {KANBAN_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {getKanbanStatusMeta(status).label}
              </option>
            ))}
          </select>

          <select
            className="field-input field-input-compact"
            defaultValue={resolvedSearchParams.priority ?? "ALL"}
            name="priority"
          >
            <option value="ALL">Todas as prioridades</option>
            {KANBAN_PRIORITY_VALUES.map((priority) => (
              <option key={priority} value={priority}>
                {getKanbanPriorityMeta(priority).label}
              </option>
            ))}
          </select>

          <select
            className="field-input field-input-compact"
            defaultValue={resolvedSearchParams.type ?? "ALL"}
            name="type"
          >
            <option value="ALL">Todos os tipos</option>
            {KANBAN_TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {getKanbanTypeLabel(type)}
              </option>
            ))}
          </select>

          <select
            className="field-input field-input-compact"
            defaultValue={resolvedSearchParams.assigneeId ?? "ALL"}
            name="assigneeId"
          >
            <option value="ALL">Todos os responsáveis</option>
            <option value="UNASSIGNED">Sem responsável</option>
            {board.assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </select>

          <select
            className="field-input field-input-compact"
            defaultValue={resolvedSearchParams.archiveScope ?? "ACTIVE"}
            name="archiveScope"
          >
            {KANBAN_ARCHIVE_SCOPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {getKanbanArchiveScopeLabel(value)}
              </option>
            ))}
          </select>

          <select className="field-input field-input-compact" defaultValue={sort} name="sort">
            {KANBAN_SORT_VALUES.map((sort) => (
              <option key={sort} value={sort}>
                {getKanbanSortLabel(sort)}
              </option>
            ))}
          </select>

          <button
            className="button-primary button-compact justify-center xl:col-span-2 2xl:col-span-2"
            type="submit"
          >
            Aplicar filtros
          </button>
          <div className="rounded-[1rem] border border-black/5 bg-black/[0.03] px-4 py-3 text-[0.82rem] leading-6 text-slate xl:col-span-2 2xl:col-span-4">
            A ordenação manual com drag and drop fica disponível apenas em{" "}
            <strong className="text-ink">Somente ativas</strong> para preservar previsibilidade e
            evitar mover histórico arquivado.
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        description="Cards persistidos no banco, com leitura compacta para notebook e histórico arquivado separado do board ativo."
        title="Board"
      >
        <AdminKanbanBoard
          archiveScope={archiveScope}
          canManage={canManage}
          initialColumns={serializedColumns}
          sort={sort}
        />
      </AdminPanel>
    </AdminShell>
  );
}
