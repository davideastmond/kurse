import { WEBHOOK_DELIVERY_BACKOFF_STEPS } from "@/app/utils/webhooks/definitions";

export function getWebhookRetryDelayMs(attempt: number) {
  const step = WEBHOOK_DELIVERY_BACKOFF_STEPS.find(
    (entry) => entry.attempt === attempt,
  );

  return step?.delayMs ?? null;
}

export function getNextWebhookRetryAt(input: { attempt: number; now?: Date }) {
  const delayMs = getWebhookRetryDelayMs(input.attempt);

  if (delayMs === null) {
    return null;
  }

  const now = input.now ?? new Date();
  return new Date(now.getTime() + delayMs);
}
