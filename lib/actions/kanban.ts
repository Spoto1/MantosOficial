"use server";

import { ActivityEntityType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ZodError } from "zod";

import { adminCanManageKanban, requireAdminAuth } from "@/lib/auth/admin";
import { createActivityLog } from "@/lib/repositories/activity-logs";
import {
  createKanbanTaskComment,
  reorderKanbanTasks,
  saveKanbanTask,
  setKanbanTaskArchivedState,
  toggleKanbanChecklistItem
} from "@/lib/repositories/kanban";
import type { KanbanTaskInput, KanbanTaskReorderInput } from "@/lib/validators";

type KanbanTaskFormField =
  | "title"
  | "description"
  | "status"
  | "priority"
  | "type"
  | "dueDate"
  | "assigneeId"
  | "notes"
  | "checklistItems";

export type KanbanTaskFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<KanbanTaskFormField, string[]>>;
};

function parseOptionalDate(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseBoolean(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "on";
}

function parseChecklistItems(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^\[(x| )\]\s*(.+)$/i);

      return {
        label: (match?.[2] ?? line).trim(),
        isDone: match?.[1]?.toLowerCase() === "x",
        sortOrder: index
      };
    })
    .filter((item) => item.label.length > 0);
}

function buildTaskPayload(formData: FormData): KanbanTaskInput {
  return {
    id: String(formData.get("id") ?? "").trim() || undefined,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? "") as KanbanTaskInput["status"],
    priority: String(formData.get("priority") ?? "") as KanbanTaskInput["priority"],
    type: String(formData.get("type") ?? "") as KanbanTaskInput["type"],
    dueDate: parseOptionalDate(formData.get("dueDate")),
    assigneeId: String(formData.get("assigneeId") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    isArchived: parseBoolean(formData.get("isArchived")),
    checklistItems: parseChecklistItems(formData.get("checklistItems"))
  };
}

function buildFormErrorState(error: unknown): KanbanTaskFormState {
  if (error instanceof ZodError) {
    return {
      status: "error",
      message: "Revise os campos destacados e tente novamente.",
      fieldErrors: error.flatten().fieldErrors as Partial<Record<KanbanTaskFormField, string[]>>
    };
  }

  return {
    status: "error",
    message: error instanceof Error ? error.message : "Não foi possível salvar a tarefa."
  };
}

function buildKanbanTaskRedirect(taskId?: string, params?: Record<string, string>) {
  const search = new URLSearchParams(params);
  const query = search.toString();
  const basePath = taskId ? `/admin/kanban/${taskId}` : "/admin/kanban";

  return query ? `${basePath}?${query}` : basePath;
}

function getTaskActivityDescription(title: string, action: "created" | "updated") {
  return action === "created"
    ? `Tarefa ${title} foi criada no kanban.`
    : `Tarefa ${title} foi atualizada no kanban.`;
}

