type AdminStatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const toneClassName: Record<NonNullable<AdminStatusBadgeProps["tone"]>, string> = {
  neutral: "border-black/10 bg-black/5 text-ink",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700"
};

export function AdminStatusBadge({ label, tone = "neutral" }: AdminStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.15em] ${toneClassName[tone]}`}
    >
      {label}
    </span>
  );
}
