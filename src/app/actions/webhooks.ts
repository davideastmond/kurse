"use server";

import {
  WEBHOOK_EVENT_VERSION,
  type WebhookPayloadJson,
} from "@/app/utils/webhooks/definitions";
import { buildWebhookEnvelope } from "@/app/utils/webhooks/payload-builder";
import { getNextWebhookRetryAt } from "@/app/utils/webhooks/retry-schedule";
import { requireOrganizationAdminOrOwner } from "@/auth/auth";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import {
  organizations,
  webhookDeliveries,
  webhookEndpoints,
  webhookEvents,
  webhookSubscriptions,
} from "@/db/schema";
import {
  webhookEventTypes,
  type WebhookEventType,
} from "@/shared/types/webhook-events";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

type EnqueueWebhookEventInput<TData = WebhookPayloadJson> = {
  eventType: WebhookEventType;
  organizationId?: string | null;
  data: TData;
  occurredAt?: Date;
};

type EnqueueWebhookEventResult =
  | {
      ok: true;
      eventId: string;
      deliveryCount: number;
    }
  | {
      ok: false;
      message: string;
    };

type WebhookDeliveryResponseInput = {
  deliveryId: string;
  responseCode?: number;
  responseBodySnippet?: string | null;
};

type WebhookDeliveryResult =
  | {
      ok: true;
      status: "SUCCESS" | "FAILED" | "DEAD_LETTER";
      retryScheduled: boolean;
      nextRetryAt: string | null;
    }
  | {
      ok: false;
      message: string;
    };

type WebhookEndpointActionResult =
  | {
      ok: true;
      message?: string;
      endpointId?: string;
      secret?: string;
    }
  | {
      ok: false;
      message: string;
    };

const createWebhookEndpointSchema = z.object({
  organizationId: z.string().uuid(),
  url: z.url().trim(),
  eventTypes: z.array(z.enum(webhookEventTypes)).min(1),
});

const updateWebhookEndpointSchema = z.object({
  organizationId: z.string().uuid(),
  endpointId: z.string().uuid(),
  url: z.url().trim(),
  status: z.enum(["ACTIVE", "PAUSED"]),
  eventTypes: z.array(z.enum(webhookEventTypes)).min(1),
});

const deleteWebhookEndpointSchema = z.object({
  organizationId: z.string().uuid(),
  endpointId: z.string().uuid(),
});

const rotateWebhookEndpointSecretSchema = z.object({
  organizationId: z.string().uuid(),
  endpointId: z.string().uuid(),
});

const replayWebhookDeliverySchema = z.object({
  organizationId: z.string().uuid(),
  deliveryId: z.string().uuid(),
});

function hashWebhookSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function createWebhookSecret() {
  return randomBytes(24).toString("hex");
}

async function requireOrganizationAdmin(input: { organizationId: string }) {
  const session = await getSessionSafely();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      ok: false as const,
      message: "You must be signed in to manage webhook endpoints.",
    };
  }

  const access = await requireOrganizationAdminOrOwner({
    organizationId: input.organizationId,
    userId,
  });

  if (!access.ok) {
    return {
      ok: false as const,
      message: access.message,
    };
  }

  return {
    ok: true as const,
    userId,
  };
}

