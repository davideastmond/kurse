"use client";

import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  replayWebhookDelivery,
  rotateWebhookEndpointSecret,
  updateWebhookEndpoint,
} from "@/app/actions/webhooks";
import type { WebhookEventType } from "@/shared/types/webhook-events";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import DeliveryLogTable from "./Delivery-log-table";
import EndpointForm from "./Endpoint-form";
import EventSubscriptionChecklist from "./Event-subscription-checklist";
import {
  EndpointFormValues,
  IntegrationsManagerProps,
  WebhookEndpointView,
} from "./definitions";

function emptyEndpointForm(): EndpointFormValues {
  return {
    url: "",
    status: "ACTIVE",
  };
}

function byNewest(left: WebhookEndpointView, right: WebhookEndpointView) {
  return right.createdAtIso.localeCompare(left.createdAtIso);
}

export default function IntegrationsManager({
  organizationId,
  endpoints,
  deliveryLogs,
}: IntegrationsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    endpoints[0]?.id ?? null,
  );
  const [formValues, setFormValues] = useState<EndpointFormValues>(() =>
    endpoints[0]
      ? { url: endpoints[0].url, status: endpoints[0].status }
      : emptyEndpointForm(),
  );
  const [selectedEventTypes, setSelectedEventTypes] = useState<
    WebhookEventType[]
  >(endpoints[0]?.eventTypes ?? []);
  const [notice, setNotice] = useState<string | null>(null);
  const [secretNotice, setSecretNotice] = useState<string | null>(null);

  const endpointOptions = useMemo(
    () => [...endpoints].sort(byNewest),
    [endpoints],
  );

  const selectedEndpoint = endpointOptions.find(
    (endpoint) => endpoint.id === selectedEndpointId,
  );

  const isUpdateMode = Boolean(selectedEndpoint);

  const withAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      setNotice(null);
      await action();
      router.refresh();
    });
  };

  const syncFormWithEndpoint = (endpointId: string | null) => {
    if (!endpointId) {
      setSelectedEndpointId(null);
      setFormValues(emptyEndpointForm());
      setSelectedEventTypes([]);
      return;
    }

    const endpoint = endpointOptions.find((item) => item.id === endpointId);
    if (!endpoint) {
      setSelectedEndpointId(null);
      setFormValues(emptyEndpointForm());
      setSelectedEventTypes([]);
      return;
    }

    setSelectedEndpointId(endpoint.id);
    setFormValues({
      url: endpoint.url,
      status: endpoint.status,
    });
    setSelectedEventTypes(endpoint.eventTypes);
  };

  const toggleEventType = (eventType: WebhookEventType) => {
    setSelectedEventTypes((current) => {
      if (current.includes(eventType)) {
        return current.filter((entry) => entry !== eventType);
      }

      return [...current, eventType];
    });
  };

  const onSubmitEndpoint = () => {
    withAction(async () => {
      if (selectedEventTypes.length === 0) {
        setNotice("Select at least one event subscription.");
        return;
      }

      if (!formValues.url.trim()) {
        setNotice("Endpoint URL is required.");
        return;
      }

      if (!selectedEndpoint) {
        const createResult = await createWebhookEndpoint({
          organizationId,
          url: formValues.url,
          eventTypes: selectedEventTypes,
        });

        if (!createResult.ok) {
          setNotice(createResult.message);
          return;
        }

        if (createResult.secret) {
          setSecretNotice(`New endpoint secret: ${createResult.secret}`);
        }
        setNotice("Endpoint created.");
        setSelectedEndpointId(createResult.endpointId ?? null);
        return;
      }

      const updateResult = await updateWebhookEndpoint({
        organizationId,
        endpointId: selectedEndpoint.id,
        url: formValues.url,
        status: formValues.status,
        eventTypes: selectedEventTypes,
      });

      if (!updateResult.ok) {
        setNotice(updateResult.message);
        return;
      }

      setNotice("Endpoint updated.");
    });
  };

  const onRotateSecret = () => {
    if (!selectedEndpoint) {
      setNotice("Select an endpoint first.");
      return;
    }

    withAction(async () => {
      const result = await rotateWebhookEndpointSecret({
        organizationId,
        endpointId: selectedEndpoint.id,
      });

      if (!result.ok) {
        setNotice(result.message);
        return;
      }

      setNotice("Endpoint secret rotated.");
      if (result.secret) {
        setSecretNotice(`Rotated endpoint secret: ${result.secret}`);
      }
    });
  };

  const onPauseEndpoint = () => {
    if (!selectedEndpoint) {
      setNotice("Select an endpoint first.");
      return;
    }

    withAction(async () => {
      const result = await deleteWebhookEndpoint({
        organizationId,
        endpointId: selectedEndpoint.id,
      });

      if (!result.ok) {
        setNotice(result.message);
        return;
      }

      setNotice(result.message ?? "Endpoint paused.");
      syncFormWithEndpoint(null);
    });
  };

  const onReplay = (deliveryId: string) => {
    withAction(async () => {
      const result = await replayWebhookDelivery({
        organizationId,
        deliveryId,
      });

      if (!result.ok) {
        setNotice(result.message);
        return;
      }

      setNotice(result.message ?? "Replay queued.");
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <header className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Endpoints</h2>
          <p className="text-sm text-muted-foreground">
            Create or update webhook endpoints, rotate secrets, and manage
            subscriptions.
          </p>
        </header>

        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Existing endpoint
            <select
              value={selectedEndpointId ?? ""}
              onChange={(event) =>
                syncFormWithEndpoint(event.target.value || null)
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-1"
              disabled={isPending}
            >
              <option value="">Create new endpoint</option>
              {endpointOptions.map((endpoint) => (
                <option key={endpoint.id} value={endpoint.id}>
                  {endpoint.url} ({endpoint.status})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => syncFormWithEndpoint(null)}
            disabled={isPending}
            className="self-end rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            New endpoint
          </button>

          <button
            type="button"
            onClick={onRotateSecret}
            disabled={isPending || !isUpdateMode}
            className="self-end rounded-lg border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Rotate secret
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <EndpointForm
            mode={isUpdateMode ? "update" : "create"}
            values={formValues}
            onUrlChange={(url) =>
              setFormValues((current) => ({ ...current, url }))
            }
            onStatusChange={(status) =>
              setFormValues((current) => ({ ...current, status }))
            }
            onSubmit={onSubmitEndpoint}
            isPending={isPending}
          />

          <EventSubscriptionChecklist
            selectedEventTypes={selectedEventTypes}
            onToggleEventType={toggleEventType}
            isPending={isPending}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPauseEndpoint}
            disabled={isPending || !isUpdateMode}
            className="rounded-lg border border-danger/40 bg-danger/15 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Pause endpoint
          </button>
        </div>

        {secretNotice ? (
          <p className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-sm text-primary">
            {secretNotice}
          </p>
        ) : null}

        {notice ? (
          <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            {notice}
          </p>
        ) : null}
      </section>

      <DeliveryLogTable
        deliveries={deliveryLogs}
        isPending={isPending}
        onReplay={onReplay}
      />
    </div>
  );
}
