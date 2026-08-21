import { useMemo } from "react";
import { addDays, formatDateES, toMinutes, weekdayOf } from "@/lib/scheduling";
import type { AdminInstaller, AdminVisit } from "@/lib/admin-types";
import { VisitBlock } from "./VisitBlock";

const DAY_START = 7 * 60;
const DAY_END = 21 * 60;
const PX_PER_MIN = 1.1;

export type CalendarView = "day" | "week" | "month" | "list";

const hours = Array.from(
  { length: (DAY_END - DAY_START) / 60 + 1 },
  (_, i) => DAY_START + i * 60,
);

const label = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`;

/** Vista día: una columna por instalador. Trabajos simultáneos coexisten. */
function DayGrid({
  date,
  installers,
  visits,
  onSelect,
}: {
  date: string;
  installers: AdminInstaller[];
  visits: AdminVisit[];
  onSelect: (visit: AdminVisit) => void;
}) {
  const dayVisits = visits.filter((v) => v.visit_date === date);
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[720px]">
        <div className="w-14 shrink-0 pt-10">
          {hours.map((h) => (
            <div
              key={h}
              style={{ height: 60 * PX_PER_MIN }}
              className="pr-2 text-right text-[11px] text-muted-foreground"
            >
              {label(h)}
            </div>
          ))}
        </div>
        <div className="flex flex-1 gap-2">
          {installers.map((installer) => {
            const own = dayVisits.filter((v) => v.installer_id === installer.id);
            return (
              <div key={installer.id} className="min-w-[180px] flex-1">
                <div className="flex h-10 items-center gap-2 border-b border-border pb-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: installer.color }}
                  />
                  <span className="truncate text-sm font-semibold uppercase tracking-wide">
                    {installer.name}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{own.length}</span>
                </div>
                <div
                  className="relative rounded-md bg-surface"
                  style={{ height: (DAY_END - DAY_START) * PX_PER_MIN }}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/60"
                      style={{ top: (h - DAY_START) * PX_PER_MIN }}
                    />
                  ))}
                  {own.map((visit) => (
                    <div
                      key={visit.id}
                      className="absolute inset-x-1"
                      style={{
                        top: (toMinutes(visit.start_time) - DAY_START) * PX_PER_MIN,
                        height: Math.max(
                          38,
                          (toMinutes(visit.end_time) - toMinutes(visit.start_time)) * PX_PER_MIN,
                        ),
                      }}
                    >
                      <VisitBlock
                        visit={visit}
                        color={installer.color}
                        onClick={() => onSelect(visit)}
                        style={{ height: "100%" }}
                      />
                    </div>
                  ))}
                  {own.length === 0 ? (
                    <p className="absolute inset-x-0 top-3 text-center text-[11px] text-muted-foreground">
                      Sin trabajos
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
          {installers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No hay instaladores que coincidan con el filtro.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WeekGrid({
  weekStart,
  installers,
  visits,
  onSelect,
}: {
  weekStart: string;
  installers: AdminInstaller[];
  visits: AdminVisit[];
  onSelect: (visit: AdminVisit) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[900px] grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day} className="rounded-md bg-surface p-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide">
              {new Date(`${day}T12:00:00Z`).toLocaleDateString("es-ES", {
                weekday: "short",
                day: "numeric",
              })}
            </p>
            <div className="space-y-3">
              {installers.map((installer) => {
                const own = visits.filter(
                  (v) => v.visit_date === day && v.installer_id === installer.id,
                );
                if (own.length === 0) return null;
                return (
                  <div key={installer.id} className="space-y-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: installer.color }}
                    >
                      {installer.name}
                    </p>
                    {own.map((visit) => (
                      <VisitBlock
                        key={visit.id}
                        visit={visit}
                        color={installer.color}
                        onClick={() => onSelect(visit)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  anchorDate,
  visits,
  installers,
  onSelectDay,
}: {
  anchorDate: string;
  visits: AdminVisit[];
  installers: AdminInstaller[];
  onSelectDay: (date: string) => void;
}) {
  const cells = useMemo(() => {
    const first = `${anchorDate.slice(0, 7)}-01`;
    const wd = weekdayOf(first);
    const start = addDays(first, wd === 0 ? -6 : 1 - wd);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [anchorDate]);
  const month = anchorDate.slice(0, 7);

  return (
    <div className="grid grid-cols-7 gap-1 text-xs">
      {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
        <div key={d} className="p-1 text-center font-semibold text-muted-foreground">
          {d}
        </div>
      ))}
      {cells.map((date) => {
        const dayVisits = visits.filter((v) => v.visit_date === date);
        const outside = !date.startsWith(month);
        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelectDay(date)}
            className={`min-h-20 rounded-md border border-border bg-card p-1 text-left transition hover:border-primary ${
              outside ? "opacity-40" : ""
            }`}
          >
            <span className="text-[11px] font-semibold">{Number(date.slice(-2))}</span>
            <div className="mt-1 flex flex-wrap gap-0.5">
              {dayVisits.slice(0, 8).map((v) => (
                <span
                  key={v.id}
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      installers.find((i) => i.id === v.installer_id)?.color ?? "#94a3b8",
                  }}
                />
              ))}
            </div>
            {dayVisits.length > 0 ? (
              <span className="mt-1 block text-[10px] text-muted-foreground">
                {dayVisits.length} visita{dayVisits.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ListView({
  visits,
  installers,
  onSelect,
}: {
  visits: AdminVisit[];
  installers: AdminInstaller[];
  onSelect: (visit: AdminVisit) => void;
}) {
  const sorted = [...visits].sort((a, b) =>
    `${a.visit_date}${a.start_time}`.localeCompare(`${b.visit_date}${b.start_time}`),
  );
  return (
    <div className="space-y-2">
      {sorted.map((visit) => {
        const installer = installers.find((i) => i.id === visit.installer_id);
        return (
          <div key={visit.id} className="flex flex-wrap items-center gap-3 rounded-md bg-surface p-3">
            <span className="w-40 text-xs text-muted-foreground">
              {formatDateES(visit.visit_date)}
            </span>
            <div className="min-w-[220px] flex-1">
              <VisitBlock
                visit={visit}
                color={installer?.color ?? "#94a3b8"}
                onClick={() => onSelect(visit)}
              />
            </div>
            <span className="text-xs font-semibold" style={{ color: installer?.color }}>
              {installer?.name ?? "Sin asignar"}
            </span>
          </div>
        );
      })}
      {sorted.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No hay visitas en este periodo.</p>
      ) : null}
    </div>
  );
}

export function CalendarBoard(props: {
  view: CalendarView;
  date: string;
  weekStart: string;
  installers: AdminInstaller[];
  visits: AdminVisit[];
  onSelect: (visit: AdminVisit) => void;
  onSelectDay: (date: string) => void;
}) {
  if (props.view === "day") {
    return (
      <DayGrid
        date={props.date}
        installers={props.installers}
        visits={props.visits}
        onSelect={props.onSelect}
      />
    );
  }
  if (props.view === "week") {
    return (
      <WeekGrid
        weekStart={props.weekStart}
        installers={props.installers}
        visits={props.visits}
        onSelect={props.onSelect}
      />
    );
  }
  if (props.view === "month") {
    return (
      <MonthGrid
        anchorDate={props.date}
        visits={props.visits}
        installers={props.installers}
        onSelectDay={props.onSelectDay}
      />
    );
  }
  return <ListView visits={props.visits} installers={props.installers} onSelect={props.onSelect} />;
}