async function ensureOrganizationExists(organizationId: string) {
  const db = getDb();
  if (!db) {
    return {
      ok: false as const,
      message: "Database is not configured.",
      db: null,
      organizationSlug: null,
    };
  }

  const [organization] = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(
      and(
        eq(organizations.id, organizationId),
        eq(organizations.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!organization) {
    return {
      ok: false as const,
      message: "Organization not found or inactive.",
      db,
      organizationSlug: null,
    };
  }

  return {
    ok: true as const,
    db,
    organizationSlug: organization.slug,
  };
}

function revalidateIntegrationsPaths(orgSlug: string) {
  revalidatePath(`/admin/org/${orgSlug}/integrations`);
  revalidatePath(`/admin/org/${orgSlug}/dashboard`);
}

function toOrganizationFilter(organizationId: string | null) {
  if (organizationId) {
    return eq(webhookEndpoints.organizationId, organizationId);
  }

  return isNull(webhookEndpoints.organizationId);
}

export async function enqueueWebhookEvent<TData = WebhookPayloadJson>(
  input: EnqueueWebhookEventInput<TData>,
): Promise<EnqueueWebhookEventResult> {
  const db = getDb();

  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  try {
    const occurredAt = input.occurredAt ?? new Date();
    const eventId = crypto.randomUUID();
    const organizationId = input.organizationId ?? null;

    const payload = buildWebhookEnvelope({
      eventId,
      eventType: input.eventType,
      organizationId,
      version: WEBHOOK_EVENT_VERSION,
      occurredAt,
      data: input.data,
    });

    await db.insert(webhookEvents).values({
      id: eventId,
      eventType: input.eventType,
      version: WEBHOOK_EVENT_VERSION,
      organizationId,
      payloadJson: payload,
      occurredAt,
    });

    const subscribedEndpoints = await db
      .select({ endpointId: webhookEndpoints.id })
      .from(webhookSubscriptions)
      .innerJoin(
        webhookEndpoints,
        eq(webhookSubscriptions.endpointId, webhookEndpoints.id),
      )
      .where(
        and(
          eq(webhookSubscriptions.eventType, input.eventType),
          eq(webhookEndpoints.status, "ACTIVE"),
          toOrganizationFilter(organizationId),
        ),
      );

    if (subscribedEndpoints.length > 0) {
      await db.insert(webhookDeliveries).values(
        subscribedEndpoints.map((endpoint) => ({
          eventId,
          endpointId: endpoint.endpointId,
          attempt: 1,
          status: "PENDING" as const,
        })),
      );
    }

    return {
      ok: true,
      eventId,
      deliveryCount: subscribedEndpoints.length,
    };
  } catch (error) {
    console.error("Failed to enqueue webhook event:", error);
    return {
      ok: false,
      message: "Unable to enqueue webhook event right now.",
    };
  }
}

export async function markWebhookDeliverySuccess(
  input: WebhookDeliveryResponseInput,
): Promise<WebhookDeliveryResult> {
  const db = getDb();

  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  try {
    await db
      .update(webhookDeliveries)
      .set({
        status: "SUCCESS",
        deliveredAt: new Date(),
        nextRetryAt: null,
        responseCode: input.responseCode,
        responseBodySnippet: input.responseBodySnippet ?? null,
      })
      .where(eq(webhookDeliveries.id, input.deliveryId));

    return {
      ok: true,
      status: "SUCCESS",
      retryScheduled: false,
      nextRetryAt: null,
    };
  } catch (error) {
    console.error("Failed to mark webhook delivery success:", error);
    return {
      ok: false,
      message: "Unable to update delivery status right now.",
    };
  }
}

export async function markWebhookDeliveryFailure(
  input: WebhookDeliveryResponseInput,
): Promise<WebhookDeliveryResult> {
  const db = getDb();

  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  try {
    const [delivery] = await db
      .select({
        id: webhookDeliveries.id,
        eventId: webhookDeliveries.eventId,
        endpointId: webhookDeliveries.endpointId,
        attempt: webhookDeliveries.attempt,
      })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, input.deliveryId))
      .limit(1);

    if (!delivery) {
      return {
        ok: false,
        message: "Delivery not found.",
      };
    }

    const nextAttempt = delivery.attempt + 1;
    const nextRetryAt = getNextWebhookRetryAt({ attempt: delivery.attempt });
    const shouldRetry = Boolean(nextRetryAt);

    await db
      .update(webhookDeliveries)
      .set({
        status: shouldRetry ? "FAILED" : "DEAD_LETTER",
        responseCode: input.responseCode,
        responseBodySnippet: input.responseBodySnippet ?? null,
        nextRetryAt,
      })
      .where(eq(webhookDeliveries.id, input.deliveryId));

    if (shouldRetry && nextRetryAt) {
      await db.insert(webhookDeliveries).values({
        eventId: delivery.eventId,
        endpointId: delivery.endpointId,
        attempt: nextAttempt,
        status: "PENDING",
        nextRetryAt,
      });
    }

    return {
      ok: true,
      status: shouldRetry ? "FAILED" : "DEAD_LETTER",
      retryScheduled: shouldRetry,
      nextRetryAt: nextRetryAt ? nextRetryAt.toISOString() : null,
    };
  } catch (error) {
    console.error("Failed to mark webhook delivery failure:", error);
    return {
      ok: false,
      message: "Unable to update delivery status right now.",
    };
  }
}

