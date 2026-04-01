import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: ReactNode;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions
}: PageIntroProps) {
  return (
    <div className="max-w-3xl">
      <Breadcrumbs className="mb-4" items={breadcrumbs} />
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display-page mt-2.5 text-balance">{title}</h1>
      <p className="lead-text mt-3 max-w-[42rem] text-slate">{description}</p>
      {actions ? <div className="mt-5 flex flex-col gap-2 sm:flex-row">{actions}</div> : null}
    </div>
  );
}
