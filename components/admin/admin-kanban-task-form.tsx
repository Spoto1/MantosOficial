"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { getAdminRoleLabel } from "@/lib/admin-format";
import { saveKanbanTaskAction, type KanbanTaskFormState } from "@/lib/actions/kanban";
import {
  KANBAN_PRIORITY_VALUES,
  KANBAN_STATUS_VALUES,
  KANBAN_TYPE_VALUES,
  getKanbanPriorityMeta,
  getKanbanStatusMeta,
  getKanbanTypeLabel
} from "@/lib/kanban";

type AdminKanbanTaskFormProps = {
  task?: {
    id: string;
    title: string;
    description: string;
    status: (typeof KANBAN_STATUS_VALUES)[number];
    priority: (typeof KANBAN_PRIORITY_VALUES)[number];
    type: (typeof KANBAN_TYPE_VALUES)[number];
    dueDate: string | null;
    assigneeId: string | null;
    notes: string | null;
    isArchived: boolean;
    checklistItems: Array<{
      label: string;
      isDone: boolean;
    }>;
  } | null;
  assignees: Array<{
    id: string;
    name: string;
    role: string;
  }>;
};

const INITIAL_KANBAN_TASK_FORM_STATE: KanbanTaskFormState = {
  status: "idle"
};

function formatDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function checklistItemsToText(
  checklistItems: Array<{
    label: string;
    isDone: boolean;
  }>
) {
  return checklistItems
    .map((item) => `[${item.isDone ? "x" : " "}] ${item.label}`)
    .join("\n");
}

function FieldError({
  state,
  field
}: {
  state: KanbanTaskFormState;
  field: keyof NonNullable<KanbanTaskFormState["fieldErrors"]>;
}) {
  const message = state.fieldErrors?.[field]?.[0];

  if (!message) {
    return null;
  }

  return <p className="text-sm leading-6 text-rose-700">{message}</p>;
}

function SubmitButton({
  isEditing,
  isArchived
}: {
  isEditing: boolean;
  isArchived: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button className="button-primary justify-center" disabled={pending} type="submit">
      {pending
        ? "Salvando..."
        : isEditing
          ? isArchived
            ? "Salvar tarefa arquivada"
            : "Salvar tarefa"
          : "Criar tarefa"}
    </button>
  );
}

