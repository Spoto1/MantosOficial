export default function Loading() {
  return (
    <section className="shell py-12">
      <div className="max-w-3xl space-y-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-12 w-full max-w-2xl" />
        <div className="skeleton h-5 w-full max-w-xl" />
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-6 sm:p-8">
          <div className="space-y-4">
            <div className="skeleton h-8 w-56" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="skeleton h-12 w-full" key={index} />
              ))}
            </div>
            <div className="skeleton h-40 w-full" />
          </div>
        </div>

        <div className="panel-dark p-6 sm:p-8">
          <div className="space-y-4">
            <div className="skeleton h-8 w-48 bg-white/10" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="skeleton h-28 w-full bg-white/10" key={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
