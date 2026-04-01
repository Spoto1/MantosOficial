export default function Loading() {
  return (
    <section className="shell py-12">
      <div className="max-w-3xl space-y-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-12 w-full max-w-2xl" />
        <div className="skeleton h-5 w-full max-w-xl" />
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_0.9fr]">
        <div className="panel p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="skeleton h-12 w-full" key={index} />
            ))}
            <div className="skeleton h-44 w-full sm:col-span-2" />
          </div>
        </div>
        <div className="panel-dark p-6 sm:p-8">
          <div className="space-y-4">
            <div className="skeleton h-8 w-40 bg-white/10" />
            <div className="skeleton h-4 w-full bg-white/10" />
            <div className="skeleton h-4 w-5/6 bg-white/10" />
            <div className="skeleton h-4 w-4/5 bg-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}