export async function createWebhookEndpoint(input: {
  organizationId: string;
  url: string;
  eventTypes: WebhookEventType[];
}): Promise<WebhookEndpointActionResult> {
  const parsed = createWebhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid webhook endpoint input.",
    };
  }

  const access = await requireOrganizationAdmin({
    organizationId: parsed.data.organizationId,
  });

  if (!access.ok) {
    return access;
  }

  const orgState = await ensureOrganizationExists(parsed.data.organizationId);
  if (!orgState.ok || !orgState.db || !orgState.organizationSlug) {
    return {
      ok: false,
      message: orgState.message,
    } as WebhookEndpointActionResult;
  }

  const secret = createWebhookSecret();
  const secretHash = hashWebhookSecret(secret);

  try {
    const [created] = await orgState.db
      .insert(webhookEndpoints)
      .values({
        organizationId: parsed.data.organizationId,
        url: parsed.data.url,
        secretHash,
        status: "ACTIVE",
      })
      .returning({ id: webhookEndpoints.id });

    if (!created) {
      return {
        ok: false,
        message: "Unable to create webhook endpoint right now.",
      };
    }

    await orgState.db.insert(webhookSubscriptions).values(
      parsed.data.eventTypes.map((eventType) => ({
        endpointId: created.id,
        eventType,
      })),
    );

    revalidateIntegrationsPaths(orgState.organizationSlug);

    return {
      ok: true,
      endpointId: created.id,
      secret,
    };
  } catch (error) {
    console.error("Failed to create webhook endpoint:", error);
    return {
      ok: false,
      message: "Unable to create webhook endpoint right now.",
    };
  }
}

export async function updateWebhookEndpoint(input: {
  organizationId: string;
  endpointId: string;
  url: string;
  status: "ACTIVE" | "PAUSED";
  eventTypes: WebhookEventType[];
}): Promise<WebhookEndpointActionResult> {
  const parsed = updateWebhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid webhook endpoint input.",
    };
  }

  const access = await requireOrganizationAdmin({
    organizationId: parsed.data.organizationId,
  });

  if (!access.ok) {
    return access;
  }

  const orgState = await ensureOrganizationExists(parsed.data.organizationId);
  if (!orgState.ok || !orgState.db || !orgState.organizationSlug) {
    return {
      ok: false,
      message: orgState.message,
    } as WebhookEndpointActionResult;
  }

  const [endpoint] = await orgState.db
    .select({ id: webhookEndpoints.id })
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, parsed.data.endpointId),
        eq(webhookEndpoints.organizationId, parsed.data.organizationId),
      ),
    )
    .limit(1);

  if (!endpoint) {
    return {
      ok: false,
      message: "Endpoint not found.",
    };
  }

  try {
    await orgState.db
      .update(webhookEndpoints)
      .set({
        url: parsed.data.url,
        status: parsed.data.status,
        updatedAt: new Date(),
      })
      .where(eq(webhookEndpoints.id, parsed.data.endpointId));

    await orgState.db
      .delete(webhookSubscriptions)
      .where(eq(webhookSubscriptions.endpointId, parsed.data.endpointId));

    await orgState.db.insert(webhookSubscriptions).values(
      parsed.data.eventTypes.map((eventType) => ({
        endpointId: parsed.data.endpointId,
        eventType,
      })),
    );

    revalidateIntegrationsPaths(orgState.organizationSlug);

    return {
      ok: true,
      endpointId: parsed.data.endpointId,
    };
  } catch (error) {
    console.error("Failed to update webhook endpoint:", error);
    return {
      ok: false,
      message: "Unable to update webhook endpoint right now.",
    };
  }
}

