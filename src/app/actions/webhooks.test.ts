import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth/session", () => ({
  getSessionSafely: vi.fn(),
}));

vi.mock("@/auth/auth", () => ({
  requireOrganizationAdminOrOwner: vi.fn(),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db/schema", () => ({
  organizations: {
    id: "organizations.id",
    slug: "organizations.slug",
    status: "organizations.status",
  },
  webhookEndpoints: {
    id: "webhook_endpoints.id",
    organizationId: "webhook_endpoints.organization_id",
    status: "webhook_endpoints.status",
    url: "webhook_endpoints.url",
    createdAt: "webhook_endpoints.created_at",
    updatedAt: "webhook_endpoints.updated_at",
  },
  webhookSubscriptions: {
    endpointId: "webhook_subscriptions.endpoint_id",
    eventType: "webhook_subscriptions.event_type",
  },
  webhookEvents: {
    id: "webhook_events.id",
    eventType: "webhook_events.event_type",
  },
  webhookDeliveries: {
    id: "webhook_deliveries.id",
    eventId: "webhook_deliveries.event_id",
    endpointId: "webhook_deliveries.endpoint_id",
    attempt: "webhook_deliveries.attempt",
    status: "webhook_deliveries.status",
    createdAt: "webhook_deliveries.created_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ args })),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  desc: vi.fn((value: unknown) => ({ value })),
  inArray: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  isNull: vi.fn((value: unknown) => ({ value })),
}));

import { requireOrganizationAdminOrOwner } from "@/auth/auth";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { WebhookEventType } from "@/shared/types/webhook-events";
import {
  createWebhookEndpoint,
  markWebhookDeliveryFailure,
  replayWebhookDelivery,
} from "./webhooks";

const mockedGetSessionSafely = vi.mocked(getSessionSafely);
const mockedRequireOrganizationAdminOrOwner = vi.mocked(
  requireOrganizationAdminOrOwner,
);
const mockedGetDb = vi.mocked(getDb);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createWebhookEndpoint", () => {
  const validInput = {
    organizationId: "11111111-1111-4111-8111-111111111111",
    url: "https://example.com/hooks",
    eventTypes: ["enrollment.created"] as WebhookEventType[],
  };

  it("returns auth error when user is not signed in", async () => {
    mockedGetSessionSafely.mockResolvedValue(null as never);

    const result = await createWebhookEndpoint(validInput);

    expect(result).toEqual({
      ok: false,
      message: "You must be signed in to manage webhook endpoints.",
    });
  });

  it("returns access error when user lacks org admin privileges", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: false,
      message: "No access",
    });

    const result = await createWebhookEndpoint(validInput);

    expect(result).toEqual({ ok: false, message: "No access" });
  });
});

describe("replayWebhookDelivery", () => {
  it("does not replay successful deliveries", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "admin-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: true,
      role: "OWNER",
    });

    const dbMock = {
      select: vi
        .fn()
        .mockImplementationOnce(() => ({
          from: () => ({
            where: () => ({
              limit: async () => [{ id: "org-1", slug: "org" }],
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: async () => [
                  {
                    id: "delivery-1",
                    eventId: "event-1",
                    endpointId: "endpoint-1",
                    attempt: 1,
                    status: "SUCCESS",
                  },
                ],
              }),
            }),
          }),
        })),
      insert: vi.fn(),
    };

    mockedGetDb.mockReturnValue(dbMock as never);

    const result = await replayWebhookDelivery({
      organizationId: "11111111-1111-4111-8111-111111111111",
      deliveryId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result).toEqual({
      ok: false,
      message: "Successful deliveries cannot be replayed.",
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("does not replay deliveries outside the organization scope", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "admin-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: true,
      role: "ADMIN",
    });

    const dbMock = {
      select: vi
        .fn()
        .mockImplementationOnce(() => ({
          from: () => ({
            where: () => ({
              limit: async () => [{ id: "org-1", slug: "org" }],
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: async () => [],
              }),
            }),
          }),
        })),
      insert: vi.fn(),
    };

    mockedGetDb.mockReturnValue(dbMock as never);

    const result = await replayWebhookDelivery({
      organizationId: "11111111-1111-4111-8111-111111111111",
      deliveryId: "33333333-3333-4333-8333-333333333333",
    });

    expect(result).toEqual({
      ok: false,
      message: "Delivery not found.",
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });
});

describe("markWebhookDeliveryFailure", () => {
  it("schedules retry delivery when retry window exists", async () => {
    const dbMock = {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "delivery-1",
                eventId: "event-1",
                endpointId: "endpoint-1",
                attempt: 1,
              },
            ],
          }),
        }),
      })),
      update: vi.fn(() => ({
        set: () => ({
          where: async () => undefined,
        }),
      })),
      insert: vi.fn(() => ({
        values: async () => undefined,
      })),
    };

    mockedGetDb.mockReturnValue(dbMock as never);

    const result = await markWebhookDeliveryFailure({
      deliveryId: "11111111-1111-4111-8111-111111111111",
      responseCode: 500,
      responseBodySnippet: "internal error",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.retryScheduled).toBe(true);
    expect(result.status).toBe("FAILED");
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
  });

  it("marks as dead-letter when retries are exhausted", async () => {
    const dbMock = {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "delivery-2",
                eventId: "event-2",
                endpointId: "endpoint-2",
                attempt: 7,
              },
            ],
          }),
        }),
      })),
      update: vi.fn(() => ({
        set: () => ({
          where: async () => undefined,
        }),
      })),
      insert: vi.fn(() => ({
        values: async () => undefined,
      })),
    };

    mockedGetDb.mockReturnValue(dbMock as never);

    const result = await markWebhookDeliveryFailure({
      deliveryId: "44444444-4444-4444-8444-444444444444",
      responseCode: 429,
      responseBodySnippet: "too many requests",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.retryScheduled).toBe(false);
    expect(result.status).toBe("DEAD_LETTER");
    expect(dbMock.insert).not.toHaveBeenCalled();
  });
});
