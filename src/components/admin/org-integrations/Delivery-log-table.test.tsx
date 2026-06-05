import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DeliveryLogTable from "./Delivery-log-table";

describe("DeliveryLogTable", () => {
  it("shows replay controls only for failed and dead-letter deliveries", () => {
    const html = renderToStaticMarkup(
      <DeliveryLogTable
        deliveries={[
          {
            id: "delivery-failed",
            endpointId: "endpoint-1",
            endpointUrl: "https://example.com/failed",
            eventId: "event-1",
            eventType: "enrollment.created",
            attempt: 1,
            status: "FAILED",
            responseCode: 500,
            responseBodySnippet: "error",
            nextRetryAtIso: null,
            deliveredAtIso: null,
            createdAtIso: new Date("2026-01-01T00:00:00.000Z").toISOString(),
          },
          {
            id: "delivery-success",
            endpointId: "endpoint-2",
            endpointUrl: "https://example.com/success",
            eventId: "event-2",
            eventType: "course.completed",
            attempt: 1,
            status: "SUCCESS",
            responseCode: 200,
            responseBodySnippet: "ok",
            nextRetryAtIso: null,
            deliveredAtIso: new Date("2026-01-01T00:02:00.000Z").toISOString(),
            createdAtIso: new Date("2026-01-01T00:01:00.000Z").toISOString(),
          },
        ]}
        isPending={false}
        onReplay={() => {}}
      />,
    );

    expect(html).toContain("Replay");
    expect(html).toContain("No replay");
    expect(html).toContain("enrollment.created");
    expect(html).toContain("course.completed");
  });

  it("shows empty state when no deliveries exist", () => {
    const html = renderToStaticMarkup(
      <DeliveryLogTable
        deliveries={[]}
        isPending={false}
        onReplay={() => {}}
      />,
    );

    expect(html).toContain("No delivery attempts yet.");
  });
});
