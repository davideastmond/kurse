"use client";

import { EndpointFormProps } from "./definitions";

export default function EndpointForm({
  mode,
  values,
  onUrlChange,
  onStatusChange,
  onSubmit,
  isPending,
}: EndpointFormProps) {
  const buttonLabel = mode === "create" ? "Create endpoint" : "Save endpoint";

  return (
    <section className="space-y-3 rounded-xl border border-border bg-background p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Endpoint configuration
      </h3>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        URL
        <input
          type="url"
          value={values.url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://example.com/webhooks/kurse"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-1"
          disabled={isPending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Status
        <select
          value={values.status}
          onChange={(event) =>
            onStatusChange(event.target.value as "ACTIVE" | "PAUSED")
          }
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-1"
          disabled={isPending}
        >
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
        </select>
      </label>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {buttonLabel}
      </button>
    </section>
  );
}
