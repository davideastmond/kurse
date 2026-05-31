import { SeatUtilizationCardProps } from "./definitions";

function toPercent(usedSeats: number, totalSeats: number) {
  if (totalSeats <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((usedSeats / totalSeats) * 100));
}

export default function SeatUtilizationCard({
  totalSeats,
  usedSeats,
  memberCount,
}: SeatUtilizationCardProps) {
  const utilization = toPercent(usedSeats, totalSeats);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Seat utilization
      </h2>
      <p className="mt-3 text-3xl font-semibold text-foreground">
        {usedSeats}/{totalSeats}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {utilization}% used across {memberCount} active members
      </p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${utilization}%` }}
        />
      </div>
    </section>
  );
}
