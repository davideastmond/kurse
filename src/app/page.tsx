import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <div className="max-w-3xl">
          <p className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Kurse Learning Studio
          </p>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
            Build, launch, and track learning journeys in one place.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Kurse helps teams create structured courses, publish interactive
            lessons, and keep learners moving with clear progress tracking.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Get started
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Course Builder
            </p>
            <h2 className="mt-2 text-lg font-semibold">Modular by design</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Organize content into modules, lessons, and reusable blocks for
              fast authoring.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Assessment Flow
            </p>
            <h2 className="mt-2 text-lg font-semibold">Quizzes built-in</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Add inline quizzes and evaluate learner understanding without
              leaving the editor.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Progress Signals
            </p>
            <h2 className="mt-2 text-lg font-semibold">Actionable insights</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Monitor completion and keep both instructors and students aligned
              on what comes next.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