export async function deleteWebhookEndpoint(input: {
  organizationId: string;
  endpointId: string;
}): Promise<WebhookEndpointActionResult> {
  const parsed = deleteWebhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid endpoint delete input.",
    };
  }

  const access = await requireOrganizationAdmin({
    organizationId: parsed.data.organizationId,
  });

  if (!access.ok) {
    return access;
  }

  const orgState = await ensureOrganizationExists(parsed.data.organizationId);
  if (!orgState.ok || !orgState.db || !orgState.organizationSlug) {
    return {
      ok: false,
      message: orgState.message,
    } as WebhookEndpointActionResult;
  }

  try {
    await orgState.db
      .update(webhookEndpoints)
      .set({
        status: "PAUSED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(webhookEndpoints.id, parsed.data.endpointId),
          eq(webhookEndpoints.organizationId, parsed.data.organizationId),
        ),
      );

    await orgState.db
      .delete(webhookSubscriptions)
      .where(eq(webhookSubscriptions.endpointId, parsed.data.endpointId));

    revalidateIntegrationsPaths(orgState.organizationSlug);

    return {
      ok: true,
      endpointId: parsed.data.endpointId,
      message: "Endpoint paused and subscriptions removed.",
    };
  } catch (error) {
    console.error("Failed to delete webhook endpoint:", error);
    return {
      ok: false,
      message: "Unable to delete webhook endpoint right now.",
    };
  }
}

export async function rotateWebhookEndpointSecret(input: {
  organizationId: string;
  endpointId: string;
}): Promise<WebhookEndpointActionResult> {
  const parsed = rotateWebhookEndpointSecretSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid secret rotation input.",
    };
  }

  const access = await requireOrganizationAdmin({
    organizationId: parsed.data.organizationId,
  });

  if (!access.ok) {
    return access;
  }

  const orgState = await ensureOrganizationExists(parsed.data.organizationId);
  if (!orgState.ok || !orgState.db || !orgState.organizationSlug) {
    return {
      ok: false,
      message: orgState.message,
    } as WebhookEndpointActionResult;
  }

  const secret = createWebhookSecret();
  const secretHash = hashWebhookSecret(secret);

  try {
    await orgState.db
      .update(webhookEndpoints)
      .set({
        secretHash,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(webhookEndpoints.id, parsed.data.endpointId),
          eq(webhookEndpoints.organizationId, parsed.data.organizationId),
        ),
      );

    revalidateIntegrationsPaths(orgState.organizationSlug);

    return {
      ok: true,
      endpointId: parsed.data.endpointId,
      secret,
    };
  } catch (error) {
    console.error("Failed to rotate webhook endpoint secret:", error);
    return {
      ok: false,
      message: "Unable to rotate endpoint secret right now.",
    };
  }
}

export async function replayWebhookDelivery(input: {
  organizationId: string;
  deliveryId: string;
}): Promise<WebhookEndpointActionResult> {
  const parsed = replayWebhookDeliverySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid replay input.",
    };
  }

  const access = await requireOrganizationAdmin({
    organizationId: parsed.data.organizationId,
  });

  if (!access.ok) {
    return access;
  }

  const orgState = await ensureOrganizationExists(parsed.data.organizationId);
  if (!orgState.ok || !orgState.db || !orgState.organizationSlug) {
    return {
      ok: false,
      message: orgState.message,
    } as WebhookEndpointActionResult;
  }

  const [delivery] = await orgState.db
    .select({
      id: webhookDeliveries.id,
      eventId: webhookDeliveries.eventId,
      endpointId: webhookDeliveries.endpointId,
      attempt: webhookDeliveries.attempt,
      status: webhookDeliveries.status,
    })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      eq(webhookDeliveries.endpointId, webhookEndpoints.id),
    )
    .where(
      and(
        eq(webhookDeliveries.id, parsed.data.deliveryId),
        eq(webhookEndpoints.organizationId, parsed.data.organizationId),
      ),
    )
    .limit(1);

  if (!delivery) {
    return {
      ok: false,
      message: "Delivery not found.",
    };
  }

  if (delivery.status === "SUCCESS") {
    return {
      ok: false,
      message: "Successful deliveries cannot be replayed.",
    };
  }

  try {
    await orgState.db.insert(webhookDeliveries).values({
      eventId: delivery.eventId,
      endpointId: delivery.endpointId,
      attempt: delivery.attempt + 1,
      status: "PENDING",
    });

    revalidateIntegrationsPaths(orgState.organizationSlug);

    return {
      ok: true,
      message: "Replay queued.",
    };
  } catch (error) {
    console.error("Failed to replay webhook delivery:", error);
    return {
      ok: false,
      message: "Unable to replay delivery right now.",
    };
  }
}

