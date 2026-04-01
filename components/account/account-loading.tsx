type AccountLoadingProps = {
  metrics?: number;
  panels?: number;
};

export function AccountLoading({ metrics = 4, panels = 4 }: AccountLoadingProps) {
  return (
    <section className="shell py-8 sm:py-10 lg:py-12">
      <div className="account-shell">
        <div className="space-y-4">
          <div className="skeleton h-4 w-36" />
          <div className="skeleton h-14 w-full max-w-3xl" />
          <div className="skeleton h-5 w-full max-w-2xl" />
          <div className="skeleton h-5 w-4/5 max-w-xl" />
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-black/6 bg-white/82 p-2">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="skeleton h-10 w-28 rounded-full" key={index} />
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: metrics }).map((_, index) => (
            <div className="account-stat" key={index}>
              <div className="skeleton h-3 w-20" />
              <div className="mt-3 skeleton h-8 w-24" />
              <div className="mt-3 skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {Array.from({ length: panels }).map((_, index) => (
            <div className="account-panel" key={index}>
              <div className="skeleton h-4 w-28" />
              <div className="mt-3 skeleton h-8 w-2/3" />
              <div className="mt-4 grid gap-3">
                <div className="skeleton h-24 w-full rounded-[1.4rem]" />
                <div className="skeleton h-24 w-full rounded-[1.4rem]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
