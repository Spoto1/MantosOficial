type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function getLeadStatusMeta(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "IN_CONTACT":
      return { label: "Em contato", tone: "info" };
    case "QUALIFIED":
      return { label: "Qualificado", tone: "success" };
    case "CONVERTED":
      return { label: "Convertido", tone: "success" };
    case "ARCHIVED":
      return { label: "Arquivado", tone: "neutral" };
    default:
      return { label: "Novo", tone: "warning" };
  }
}

export function getNewsletterStatusMeta(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "ARCHIVED":
      return { label: "Arquivado", tone: "neutral" };
    case "UNSUBSCRIBED":
      return { label: "Descadastrado", tone: "warning" };
    default:
      return { label: "Ativo", tone: "success" };
  }
}

export function getContactStatusMeta(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "IN_REVIEW":
      return { label: "Lido", tone: "info" };
    case "REPLIED":
      return { label: "Respondido", tone: "success" };
    case "ARCHIVED":
      return { label: "Arquivado", tone: "neutral" };
    default:
      return { label: "Novo", tone: "warning" };
  }
}

export function getCampaignStatusMeta(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "ACTIVE":
      return { label: "Ativa", tone: "success" };
    case "SCHEDULED":
      return { label: "Agendada", tone: "info" };
    case "PAUSED":
      return { label: "Pausada", tone: "warning" };
    case "ARCHIVED":
      return { label: "Arquivada", tone: "neutral" };
    default:
      return { label: "Rascunho", tone: "neutral" };
  }
}

export function getAdminRoleLabel(role: string) {
  switch (role) {
    case "SUPERADMIN":
      return "Superadmin";
    case "EDITOR":
      return "Editor";
    case "MARKETING":
      return "Marketing";
    default:
      return "Admin";
  }
}
