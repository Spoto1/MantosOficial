import Link from "next/link";

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
};

export function EmptyState({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="display-section mt-2.5 text-balance">{title}</h2>
      <p className="lead-text mx-auto mt-3 max-w-lg text-slate">
        {description}
      </p>

      {primaryAction || secondaryAction ? (
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          {primaryAction ? (
            <Link className="button-primary justify-center" href={primaryAction.href}>
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link className="button-secondary justify-center" href={secondaryAction.href}>
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
