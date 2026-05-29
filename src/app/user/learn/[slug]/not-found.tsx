import Link from "next/link";

export default function LearningNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center px-6 py-12 md:px-10">
      <section className="w-full rounded-3xl border border-border bg-surface p-8 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Course Not Available
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          We could not find that learning page
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          This course may be unpublished, unavailable for your account, or the
          link may be outdated.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/user/dashboard"
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Go To Dashboard
          </Link>

          <Link
            href="/auth/signin"
            className="inline-flex items-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Sign In Again
          </Link>
        </div>
      </section>
    </main>
  );
}
