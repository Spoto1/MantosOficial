import Link from "next/link";

import type { AdminPermission, AdminSession } from "@/lib/auth/admin";
import { adminHasPermission } from "@/lib/auth/admin";

const adminLinks: Array<{
  label: string;
  href: string;
  permission: AdminPermission;
  helper: string;
}> = [
  { label: "Dashboard", href: "/admin", permission: "dashboard", helper: "Métricas e alertas" },
  { label: "Kanban", href: "/admin/kanban", permission: "kanban", helper: "Roadmap e execução" },
  { label: "Produtos", href: "/admin/products", permission: "products", helper: "Catálogo e estoque" },
  { label: "Pedidos", href: "/admin/orders", permission: "orders", helper: "Checkout e status" },
  { label: "Leads", href: "/admin/leads", permission: "leads", helper: "Captação consolidada" },
  {
    label: "Newsletter",
    href: "/admin/newsletter",
    permission: "newsletter",
    helper: "Inscritos e status"
  },
  { label: "Contatos", href: "/admin/contacts", permission: "contacts", helper: "Mensagens e triagem" },
  { label: "Campanhas", href: "/admin/campaigns", permission: "campaigns", helper: "Hero, banners e CTA" },
  { label: "Uploads", href: "/admin/uploads", permission: "uploads", helper: "Assets via navegador" },
  { label: "Admins", href: "/admin/admins", permission: "admins", helper: "Usuários e roles" },
  { label: "Atividade", href: "/admin/logs", permission: "logs", helper: "Rastro operacional" }
];

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => ({
    label: segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    href: `/${segments.slice(0, index + 1).join("/")}`
  }));
}

type AdminShellProps = {
  currentPath: string;
  session: AdminSession;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({
  currentPath,
  session,
  title,
  description,
  actions,
  children
}: AdminShellProps) {
  const breadcrumbs = buildBreadcrumbs(currentPath);
  const visibleLinks = adminLinks.filter((link) => adminHasPermission(session, link.permission));

  return (
    <section className="mx-auto w-full max-w-[86rem] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
      <div className="grid gap-3 xl:grid-cols-[13.25rem_minmax(0,1fr)] 2xl:grid-cols-[13.75rem_minmax(0,1fr)]">
        <aside className="order-2 rounded-[1.55rem] border border-white/10 bg-[#101214] p-3 text-white shadow-soft xl:order-none xl:sticky xl:top-3 xl:self-start">
          <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3">
            <p className="eyebrow !gap-2 !text-white/42 before:!w-7">Admin Mantos Oficial</p>
            <h1 className="mt-2 font-display text-[1.48rem] leading-none tracking-[-0.03em]">
              Painel admin
            </h1>
            <p className="mt-2 text-[0.78rem] leading-5 text-white/68">
              Operação, catálogo e conteúdo com leitura compacta e navegação por módulo.
            </p>
          </div>

          <div className="mt-3 rounded-[1.05rem] border border-white/10 bg-black/20 p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/40">
              Sessão ativa
            </p>
            <p className="mt-1.5 text-[0.88rem] font-semibold leading-5">{session.name}</p>
            <p className="mt-1 text-[0.74rem] text-white/62">{session.email}</p>
            <p className="mt-2 inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.14em] text-white/72">
              {session.role}
            </p>
          </div>

          <nav className="mt-3 flex flex-col gap-1.5">
            {visibleLinks.map((link) => {
              const active =
                link.href === "/admin" ? currentPath === link.href : currentPath.startsWith(link.href);

              return (
                <Link
                  className={`rounded-[0.95rem] border px-2.5 py-2 transition ${
                    active
                      ? "border-white/20 bg-white text-[#101214]"
                      : "border-white/10 bg-white/5 text-white/85 hover:border-white/20 hover:bg-white/10"
                  }`}
                  href={link.href}
                  key={link.href}
                >
                    <p className="text-[0.82rem] font-semibold leading-5">{link.label}</p>
                    <p
                      className={`mt-1 text-[0.64rem] leading-4 ${
                        active ? "text-[#101214]/68" : "text-white/45"
                      }`}
                    >
                    {link.helper}
                  </p>
                </Link>
              );
            })}
          </nav>

          <Link
            className="button-secondary button-compact mt-3 w-full justify-center !border-white/15 !bg-white/5 !text-white hover:!bg-white/10 hover:!text-white"
            href="/api/admin/logout"
          >
            Encerrar sessão
          </Link>
        </aside>

        <div className="order-1 space-y-3.5 xl:order-none">
          <header className="rounded-[1.45rem] border border-black/5 bg-white/85 p-3.5 shadow-soft sm:p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate">
                  {breadcrumbs.map((crumb) => (
                    <span key={crumb.href}>{crumb.label}</span>
                  ))}
                </div>
                <h2 className="mt-2 font-display text-[1.6rem] leading-none tracking-[-0.04em] text-ink sm:text-[1.95rem]">
                  {title}
                </h2>
                <p className="mt-2 max-w-[38rem] text-[0.84rem] leading-5 text-slate">{description}</p>
              </div>

              <div className="flex w-full flex-col gap-2 lg:max-w-[16rem]">
                <div className="rounded-[0.95rem] border border-black/5 bg-black/[0.03] px-3 py-2 text-[0.74rem] leading-5 text-slate">
                  Use os filtros do módulo atual e a navegação lateral para ir direto ao que precisa.
                </div>
                <div className="rounded-[0.95rem] border border-black/5 bg-white/70 px-3 py-2 text-[0.72rem] leading-5 text-slate">
                  Role atual: <span className="font-semibold text-ink">{session.role}</span>
                </div>
                {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
              </div>
            </div>
          </header>

          {children}
        </div>
      </div>
    </section>
  );
}
