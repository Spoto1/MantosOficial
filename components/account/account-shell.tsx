import Link from "next/link";
import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { appendLocalValidationContext } from "@/lib/local-validation";

type AccountShellSection = "overview" | "orders" | "favorites" | "tracking";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AccountShellProps = {
  section: AccountShellSection;
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  preserveLocalValidationContext?: boolean;
  actions?: ReactNode;
  children: ReactNode;
};

const accountNavigation = [
  {
    id: "overview",
    label: "Visão geral",
    href: "/conta"
  },
  {
    id: "orders",
    label: "Pedidos",
    href: "/conta/pedidos"
  },
  {
    id: "favorites",
    label: "Favoritos",
    href: "/favoritos"
  },
  {
    id: "tracking",
    label: "Rastreio",
    href: "/rastreio"
  }
] satisfies Array<{
  id: AccountShellSection;
  label: string;
  href: string;
}>;

export function AccountShell({
  section,
  eyebrow,
  title,
  description,
  breadcrumbs,
  preserveLocalValidationContext = false,
  actions,
  children
}: AccountShellProps) {
  return (
    <section className="shell py-4 sm:py-5 lg:py-6">
      <div className="account-shell overflow-hidden">
        <div className="absolute inset-x-6 top-0 h-24 rounded-full bg-forest/[0.04] blur-3xl" />

        <div className="relative">
          <Breadcrumbs className="mb-3" items={breadcrumbs} />

          <div className="flex flex-col gap-3.5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow">{eyebrow}</p>
              <h1 className="mt-2 font-display text-[1.72rem] leading-[0.98] text-ink sm:text-[2.05rem] lg:text-[2.35rem]">
                {title}
              </h1>
              <p className="mt-2.5 max-w-[42rem] text-[0.84rem] leading-6 text-slate sm:text-[0.9rem]">
                {description}
              </p>
            </div>

            {actions ? (
              <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">{actions}</div>
            ) : null}
          </div>

          <div className="mt-3 rounded-[1rem] border border-black/6 bg-white/82 p-1 shadow-sm backdrop-blur">
            <nav aria-label="Navegação da conta" className="flex flex-wrap gap-1">
              {accountNavigation.map((item) => {
                const isActive = item.id === section;

                return (
                  <Link
                    className={`inline-flex min-h-8 items-center rounded-full px-2.5 py-1.5 text-[0.78rem] font-medium ${
                      isActive
                        ? "bg-ink text-white shadow-sm"
                        : "text-slate hover:bg-black/5 hover:text-ink"
                    }`}
                    href={appendLocalValidationContext(item.href, preserveLocalValidationContext)}
                    key={item.id}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="relative mt-3">{children}</div>
      </div>
    </section>
  );
}
