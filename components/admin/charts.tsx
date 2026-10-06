import { cn } from "@/lib/utils";

type Day = { date: string; count: number };

function short(date: string) {
  try {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString([], { day: "numeric", month: "short", timeZone: "UTC" });
  } catch {
    return date;
  }
}

/** One bar per day. The label says the total so the chart reads without the picture. */
export function DayBars({ data, label }: { data: Day[]; label: string }) {
  const max = Math.max(1, ...data.map((day) => day.count));
  const total = data.reduce((sum, day) => sum + day.count, 0);
  return (
    <figure>
      <div
        role="img"
        aria-label={`${label}: ${total} in the last ${data.length} days`}
        className="flex h-28 items-end gap-[3px]"
      >
        {data.map((day) => (
          <div
            key={day.date}
            title={`${short(day.date)}: ${day.count}`}
            className="flex h-full flex-1 items-end"
          >
            <div
              className={cn("w-full rounded-t-sm", day.count ? "bg-neutral-950" : "bg-neutral-200")}
              style={{ height: day.count ? `${Math.max(8, (day.count / max) * 100)}%` : "3px" }}
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-[11px] text-neutral-400">
        <span>{short(data[0]?.date ?? "")}</span>
        <span className="font-semibold text-neutral-600">{total} total</span>
        <span>{short(data[data.length - 1]?.date ?? "")}</span>
      </figcaption>
    </figure>
  );
}

/** A labelled horizontal meter, 0 to 100. */
export function Meter({ percent, className }: { percent: number; className?: string }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 overflow-hidden rounded-full bg-neutral-100", className)}
    >
      <div className="h-full rounded-full bg-neutral-950" style={{ width: `${value}%` }} />
    </div>
  );
}
