import type {
  WebhookEnvelope,
  WebhookEventType,
  WebhookEventVersion,
} from "@/shared/types/webhook-events";

export type WebhookPayloadJson = Record<string, unknown>;

export type BuildWebhookEnvelopeInput<TData = WebhookPayloadJson> = {
  eventId: string;
  eventType: WebhookEventType;
  organizationId: string | null;
  occurredAt: Date;
  version: WebhookEventVersion;
  data: TData;
};

export type WebhookDeliveryBackoffStep = {
  attempt: number;
  delayMs: number;
};

export const WEBHOOK_EVENT_VERSION: WebhookEventVersion = "2026-05-01";

export const WEBHOOK_DELIVERY_BACKOFF_STEPS: WebhookDeliveryBackoffStep[] = [
  { attempt: 1, delayMs: 1 * 60 * 1000 },
  { attempt: 2, delayMs: 5 * 60 * 1000 },
  { attempt: 3, delayMs: 15 * 60 * 1000 },
  { attempt: 4, delayMs: 60 * 60 * 1000 },
  { attempt: 5, delayMs: 6 * 60 * 60 * 1000 },
  { attempt: 6, delayMs: 24 * 60 * 60 * 1000 },
];

export type BuiltWebhookEnvelope<TData = WebhookPayloadJson> =
  WebhookEnvelope<TData>;
