import type {
  BuildWebhookEnvelopeInput,
  BuiltWebhookEnvelope,
  WebhookPayloadJson,
} from "@/app/utils/webhooks/definitions";

export function buildWebhookEnvelope<TData = WebhookPayloadJson>(
  input: BuildWebhookEnvelopeInput<TData>,
): BuiltWebhookEnvelope<TData> {
  return {
    id: input.eventId,
    type: input.eventType,
    version: input.version,
    occurredAt: input.occurredAt.toISOString(),
    organizationId: input.organizationId,
    data: input.data,
  };
}
