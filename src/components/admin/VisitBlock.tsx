import { formatEuro, formatRange, formatVisitNumber } from "@/lib/scheduling";
import type { AdminVisit } from "@/lib/admin-types";
import { cn } from "@/lib/utils";

export function VisitBlock({
  visit,
  color,
  onClick,
  compact = false,
  style,
}: {
  visit: AdminVisit;
  color: string;
  onClick: () => void;
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  const grouped = visit.services.length > 1;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...style, borderLeftColor: color }}
      className={cn(
        "w-full overflow-hidden rounded-md border border-border border-l-4 bg-card px-2 py-1.5 text-left shadow-panel transition hover:shadow-lift",
        visit.status === "cancelled" && "opacity-50 line-through",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <span>{formatRange(visit.start_time, visit.end_time)}</span>
        {visit.express ? (
          <span className="rounded bg-express px-1 text-[10px] text-express-foreground">🚀</span>
        ) : null}
        {grouped ? (
          <span className="rounded bg-surface-strong px-1 text-[10px]">
            🔧 {visit.services.length}
          </span>
        ) : null}
      </div>
      <p className="truncate text-sm font-semibold leading-tight">
        {grouped
          ? `VISITA ${formatVisitNumber(visit.visit_number)}`
          : `${visit.services[0]?.service_name ?? "Visita"}`}
      </p>
      {!compact ? (
        <>
          <p className="truncate text-xs text-muted-foreground">
            {visit.customer?.name ?? "Cliente"}
          </p>
          {grouped ? (
            <ul className="mt-1 space-y-0.5">
              {visit.services.slice(0, 3).map((s) => (
                <li key={s.id} className="truncate text-[11px] text-muted-foreground">
                  • {s.service_name}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-1 text-xs font-semibold">{formatEuro(Number(visit.total))}</p>
        </>
      ) : null}
    </button>
  );
}
