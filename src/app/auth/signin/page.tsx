import { SigninForm } from "@/app/auth/signin/Signin-form";
import { getDashboardPathForEmail } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import { redirect } from "next/navigation";

export default async function SigninPage() {
  const session = await getSessionSafely();
  if (session?.user?.email) {
    const dashboardPath = await getDashboardPathForEmail(session.user.email);
    redirect(dashboardPath);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-success/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-300/20 blur-3xl" />
      </div>

      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-12 md:px-10 lg:grid-cols-[1fr_0.95fr]">
        <section className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Welcome Back
          </p>
          <h1 className="max-w-xl text-4xl leading-tight font-semibold tracking-tight md:text-6xl">
            Sign in to continue your learning journey
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
            Access your course dashboard, resume lessons, and keep your progress
            moving with your existing account.
          </p>

          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                Resume Progress
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick up where you left off in active courses and assessments.
              </p>
            </article>
            <article className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                Secure Session
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Credentials are verified before session access is granted.
              </p>
            </article>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.1)] sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the email and password you used when creating your account.
            </p>
          </div>

          <SigninForm />
        </section>
      </main>
    </div>
  );
}
