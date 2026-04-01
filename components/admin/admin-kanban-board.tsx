"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { reorderKanbanTasksAction } from "@/lib/actions/kanban";
import {
  KANBAN_STATUS_VALUES,
  getKanbanArchiveScopeLabel,
  getKanbanPriorityMeta,
  getKanbanSortLabel,
  getKanbanStatusMeta,
  getKanbanTypeLabel,
  isKanbanTaskOverdue
} from "@/lib/kanban";

type StatusKey = (typeof KANBAN_STATUS_VALUES)[number];

type BoardTask = {
  id: string;
  title: string;
  description: string;
  status: StatusKey;
  priority: string;
  type: string;
  dueDate: string | null;
  updatedAt: string;
  archivedAt: string | null;
  isArchived: boolean;
  commentCount: number;
  assignee: {
    id: string;
    name: string;
  } | null;
  checklistItems: Array<{
    id: string;
    isDone: boolean;
  }>;
};

type BoardColumns = Record<StatusKey, BoardTask[]>;

type AdminKanbanBoardProps = {
  initialColumns: BoardColumns;
  canManage: boolean;
  sort: string;
  archiveScope: "ACTIVE" | "ARCHIVED" | "ALL";
};

type DragState = {
  taskId: string;
  fromStatus: StatusKey;
};

