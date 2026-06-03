"use client";

import { ReplayActionControlsProps } from "./definitions";

export default function ReplayActionControls({
  delivery,
  canReplay,
  isPending,
  onReplay,
}: ReplayActionControlsProps) {
  if (!canReplay) {
    return (
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        No replay
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => onReplay(delivery.id)}
      className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
    >
      Replay
    </button>
  );
}
