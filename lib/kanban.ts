export const KANBAN_STATUS_VALUES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE"
] as const;

export const KANBAN_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const KANBAN_TYPE_VALUES = [
  "DESIGN",
  "FRONTEND",
  "BACKEND",
  "ADMIN",
  "CHECKOUT",
  "AUTH",
  "CAMPAIGNS",
  "CONTENT",
  "INFRA",
  "BUG",
  "POLISH",
  "SECURITY",
  "OPS"
] as const;

export const KANBAN_SORT_VALUES = [
  "manual",
  "priority",
  "createdAt",
  "updatedAt",
  "dueDate"
] as const;

export const KANBAN_ARCHIVE_SCOPE_VALUES = ["ACTIVE", "ARCHIVED", "ALL"] as const;

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function getKanbanStatusMeta(status: string): {
  label: string;
  shortLabel: string;
  tone: Tone;
  accentClassName: string;
  surfaceClassName: string;
} {
  switch (status) {
    case "TODO":
      return {
        label: "A Fazer",
        shortLabel: "Fazer",
        tone: "neutral",
        accentClassName: "from-slate-300/60 via-slate-200/20 to-transparent",
        surfaceClassName: "bg-white/80"
      };
    case "IN_PROGRESS":
      return {
        label: "Em andamento",
        shortLabel: "Andamento",
        tone: "info",
        accentClassName: "from-sky-300/70 via-sky-100/30 to-transparent",
        surfaceClassName: "bg-sky-50/60"
      };
    case "IN_REVIEW":
      return {
        label: "Em revisão",
        shortLabel: "Revisão",
        tone: "warning",
        accentClassName: "from-amber-300/70 via-amber-100/35 to-transparent",
        surfaceClassName: "bg-amber-50/65"
      };
    case "BLOCKED":
      return {
        label: "Bloqueado",
        shortLabel: "Bloqueado",
        tone: "danger",
        accentClassName: "from-rose-300/70 via-rose-100/35 to-transparent",
        surfaceClassName: "bg-rose-50/65"
      };
    case "DONE":
      return {
        label: "Concluído",
        shortLabel: "Concluído",
        tone: "success",
        accentClassName: "from-emerald-300/70 via-emerald-100/35 to-transparent",
        surfaceClassName: "bg-emerald-50/65"
      };
    default:
      return {
        label: "Backlog",
        shortLabel: "Backlog",
        tone: "neutral",
        accentClassName: "from-stone-300/60 via-stone-100/20 to-transparent",
        surfaceClassName: "bg-stone-50/70"
      };
  }
}

export function getKanbanPriorityMeta(priority: string): {
  label: string;
  tone: Tone;
  chipClassName: string;
} {
  switch (priority) {
    case "CRITICAL":
      return {
        label: "Crítica",
        tone: "danger",
        chipClassName: "border-rose-200 bg-rose-50 text-rose-700"
      };
    case "HIGH":
      return {
        label: "Alta",
        tone: "warning",
        chipClassName: "border-amber-200 bg-amber-50 text-amber-700"
      };
    case "MEDIUM":
      return {
        label: "Média",
        tone: "info",
        chipClassName: "border-sky-200 bg-sky-50 text-sky-700"
      };
    default:
      return {
        label: "Baixa",
        tone: "neutral",
        chipClassName: "border-black/10 bg-black/5 text-ink"
      };
  }
}

export function getKanbanTypeLabel(type: string) {
  switch (type) {
    case "FRONTEND":
      return "Frontend";
    case "BACKEND":
      return "Backend";
    case "CHECKOUT":
      return "Checkout";
    case "AUTH":
      return "Auth";
    case "CAMPAIGNS":
      return "Campaigns";
    case "CONTENT":
      return "Content";
    case "INFRA":
      return "Infra";
    case "BUG":
      return "Bug";
    case "POLISH":
      return "Polish";
    case "SECURITY":
      return "Security";
    case "OPS":
      return "Ops";
    default:
      return type.charAt(0) + type.slice(1).toLowerCase();
  }
}

export function getKanbanSortLabel(sort: string) {
  switch (sort) {
    case "priority":
      return "Prioridade";
    case "createdAt":
      return "Criação";
    case "updatedAt":
      return "Atualização";
    case "dueDate":
      return "Prazo";
    default:
      return "Ordem manual";
  }
}

export function getKanbanArchiveScopeLabel(scope: string) {
  switch (scope) {
    case "ARCHIVED":
      return "Somente arquivadas";
    case "ALL":
      return "Ativas + arquivadas";
    default:
      return "Somente ativas";
  }
}

export function isKanbanTaskOverdue(input: { dueDate?: Date | null; status: string }) {
  if (!input.dueDate) {
    return false;
  }

  if (input.status === "DONE") {
    return false;
  }

  return input.dueDate.getTime() < Date.now();
}