type DropHint = {
  status: StatusKey;
  taskId?: string;
  position: "before" | "after" | "end";
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "sem atualização";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function countChecklistDone(task: BoardTask) {
  const completed = task.checklistItems.filter((item) => item.isDone).length;

  return {
    total: task.checklistItems.length,
    completed
  };
}

function getAssigneeInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function truncateText(value: string, maxLength = 165) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function moveTask(
  columns: BoardColumns,
  dragState: DragState,
  nextStatus: StatusKey,
  targetTaskId?: string,
  position: "before" | "after" | "end" = "end"
) {
  const sourceTasks = columns[dragState.fromStatus];
  const draggedTask = sourceTasks.find((task) => task.id === dragState.taskId);

  if (!draggedTask) {
    return columns;
  }

  const nextColumns = { ...columns };
  const nextSourceTasks = sourceTasks.filter((task) => task.id !== dragState.taskId);
  const nextDestinationTasks =
    dragState.fromStatus === nextStatus
      ? [...nextSourceTasks]
      : [...columns[nextStatus].filter((task) => task.id !== dragState.taskId)];

  let insertIndex = nextDestinationTasks.length;

  if (targetTaskId) {
    const targetIndex = nextDestinationTasks.findIndex((task) => task.id === targetTaskId);

    if (targetIndex >= 0) {
      insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
    }
  }

  nextDestinationTasks.splice(insertIndex, 0, {
    ...draggedTask,
    status: nextStatus
  });

  nextColumns[dragState.fromStatus] =
    dragState.fromStatus === nextStatus ? nextDestinationTasks : nextSourceTasks;
  nextColumns[nextStatus] = nextDestinationTasks;

  return nextColumns;
}

export function AdminKanbanBoard({
  initialColumns,
  canManage,
  sort,
  archiveScope
}: AdminKanbanBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isManualSort = sort === "manual";
  const isArchiveFiltered = archiveScope !== "ACTIVE";
  const isBoardInteractive = canManage && isManualSort && !isArchiveFiltered;
  const totalVisibleTasks = KANBAN_STATUS_VALUES.reduce(
    (total, status) => total + (columns[status]?.length ?? 0),
    0
  );

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const commitColumns = (
    movingTaskId: string,
    nextColumns: BoardColumns,
    nextStatus: StatusKey,
    previousStatus: StatusKey
  ) => {
    setColumns(nextColumns);
    setFeedback(null);

    startTransition(async () => {
      const result = await reorderKanbanTasksAction({
        taskId: movingTaskId,
        status: nextStatus,
        previousStatus,
        orderedIds: nextColumns[nextStatus].map((task) => task.id),
        previousOrderedIds:
          previousStatus !== nextStatus
            ? nextColumns[previousStatus].map((task) => task.id)
            : nextColumns[nextStatus].map((task) => task.id)
      });

      if (!result.ok) {
        setFeedback(result.error ?? "Não foi possível mover a tarefa.");
        router.refresh();
        return;
      }

      router.refresh();
    });
  };

  const handleStatusChange = (task: BoardTask, nextStatus: StatusKey) => {
    if (!isBoardInteractive || task.isArchived) {
      return;
    }

    const nextColumns = moveTask(
      columns,
      {
        taskId: task.id,
        fromStatus: task.status
      },
      nextStatus
    );

    commitColumns(task.id, nextColumns, nextStatus, task.status);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-3 rounded-[1rem] border border-black/5 bg-black/[0.03] px-3 py-2.5 text-[0.76rem] leading-5 text-slate sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p>
            Ordenação atual: <span className="font-semibold text-ink">{getKanbanSortLabel(sort)}</span>
          </p>
          <p>
            Recorte visível:{" "}
            <span className="font-semibold text-ink">{getKanbanArchiveScopeLabel(archiveScope)}</span>
          </p>
        </div>
        <p className="max-w-2xl">
          {canManage
            ? isBoardInteractive
              ? "Arraste cards para reordenar e mover entre colunas."
              : isArchiveFiltered
                ? "Ao visualizar arquivadas, o board entra em modo histórico para evitar mudanças acidentais."
                : "Troca de status segue ativa; drag and drop fica disponível na ordenação manual."
            : "Modo somente leitura para sua role atual."}
        </p>
      </div>

      {feedback ? (
        <div className="rounded-[0.95rem] border border-rose-200 bg-rose-50 px-3 py-2.5 text-[0.84rem] text-rose-800">
          {feedback}
        </div>
      ) : null}

      {totalVisibleTasks === 0 ? (
        <div className="rounded-[1rem] border border-dashed border-black/10 bg-white/75 px-4 py-3.5 text-[0.82rem] leading-6 text-slate">
          Nenhuma tarefa operacional real apareceu com o recorte atual. Quando existir card válido no banco,
          ele será exibido aqui.
        </div>
      ) : null}

      {totalVisibleTasks > 0 ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max snap-x snap-mandatory gap-2.5">
            {KANBAN_STATUS_VALUES.map((status) => {
              const meta = getKanbanStatusMeta(status);
              const tasks = columns[status] ?? [];

              return (
                <section
                  className={`flex min-h-[25rem] w-[14rem] snap-start flex-col rounded-[1.2rem] border border-black/5 bg-gradient-to-b ${meta.accentClassName} p-2.5 shadow-soft sm:w-[14.25rem] xl:w-[14.5rem] 2xl:w-[14.75rem]`}
                  key={status}
                  onDragOver={(event) => {
                    if (!isBoardInteractive) {
                      return;
                    }

                    event.preventDefault();
                    setDropHint({
                      status,
                      position: "end"
                    });
                  }}
                  onDrop={(event) => {
                    if (!isBoardInteractive || !dragState) {
                      return;
                    }

                    event.preventDefault();
                    const hint = dropHint?.status === status ? dropHint : { status, position: "end" as const };
                    const nextColumns = moveTask(columns, dragState, status, hint.taskId, hint.position);

                    commitColumns(dragState.taskId, nextColumns, status, dragState.fromStatus);
                    setDropHint(null);
                    setDragState(null);
                  }}
                >
                  <div className={`rounded-[0.95rem] border border-black/5 ${meta.surfaceClassName} p-2.5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-slate">
                          {meta.shortLabel}
                        </p>
                        <h3 className="mt-1 text-[0.86rem] font-semibold tracking-[-0.02em] text-ink">
                          {meta.label}
                        </h3>
                      </div>
                      <span className="inline-flex size-6 items-center justify-center rounded-full border border-black/10 bg-white text-[0.72rem] font-semibold text-ink">
                        {tasks.length}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex-1 space-y-2 overflow-y-auto pr-0.5">
                    {tasks.length > 0 ? (
                      tasks.map((task) => {
                        const priorityMeta = getKanbanPriorityMeta(task.priority);
                        const checklist = countChecklistDone(task);
                        const overdue =
                          !task.isArchived &&
                          isKanbanTaskOverdue({
                            dueDate: task.dueDate ? new Date(task.dueDate) : null,
                            status: task.status
                          });

                        return (
                          <article
                            className={`rounded-[1.05rem] border p-3 shadow-sm transition ${
                              task.isArchived
                                ? "border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,241,235,0.9))] opacity-85"
                                : task.priority === "CRITICAL"
                                  ? "border-rose-200 bg-white shadow-[0_10px_30px_-20px_rgba(136,19,55,0.4)]"
                                  : "border-black/5 bg-white"
                            } ${
                              dropHint?.status === status && dropHint.taskId === task.id
                                ? "ring-2 ring-ink/15"
                                : "hover:-translate-y-0.5 hover:shadow-soft"
                            } ${isPending ? "opacity-80" : ""}`}
                            draggable={isBoardInteractive && !task.isArchived}
                            key={task.id}
                            onDragEnd={() => {
                              setDragState(null);
                              setDropHint(null);
                            }}
                            onDragStart={() => {
                              if (!isBoardInteractive || task.isArchived) {
                                return;
                              }

                              setDragState({
                                taskId: task.id,
                                fromStatus: status
                              });
                            }}
                            onDragOver={(event) => {
                              if (!isBoardInteractive || !dragState || task.isArchived) {
                                return;
                              }

                              event.preventDefault();
                              const bounds = event.currentTarget.getBoundingClientRect();
                              const position = event.clientY - bounds.top > bounds.height / 2 ? "after" : "before";

                              setDropHint({
                                status,
                                taskId: task.id,
                                position
                              });
                            }}
                            onDrop={(event) => {
                              if (!isBoardInteractive || !dragState || task.isArchived) {
                                return;
                              }

                              event.preventDefault();
                              const bounds = event.currentTarget.getBoundingClientRect();
                              const position = event.clientY - bounds.top > bounds.height / 2 ? "after" : "before";
                              const nextColumns = moveTask(columns, dragState, status, task.id, position);

                              commitColumns(dragState.taskId, nextColumns, status, dragState.fromStatus);
                              setDropHint(null);
                              setDragState(null);
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.14em] ${priorityMeta.chipClassName}`}
                                  >
                                    {priorityMeta.label}
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-ink">
                                    {getKanbanTypeLabel(task.type)}
                                  </span>
                                  {task.isArchived ? (
                                    <span className="inline-flex items-center rounded-full border border-black/15 bg-black/5 px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-slate">
                                      Arquivada
                                    </span>
                                  ) : null}
                                  {overdue ? (
                                    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-rose-700">
                                      Atrasada
                                    </span>
                                  ) : null}
                                </div>
                                <h4 className="text-[0.88rem] font-semibold leading-5 text-ink">{task.title}</h4>
                              </div>

                              {isBoardInteractive && !task.isArchived ? (
                                <span className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-slate">
                                  drag
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 text-[0.78rem] leading-5 text-slate">
                              {truncateText(task.description)}
                            </p>

                            <div className="mt-2.5 grid gap-1.5 rounded-[0.8rem] bg-black/[0.03] p-2 text-[0.56rem] uppercase tracking-[0.12em] text-slate">
                              <div className="flex flex-wrap items-center gap-3">
                                <span>Atualizada {formatDateTime(task.updatedAt)}</span>
                                {task.dueDate ? <span>Prazo {formatDate(task.dueDate)}</span> : null}
                                {task.archivedAt ? <span>Arquivada {formatDate(task.archivedAt)}</span> : null}
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                {task.assignee ? (
                                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[0.62rem] tracking-[0.1em] text-ink">
                                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-black text-[0.52rem] font-semibold text-white">
                                      {getAssigneeInitials(task.assignee.name)}
                                    </span>
                                    {task.assignee.name}
                                  </span>
                                ) : (
                                  <span>Sem responsável</span>
                                )}
                                {checklist.total > 0 ? (
                                  <span>
                                    Checklist {checklist.completed}/{checklist.total}
                                  </span>
                                ) : null}
                                <span>{task.commentCount} comentário(s)</span>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-col gap-2.5">
                              {canManage && !task.isArchived ? (
                                <label className="space-y-1">
                                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate">
                                    Mover para
                                  </span>
                                  <select
                                    className="field-input field-input-compact"
                                    defaultValue={task.status}
                                    disabled={!isBoardInteractive}
                                    onChange={(event) => handleStatusChange(task, event.target.value as StatusKey)}
                                  >
                                    {KANBAN_STATUS_VALUES.map((value) => (
                                      <option key={value} value={value}>
                                        {getKanbanStatusMeta(value).label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : null}

                              <Link
                                className="button-secondary button-compact justify-center"
                                href={`/admin/kanban/${task.id}`}
                              >
                                {task.isArchived ? "Abrir histórico" : "Ver detalhes"}
                              </Link>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <div className="rounded-[0.95rem] border border-dashed border-black/10 bg-white/70 p-3 text-[0.78rem] leading-6 text-slate">
                        {archiveScope === "ARCHIVED"
                          ? "Nenhuma tarefa arquivada nesta coluna."
                          : archiveScope === "ALL"
                            ? "Nenhuma tarefa ativa ou arquivada nesta coluna com o recorte atual."
                            : "Nenhuma tarefa ativa nesta coluna com os filtros atuais."}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
