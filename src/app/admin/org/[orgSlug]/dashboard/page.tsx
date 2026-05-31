import { requireOrganizationAdminOrOwner } from "@/auth/auth";
import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import SeatUtilizationCard from "@/components/admin/org-dashboard/Seat-utilization-card";
import { getDb } from "@/db";
import {
  enrollments,
  evaluationAttempts,
  organizationCourseAssignments,
  organizationMemberships,
  organizations,
  organizationSeatLedger,
} from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export default async function OrganizationDashboardPage({ params }: PageProps) {
  const session = await getSessionSafely();
  if (!session?.user?.email || !session.user.id) {
    redirect("/auth/signin");
  }

  const dashboardPath = getDashboardPathForRole(session.user.role);
  if (dashboardPath !== "/admin/dashboard") {
    redirect(dashboardPath);
  }

  const { orgSlug } = await params;
  const db = getDb();

  if (!db) {
    return (
      <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
        <section className="rounded-2xl border border-danger/40 bg-danger/15 p-6 text-danger">
          Database is not configured. Set DATABASE_URL and retry.
        </section>
      </main>
    );
  }

  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(
      and(eq(organizations.slug, orgSlug), eq(organizations.status, "ACTIVE")),
    )
    .limit(1);

  if (!organization) {
    redirect("/admin/dashboard");
  }

  const access = await requireOrganizationAdminOrOwner({
    organizationId: organization.id,
    userId: session.user.id,
  });

  if (!access.ok) {
    redirect("/admin/dashboard");
  }

  const [seatTotalsRow] = await db
    .select({
      totalSeats: sql<number>`COALESCE(SUM(${organizationSeatLedger.delta}), 0)`,
    })
    .from(organizationSeatLedger)
    .where(eq(organizationSeatLedger.organizationId, organization.id));

  const [activeMembersRow] = await db
    .select({
      memberCount: sql<number>`COUNT(*)`,
    })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organization.id),
        eq(organizationMemberships.state, "ACTIVE"),
      ),
    );

  const [courseAssignmentsRow] = await db
    .select({
      assignmentCount: sql<number>`COUNT(*)`,
    })
    .from(organizationCourseAssignments)
    .where(eq(organizationCourseAssignments.organizationId, organization.id));

  const memberIdsRows = await db
    .select({ userId: organizationMemberships.userId })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organization.id),
        eq(organizationMemberships.state, "ACTIVE"),
      ),
    );

  const memberIds = memberIdsRows.map((row) => row.userId);

  let completionRate = 0;
  let passRate = 0;

  if (memberIds.length > 0) {
    const [completionRow] = await db
      .select({
        completedCount: sql<number>`COUNT(*)`,
      })
      .from(enrollments)
      .where(
        and(
          inArray(enrollments.userId, memberIds),
          sql`${enrollments.completedAt} IS NOT NULL`,
        ),
      );

    const [activeEnrollmentsRow] = await db
      .select({
        activeCount: sql<number>`COUNT(*)`,
      })
      .from(enrollments)
      .where(inArray(enrollments.userId, memberIds));

    const [passedAttemptsRow] = await db
      .select({
        passedCount: sql<number>`COUNT(*)`,
      })
      .from(evaluationAttempts)
      .innerJoin(
        enrollments,
        eq(enrollments.id, evaluationAttempts.enrollmentId),
      )
      .where(
        and(
          inArray(enrollments.userId, memberIds),
          eq(evaluationAttempts.passed, true),
        ),
      );

    const [attemptsRow] = await db
      .select({
        attemptCount: sql<number>`COUNT(*)`,
      })
      .from(evaluationAttempts)
      .innerJoin(
        enrollments,
        eq(enrollments.id, evaluationAttempts.enrollmentId),
      )
      .where(inArray(enrollments.userId, memberIds));

    const completedCount = toNumber(completionRow?.completedCount);
    const enrollmentCount = toNumber(activeEnrollmentsRow?.activeCount);
    const passedCount = toNumber(passedAttemptsRow?.passedCount);
    const attemptCount = toNumber(attemptsRow?.attemptCount);

    completionRate =
      enrollmentCount > 0
        ? Math.round((completedCount / enrollmentCount) * 100)
        : 0;
    passRate =
      attemptCount > 0 ? Math.round((passedCount / attemptCount) * 100) : 0;
  }

  const totalSeats = toNumber(seatTotalsRow?.totalSeats);
  const memberCount = toNumber(activeMembersRow?.memberCount);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Organization dashboard
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {organization.name}
        </h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/admin/org/${organization.slug}/dashboard`}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-foreground"
          >
            Overview
          </Link>
          <Link
            href={`/admin/org/${organization.slug}/members`}
            className="rounded-lg border border-border bg-background px-3 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
          >
            Members
          </Link>
          <Link
            href={`/admin/org/${organization.slug}/assignments`}
            className="rounded-lg border border-border bg-background px-3 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
          >
            Assignments
          </Link>
        </nav>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SeatUtilizationCard
          totalSeats={totalSeats}
          usedSeats={memberCount}
          memberCount={memberCount}
        />
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Course assignments
          </h2>
          <p className="mt-3 text-3xl font-semibold text-foreground">
            {toNumber(courseAssignmentsRow?.assignmentCount)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Distinct courses assigned at org level.
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Completion rate
          </h2>
          <p className="mt-3 text-3xl font-semibold text-foreground">
            {completionRate}%
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed enrollments over all enrollments.
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Evaluation pass rate
          </h2>
          <p className="mt-3 text-3xl font-semibold text-foreground">
            {passRate}%
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Passed attempts over total attempts.
          </p>
        </article>
      </section>
    </main>
  );
}
