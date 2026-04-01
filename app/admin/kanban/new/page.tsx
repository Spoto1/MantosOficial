import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminKanbanTaskForm } from "@/components/admin/admin-kanban-task-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminCanManageKanban, requireAdminAuth } from "@/lib/auth/admin";
import { getKanbanAssignees } from "@/lib/repositories/kanban";

export const dynamic = "force-dynamic";

export default async function NewAdminKanbanTaskPage() {
  const session = await requireAdminAuth("kanban");

  if (!adminCanManageKanban(session)) {
    redirect("/admin/kanban?error=readonly");
  }

  const assignees = await getKanbanAssignees();

  return (
    <AdminShell
      actions={
        <Link className="button-secondary justify-center" href="/admin/kanban">
          Voltar ao board
        </Link>
      }
      currentPath="/admin/kanban/new"
      description="Cadastre uma nova tarefa persistida no board do projeto, com prioridade, tipo, prazo, checklist e responsável."
      session={session}
      title="Nova tarefa"
    >
      <AdminKanbanTaskForm
        assignees={assignees.map((assignee) => ({
          id: assignee.id,
          name: assignee.name,
          role: assignee.role
        }))}
      />
    </AdminShell>
  );
}
