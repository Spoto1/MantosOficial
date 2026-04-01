type PageSkeletonProps = {
  headingWidth?: string;
  cards?: number;
};

export function PageSkeleton({
  headingWidth = "max-w-3xl",
  cards = 3
}: PageSkeletonProps) {
  return (
    <section className="shell py-12">
      <div className={`space-y-4 ${headingWidth}`}>
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-12 w-full max-w-2xl" />
        <div className="skeleton h-5 w-full max-w-xl" />
        <div className="skeleton h-5 w-4/5 max-w-lg" />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div className="panel overflow-hidden p-6" key={index}>
            <div className="skeleton h-72 w-full rounded-[1.75rem]" />
            <div className="mt-6 space-y-3">
              <div className="skeleton h-5 w-28" />
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
