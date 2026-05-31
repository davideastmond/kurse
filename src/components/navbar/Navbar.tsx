import { signOut } from "@/auth/auth";
import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import ThemeToggle from "@/components/theme-toggle/Theme-toggle";
import { getDb } from "@/db";
import { organizationMemberships, organizations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";

async function signOutAction() {
  "use server";

  await signOut({
    redirectTo: "/auth/signin",
  });
}

export default async function Navbar() {
  const session = await getSessionSafely();
  const user = session?.user;
  const role = user?.role;
  const dashboardPath = getDashboardPathForRole(role);

  const db = getDb();
  const organizationsForUser =
    role === "ADMIN" && user?.id && db
      ? await db
          .select({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            membershipRole: organizationMemberships.role,
          })
          .from(organizationMemberships)
          .innerJoin(
            organizations,
            eq(organizations.id, organizationMemberships.organizationId),
          )
          .where(
            and(
              eq(organizationMemberships.userId, user.id),
              eq(organizationMemberships.state, "ACTIVE"),
              eq(organizations.status, "ACTIVE"),
            ),
          )
      : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href={dashboardPath}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Kurse
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href={dashboardPath}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Dashboard
            </Link>

            {role === "ADMIN" ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Admin
                </Link>
                <Link
                  href="/admin/enrollments"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Enrollments
                </Link>
                {organizationsForUser.length > 0 ? (
                  <div className="group relative">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      Organizations
                    </button>
                    <div className="invisible absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-surface p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                      {organizationsForUser.map((organization) => (
                        <Link
                          key={organization.id}
                          href={`/admin/org/${organization.slug}/dashboard`}
                          className="block rounded-lg px-3 py-2 transition hover:bg-muted"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {organization.name}
                          </p>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            {organization.membershipRole}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {role === "STUDENT" ? (
              <Link
                href="/user/dashboard"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Learning
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />

          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 md:flex">
                <p className="max-w-48 truncate text-sm font-medium text-foreground">
                  {user.name || user.email || "User"}
                </p>

                {role === "ADMIN" && (
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-400">
                    Admin
                  </span>
                )}
              </div>

              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
