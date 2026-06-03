"use client";

import type { WebhookEventType } from "@/shared/types/webhook-events";
import { webhookEventTypes } from "@/shared/types/webhook-events";
import { EventSubscriptionChecklistProps } from "./definitions";

function humanizeEventType(eventType: string) {
  return eventType.replaceAll(".", " ");
}

export default function EventSubscriptionChecklist({
  selectedEventTypes,
  onToggleEventType,
  isPending,
}: EventSubscriptionChecklistProps) {
  const selected = new Set(selectedEventTypes);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-background p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Event subscriptions
      </h3>
      <div className="grid gap-2 md:grid-cols-2">
        {webhookEventTypes.map((eventType) => (
          <label
            key={eventType}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <input
              type="checkbox"
              checked={selected.has(eventType)}
              onChange={() => onToggleEventType(eventType as WebhookEventType)}
              disabled={isPending}
              className="h-4 w-4 rounded border-border"
            />
            <span className="font-medium capitalize">
              {humanizeEventType(eventType)}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