export function AdminKanbanTaskForm({ task, assignees }: AdminKanbanTaskFormProps) {
  const [state, formAction] = useActionState(saveKanbanTaskAction, INITIAL_KANBAN_TASK_FORM_STATE);
  const checklistDefaultValue = checklistItemsToText(task?.checklistItems ?? []);
  const isArchived = Boolean(task?.isArchived);

  return (
    <form
      action={formAction}
      className="space-y-8 rounded-[2.25rem] border border-black/5 bg-white/90 p-6 shadow-soft sm:p-8"
    >
      <input name="id" type="hidden" value={task?.id ?? ""} />
      <input name="isArchived" type="hidden" value={task?.isArchived ? "true" : "false"} />

      {state.status === "error" ? (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {state.message}
        </div>
      ) : null}

      {isArchived ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Esta tarefa está arquivada. Você ainda pode ajustar contexto, checklist e responsável sem
          recolocá-la automaticamente no board principal.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[1.3fr_0.7fr]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Título</span>
          <input
            className="field-input"
            defaultValue={task?.title ?? ""}
            maxLength={140}
            name="title"
            required
            type="text"
          />
          <FieldError field="title" state={state} />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Prazo</span>
          <input
            className="field-input"
            defaultValue={formatDateTimeLocal(task?.dueDate)}
            name="dueDate"
            type="datetime-local"
          />
          <FieldError field="dueDate" state={state} />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">Descrição</span>
        <textarea
          className="field-input min-h-36 resize-y"
          defaultValue={task?.description ?? ""}
          maxLength={6000}
          name="description"
          required
        />
        <FieldError field="description" state={state} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Status</span>
          <select className="field-input" defaultValue={task?.status ?? "TODO"} name="status">
            {KANBAN_STATUS_VALUES.map((status) => {
              const meta = getKanbanStatusMeta(status);

              return (
                <option key={status} value={status}>
                  {meta.label}
                </option>
              );
            })}
          </select>
          <FieldError field="status" state={state} />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Prioridade</span>
          <select className="field-input" defaultValue={task?.priority ?? "MEDIUM"} name="priority">
            {KANBAN_PRIORITY_VALUES.map((priority) => {
              const meta = getKanbanPriorityMeta(priority);

              return (
                <option key={priority} value={priority}>
                  {meta.label}
                </option>
              );
            })}
          </select>
          <FieldError field="priority" state={state} />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Tipo</span>
          <select className="field-input" defaultValue={task?.type ?? "BACKEND"} name="type">
            {KANBAN_TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {getKanbanTypeLabel(type)}
              </option>
            ))}
          </select>
          <FieldError field="type" state={state} />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Responsável</span>
          <select className="field-input" defaultValue={task?.assigneeId ?? ""} name="assigneeId">
            <option value="">Sem responsável</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name} • {getAdminRoleLabel(assignee.role)}
              </option>
            ))}
          </select>
          {assignees.length === 0 ? (
            <p className="text-sm leading-6 text-slate">
              Nenhum admin ativo disponível no banco. A interface já está pronta para uso assim que
              novos responsáveis forem cadastrados.
            </p>
          ) : (
            <p className="text-sm leading-6 text-slate">
              Use responsáveis ativos do painel para deixar ownership e filtros do board mais úteis.
            </p>
          )}
          <FieldError field="assigneeId" state={state} />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Observações internas</span>
          <textarea
            className="field-input min-h-48 resize-y"
            defaultValue={task?.notes ?? ""}
            maxLength={6000}
            name="notes"
            placeholder="Dependências, contexto de negócio, riscos, links úteis ou decisões de implementação."
          />
          <p className="text-sm leading-7 text-slate">
            Use este bloco para contexto consolidado. Comentários rápidos e histórico do dia a dia
            ficam na seção de comentários internos da tarefa.
          </p>
          <FieldError field="notes" state={state} />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Checklist</span>
          <textarea
            className="field-input min-h-48 resize-y font-mono text-[0.92rem]"
            defaultValue={checklistDefaultValue}
            name="checklistItems"
            placeholder={"[ ] Item pendente\n[x] Item concluído"}
          />
          <p className="text-sm leading-7 text-slate">
            Use uma linha por item. Prefixe com <code>[ ]</code> para pendente ou <code>[x]</code>{" "}
            para concluído. O progresso aparece no card, no detalhe e no resumo do dashboard.
          </p>
          <FieldError field="checklistItems" state={state} />
        </label>
      </div>

      <div className="grid gap-4 rounded-[1.75rem] bg-black/5 p-5 text-sm text-slate lg:grid-cols-2">
        <div>
          <p className="font-semibold text-ink">Regras desta tela</p>
          <p className="mt-2 leading-7">
            A ordem manual do board é preservada automaticamente. Se você alterar o status aqui, a
            tarefa vai para o fim da nova coluna ativa e pode ser refinada depois via drag and
            drop.
          </p>
        </div>
        <div>
          <p className="font-semibold text-ink">Leitura operacional</p>
          <p className="mt-2 leading-7">
            Responsável, prioridade, checklist e comentários devem ficar coerentes entre board,
            detalhe e dashboard para manter o Kanban realmente útil no dia a dia.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SubmitButton isArchived={isArchived} isEditing={Boolean(task)} />
        <p className="max-w-2xl text-sm leading-7 text-slate">
          O board fica persistido no banco e reflete as alterações imediatamente após o salvamento.
        </p>
      </div>
    </form>
  );
}