export async function listOrganizationWebhookDeliveryQueue(input: {
  organizationId: string;
}) {
  const parsed = z
    .object({ organizationId: z.string().uuid() })
    .safeParse(input);

  if (!parsed.success) {
    return [] as Array<{
      id: string;
      endpointId: string;
      endpointUrl: string;
      eventId: string;
      eventType: string;
      attempt: number;
      status: "PENDING" | "SUCCESS" | "FAILED" | "DEAD_LETTER";
      responseCode: number | null;
      responseBodySnippet: string | null;
      nextRetryAt: Date | null;
      deliveredAt: Date | null;
      createdAt: Date;
    }>;
  }

  const db = getDb();
  if (!db) {
    return [];
  }

  return db
    .select({
      id: webhookDeliveries.id,
      endpointId: webhookEndpoints.id,
      endpointUrl: webhookEndpoints.url,
      eventId: webhookEvents.id,
      eventType: webhookEvents.eventType,
      attempt: webhookDeliveries.attempt,
      status: webhookDeliveries.status,
      responseCode: webhookDeliveries.responseCode,
      responseBodySnippet: webhookDeliveries.responseBodySnippet,
      nextRetryAt: webhookDeliveries.nextRetryAt,
      deliveredAt: webhookDeliveries.deliveredAt,
      createdAt: webhookDeliveries.createdAt,
    })
    .from(webhookDeliveries)
    .innerJoin(webhookEvents, eq(webhookDeliveries.eventId, webhookEvents.id))
    .innerJoin(
      webhookEndpoints,
      eq(webhookDeliveries.endpointId, webhookEndpoints.id),
    )
    .where(eq(webhookEndpoints.organizationId, parsed.data.organizationId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(200);
}

export async function listOrganizationWebhookEndpoints(input: {
  organizationId: string;
}) {
  const parsed = z
    .object({ organizationId: z.string().uuid() })
    .safeParse(input);

  if (!parsed.success) {
    return [] as Array<{
      id: string;
      url: string;
      status: "ACTIVE" | "PAUSED";
      createdAt: Date;
      updatedAt: Date;
      eventTypes: WebhookEventType[];
    }>;
  }

  const db = getDb();
  if (!db) {
    return [];
  }

  const endpointRows = await db
    .select({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      status: webhookEndpoints.status,
      createdAt: webhookEndpoints.createdAt,
      updatedAt: webhookEndpoints.updatedAt,
    })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.organizationId, parsed.data.organizationId))
    .orderBy(desc(webhookEndpoints.createdAt));

  if (endpointRows.length === 0) {
    return [];
  }

  const endpointIds = endpointRows.map((row) => row.id);
  const subscriptionRows = await db
    .select({
      endpointId: webhookSubscriptions.endpointId,
      eventType: webhookSubscriptions.eventType,
    })
    .from(webhookSubscriptions)
    .where(inArray(webhookSubscriptions.endpointId, endpointIds));

  const subscriptionsByEndpoint = new Map<string, WebhookEventType[]>();
  for (const subscription of subscriptionRows) {
    const current = subscriptionsByEndpoint.get(subscription.endpointId) ?? [];
    subscriptionsByEndpoint.set(subscription.endpointId, [
      ...current,
      subscription.eventType as WebhookEventType,
    ]);
  }

  return endpointRows.map((row) => ({
    ...row,
    eventTypes: subscriptionsByEndpoint.get(row.id) ?? [],
  }));
}
