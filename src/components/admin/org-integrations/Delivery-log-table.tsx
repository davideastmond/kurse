"use client";

import ReplayActionControls from "./Replay-action-controls";
import { DeliveryLogTableProps } from "./definitions";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function canReplayStatus(
  status: "PENDING" | "SUCCESS" | "FAILED" | "DEAD_LETTER",
) {
  return status === "FAILED" || status === "DEAD_LETTER";
}

export default function DeliveryLogTable({
  deliveries,
  isPending,
  onReplay,
}: DeliveryLogTableProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <header>
        <h2 className="text-xl font-semibold text-foreground">Delivery logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View attempts, status, responses, and replay failed or dead-letter
          deliveries.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Endpoint</th>
              <th className="px-4 py-3">Attempt</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">HTTP</th>
              <th className="px-4 py-3">Next retry</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length > 0 ? (
              deliveries.map((delivery) => (
                <tr
                  key={delivery.id}
                  className="border-b border-border/70 align-top last:border-b-0"
                >
                  <td className="px-4 py-3 text-sm text-foreground">
                    <p className="font-medium">{delivery.eventType}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {delivery.eventId}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {delivery.endpointUrl}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {delivery.attempt}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">
                    {delivery.status}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {delivery.responseCode ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(delivery.nextRetryAtIso)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(delivery.createdAtIso)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReplayActionControls
                      delivery={delivery}
                      canReplay={canReplayStatus(delivery.status)}
                      isPending={isPending}
                      onReplay={onReplay}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  No delivery attempts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
