type AdminStatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

export function AdminStatCard({ label, value, helper }: AdminStatCardProps) {
  return (
    <article className="rounded-[1.15rem] border border-black/5 bg-white/90 p-3 shadow-soft sm:p-3.5">
      <div className="flex min-h-[5.45rem] flex-col justify-between gap-2.5">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-slate">{label}</p>
        <div className="space-y-1">
          <p className="text-[1.34rem] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[1.42rem]">
            {value}
          </p>
          {helper ? <p className="text-[0.72rem] leading-[1.2rem] text-slate">{helper}</p> : null}
        </div>
      </div>
    </article>
  );
}
