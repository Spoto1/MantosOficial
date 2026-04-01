type AdminPanelProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminPanel({ title, description, actions, children }: AdminPanelProps) {
  return (
    <section className="rounded-[1.35rem] border border-black/5 bg-white/90 p-3.5 shadow-soft sm:p-4">
      <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-[0.96rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.04rem]">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 max-w-[34rem] text-[0.8rem] leading-5 text-slate">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}
