import {
  listOrganizationWebhookDeliveryQueue,
  listOrganizationWebhookEndpoints,
} from "@/app/actions/webhooks";
import { requireOrganizationAdminOrOwner } from "@/auth/auth";
import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import IntegrationsManager from "@/components/admin/org-integrations/Integrations-manager";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
};

export default async function OrganizationIntegrationsPage({
  params,
}: PageProps) {
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

  const [endpoints, deliveryLogs] = await Promise.all([
    listOrganizationWebhookEndpoints({ organizationId: organization.id }),
    listOrganizationWebhookDeliveryQueue({ organizationId: organization.id }),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10 md:px-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Organization integrations
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
          <Link
            href={`/admin/org/${organization.slug}/integrations`}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-foreground"
          >
            Integrations
          </Link>
        </nav>
      </header>

      <IntegrationsManager
        organizationId={organization.id}
        endpoints={endpoints.map((endpoint) => ({
          id: endpoint.id,
          url: endpoint.url,
          status: endpoint.status,
          createdAtIso: endpoint.createdAt.toISOString(),
          updatedAtIso: endpoint.updatedAt.toISOString(),
          eventTypes: endpoint.eventTypes,
        }))}
        deliveryLogs={deliveryLogs.map((delivery) => ({
          id: delivery.id,
          endpointId: delivery.endpointId,
          endpointUrl: delivery.endpointUrl,
          eventId: delivery.eventId,
          eventType: delivery.eventType,
          attempt: delivery.attempt,
          status: delivery.status,
          responseCode: delivery.responseCode,
          responseBodySnippet: delivery.responseBodySnippet,
          nextRetryAtIso: delivery.nextRetryAt
            ? delivery.nextRetryAt.toISOString()
            : null,
          deliveredAtIso: delivery.deliveredAt
            ? delivery.deliveredAt.toISOString()
            : null,
          createdAtIso: delivery.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
