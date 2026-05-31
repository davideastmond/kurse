import { requireOrganizationAdminOrOwner } from "@/auth/auth";
import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import SeatUtilizationCard from "@/components/admin/org-dashboard/Seat-utilization-card";
import OrganizationMembersManager from "@/components/admin/org-members/Organization-members-manager";
import { getDb } from "@/db";
import {
  organizationMemberships,
  organizations,
  organizationSeatLedger,
  users,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
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

export default async function OrganizationMembersPage({ params }: PageProps) {
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

  const members = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: organizationMemberships.role,
      state: organizationMemberships.state,
    })
    .from(organizationMemberships)
    .innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(
      and(
        eq(organizationMemberships.organizationId, organization.id),
        eq(organizationMemberships.state, "ACTIVE"),
      ),
    )
    .orderBy(users.name);

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

  const memberCount = toNumber(activeMembersRow?.memberCount);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10 md:px-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Organization members
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {organization.name}
        </h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/admin/org/${organization.slug}/dashboard`}
            className="rounded-lg border border-border bg-background px-3 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
          >
            Overview
          </Link>
          <Link
            href={`/admin/org/${organization.slug}/members`}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-foreground"
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

      <SeatUtilizationCard
        totalSeats={toNumber(seatTotalsRow?.totalSeats)}
        usedSeats={memberCount}
        memberCount={memberCount}
      />

      <OrganizationMembersManager
        organizationId={organization.id}
        organizationSlug={organization.slug}
        members={members}
      />
    </main>
  );
}
