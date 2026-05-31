export const webhookEventTypes = [
  "enrollment.created",
  "lesson.completed",
  "evaluation.submitted",
  "evaluation.passed",
  "evaluation.failed",
  "course.completed",
  "certificate.issued",
  "organization.member.invited",
  "organization.member.joined",
] as const;

export type WebhookEventType = (typeof webhookEventTypes)[number];

export type WebhookEventVersion = "2026-05-01";

export interface WebhookEnvelope<TData = unknown> {
  id: string;
  type: WebhookEventType;
  version: WebhookEventVersion;
  occurredAt: string;
  organizationId: string | null;
  data: TData;
}
