export default function Loading() {
  return (
    <section className="shell py-12">
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="panel overflow-hidden p-6 sm:p-8">
          <div className="skeleton h-[42rem] w-full rounded-[2rem]" />
        </div>
        <div className="space-y-8">
          <div className="panel p-6 sm:p-8">
            <div className="space-y-4">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-12 w-full max-w-xl" />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-4/5" />
              <div className="skeleton h-32 w-full" />
            </div>
          </div>
          <div className="panel p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="skeleton h-12 w-full" key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