export async function saveKanbanTaskAction(
  _previousState: KanbanTaskFormState,
  formData: FormData
): Promise<KanbanTaskFormState> {
  const session = await requireAdminAuth("kanban");

  if (!adminCanManageKanban(session)) {
    return {
      status: "error",
      message: "Sua role atual pode visualizar o board, mas não editar tarefas."
    };
  }

  const payload = buildTaskPayload(formData);
  const isUpdate = Boolean(payload.id);

  try {
    const task = await saveKanbanTask(payload, session);

    await createActivityLog({
      type: isUpdate ? "kanban.task.updated" : "kanban.task.created",
      entityType: ActivityEntityType.KANBAN_TASK,
      entityId: task.id,
      actor: session,
      description: getTaskActivityDescription(task.title, isUpdate ? "updated" : "created"),
      metadata: {
        status: task.status,
        priority: task.priority,
        type: task.type,
        isArchived: task.isArchived
      }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/kanban");
    revalidatePath(`/admin/kanban/${task.id}`);
    redirect(buildKanbanTaskRedirect(task.id, { saved: "1" }));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return buildFormErrorState(error);
  }
}

export async function addKanbanTaskCommentAction(formData: FormData) {
  const session = await requireAdminAuth("kanban");
  const taskId = String(formData.get("taskId") ?? "").trim();
  const body = String(formData.get("body") ?? "");

  try {
    const result = await createKanbanTaskComment(
      {
        taskId,
        body
      },
      session
    );

    await createActivityLog({
      type: "kanban.comment.created",
      entityType: ActivityEntityType.KANBAN_TASK,
      entityId: result.task.id,
      actor: session,
      description: `Novo comentário interno registrado na tarefa ${result.task.title}.`,
      metadata: {
        commentId: result.comment.id
      }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/kanban");
    revalidatePath(`/admin/kanban/${result.task.id}`);
    redirect(`${buildKanbanTaskRedirect(result.task.id, { commented: "1" })}#comments`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Não foi possível registrar o comentário.";

    redirect(
      `${buildKanbanTaskRedirect(taskId || undefined, { commentError: message })}#comments`
    );
  }
}

export async function setKanbanTaskArchivedStateAction(formData: FormData) {
  const session = await requireAdminAuth("kanban");

  if (!adminCanManageKanban(session)) {
    redirect("/admin/kanban?error=readonly");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const isArchived = parseBoolean(formData.get("isArchived"));

  try {
    const task = await setKanbanTaskArchivedState(
      {
        taskId,
        isArchived
      },
      session
    );

    await createActivityLog({
      type: isArchived ? "kanban.task.archived" : "kanban.task.restored",
      entityType: ActivityEntityType.KANBAN_TASK,
      entityId: task.id,
      actor: session,
      description: isArchived
        ? `Tarefa ${task.title} foi arquivada no kanban.`
        : `Tarefa ${task.title} voltou para o board principal.`,
      metadata: {
        status: task.status,
        isArchived: task.isArchived
      }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/kanban");
    revalidatePath(`/admin/kanban/${task.id}`);
    redirect(buildKanbanTaskRedirect(task.id, { [isArchived ? "archived" : "restored"]: "1" }));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar o arquivamento.";

    redirect(buildKanbanTaskRedirect(taskId || undefined, { archiveError: message }));
  }
}

export async function reorderKanbanTasksAction(input: KanbanTaskReorderInput) {
  const session = await requireAdminAuth("kanban");

  if (!adminCanManageKanban(session)) {
    return {
      ok: false,
      error: "Sua role atual pode visualizar o board, mas não reordenar tarefas."
    };
  }

  try {
    const task = await reorderKanbanTasks(input, session);

    await createActivityLog({
      type: "kanban.task.moved",
      entityType: ActivityEntityType.KANBAN_TASK,
      entityId: task.id,
      actor: session,
      description: `Tarefa ${task.title} foi movida para ${task.status}.`,
      metadata: {
        status: task.status,
        orderedIds: input.orderedIds,
        previousStatus: input.previousStatus ?? null
      }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/kanban");
    revalidatePath(`/admin/kanban/${task.id}`);

    return {
      ok: true,
      taskId: task.id
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Não foi possível mover a tarefa."
    };
  }
}

export async function toggleKanbanChecklistItemAction(formData: FormData) {
  const session = await requireAdminAuth("kanban");

  if (!adminCanManageKanban(session)) {
    redirect("/admin/kanban?error=readonly");
  }

  const itemId = String(formData.get("itemId") ?? "").trim();
  const isDone = String(formData.get("isDone") ?? "") === "true";
  const result = await toggleKanbanChecklistItem(
    {
      itemId,
      isDone
    },
    session
  );

  await createActivityLog({
    type: "kanban.checklist.updated",
    entityType: ActivityEntityType.KANBAN_TASK,
    entityId: result.task.id,
    actor: session,
    description: `Checklist "${result.checklistItem.label}" da tarefa ${result.task.title} foi ${
      result.checklistItem.isDone ? "marcado como concluído" : "reaberto"
    }.`,
    metadata: {
      checklistItemId: result.checklistItem.id,
      isDone: result.checklistItem.isDone
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/kanban");
  revalidatePath(`/admin/kanban/${result.task.id}`);
}
