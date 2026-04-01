type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl space-y-2.5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display-section text-balance">{title}</h2>
      <p className="lead-text max-w-xl text-slate">{description}</p>
    </div>
  );
}
