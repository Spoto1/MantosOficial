import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { saveAdminUserAction } from "@/lib/actions/admin";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getAdminRoleLabel } from "@/lib/admin-format";
import { getAdminUsers } from "@/lib/repositories/admin-users";
import { ADMIN_ROLE_VALUES, ADMIN_USER_STATUS_VALUES } from "@/lib/validators";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage() {
  const session = await requireAdminAuth("admins");
  const admins = await getAdminUsers();

  return (
    <AdminShell
      currentPath="/admin/admins"
      description="Base simples para múltiplos administradores com role, status e senha persistida."
      session={session}
      title="Admins e permissões"
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel description="Cadastre um novo admin ou atualize um registro existente." title="Novo admin">
          <form action={saveAdminUserAction} className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">Nome</span>
              <input autoComplete="name" className="field-input" name="name" required type="text" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">E-mail</span>
              <input autoComplete="email" className="field-input" name="email" required type="email" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">Role</span>
                <select className="field-input" defaultValue="ADMIN" name="role">
                  {ADMIN_ROLE_VALUES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">Status</span>
                <select className="field-input" defaultValue="ACTIVE" name="status">
                  {ADMIN_USER_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">Senha inicial</span>
              <input
                autoComplete="new-password"
                className="field-input"
                name="password"
                required
                type="password"
              />
            </label>
            <button className="button-primary justify-center" type="submit">
              Criar admin
            </button>
          </form>
        </AdminPanel>

        <AdminPanel description="Roles mínimas para o MVP: superadmin, admin, editor e marketing." title="Admins cadastrados">
          <div className="grid gap-4">
            {admins.map((admin) => (
              <article className="rounded-[2rem] border border-black/5 bg-white p-5" key={admin.id}>
                <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <AdminStatusBadge
                        label={getAdminRoleLabel(admin.role)}
                        tone={admin.role === "SUPERADMIN" ? "info" : "neutral"}
                      />
                      <AdminStatusBadge
                        label={admin.status}
                        tone={admin.status === "ACTIVE" ? "success" : "warning"}
                      />
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-ink">{admin.name}</h3>
                    <p className="mt-2 text-sm text-slate">Conta interna cadastrada para acesso administrativo.</p>
                    <p className="mt-3 text-sm text-slate">
                      Criado em {admin.createdAt.toLocaleString("pt-BR")}
                      {admin.lastLoginAt ? ` • Último login ${admin.lastLoginAt.toLocaleString("pt-BR")}` : ""}
                    </p>
                  </div>

                  <form action={saveAdminUserAction} className="grid gap-3">
                    <input name="id" type="hidden" value={admin.id} />
                    <input name="name" type="hidden" value={admin.name} />
                    <input name="email" type="hidden" value={admin.email} />
                    <select className="field-input" defaultValue={admin.role} name="role">
                      {ADMIN_ROLE_VALUES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <select className="field-input" defaultValue={admin.status} name="status">
                      {ADMIN_USER_STATUS_VALUES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <input
                      autoComplete="new-password"
                      className="field-input"
                      name="password"
                      placeholder="Nova senha opcional"
                      type="password"
                    />
                    <button className="button-secondary justify-center" type="submit">
                      Atualizar
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
