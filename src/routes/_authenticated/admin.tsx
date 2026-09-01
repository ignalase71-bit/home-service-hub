import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminOverview } from "@/lib/admin.functions";
import { CalendarBoard, type CalendarView } from "@/components/admin/CalendarBoard";
import type { AdminInstaller, AdminVisit } from "@/lib/admin-types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Panel de agenda | Telomontamos" },
      {
        name: "description",
        content:
          "Panel interno para gestionar visitas, instaladores y disponibilidad en Jerez de la Frontera.",
      },
      { property: "og:title", content: "Panel de agenda | Telomontamos" },
      {
        property: "og:description",
        content: "Gestión de visitas, instaladores y disponibilidad.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const toISO = (d: Date) => d.toISOString().slice(0, 10);

function startOfWeek(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toISO(d);
}

const VIEWS: CalendarView[] = ["day", "week", "month", "list"];
const VIEW_LABEL: Record<CalendarView, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
  list: "Lista",
};

function AdminPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
          <TabsTrigger value="servicios">Trabajos</TabsTrigger>
        </TabsList>
        <TabsContent value="agenda" className="mt-6">
          <AgendaPanel />
        </TabsContent>
        <TabsContent value="solicitudes" className="mt-6">
          <RequestsManager />
        </TabsContent>
        <TabsContent value="servicios" className="mt-6">
          <ServicesManager />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function AgendaPanel() {
  const overview = useServerFn(adminOverview);
  const [view, setView] = useState<CalendarView>("day");
  const [date, setDate] = useState(toISO(new Date()));
  const [selected, setSelected] = useState<AdminVisit | null>(null);

  const weekStart = startOfWeek(date);
  const range = useMemo(() => {
    if (view === "day") return { fromDate: date, toDate: date };
    if (view === "week") {
      const end = new Date(`${weekStart}T00:00:00`);
      end.setDate(end.getDate() + 6);
      return { fromDate: weekStart, toDate: toISO(end) };
    }
    const d = new Date(`${date}T00:00:00`);
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { fromDate: toISO(from), toDate: toISO(to) };
  }, [view, date, weekStart]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview", range.fromDate, range.toDate],
    queryFn: () => overview({ data: range }),
  });

  const installers = (data?.installers ?? []) as AdminInstaller[];
  const visits = (data?.visits ?? []) as AdminVisit[];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Agenda de instaladores</h1>
          <p className="text-sm text-muted-foreground">
            {range.fromDate} → {range.toDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          {VIEWS.map((v) => (
            <Button
              key={v}
              size="sm"
              variant={v === view ? "default" : "outline"}
              onClick={() => setView(v)}
            >
              {VIEW_LABEL[v]}
            </Button>
          ))}
        </div>
      </header>

      {isLoading ? <p className="text-sm text-muted-foreground">Cargando agenda…</p> : null}
      {error ? (
        <p className="text-sm text-destructive">No se pudo cargar la agenda.</p>
      ) : null}

      <CalendarBoard
        view={view}
        date={date}
        weekStart={weekStart}
        installers={installers}
        visits={visits}
        onSelect={setSelected}
        onSelectDay={(d) => {
          setDate(d);
          setView("day");
        }}
      />

      {selected ? (
        <section className="rounded-lg border border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl">Visita #{selected.visit_number}</h2>
              <p className="text-sm text-muted-foreground">
                {selected.visit_date} · {selected.start_time.slice(0, 5)}–
                {selected.end_time.slice(0, 5)} · {selected.customer?.name ?? "Cliente"}
              </p>
              <p className="text-sm text-muted-foreground">{selected.address ?? ""}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Cerrar
            </Button>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {selected.services.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>
                  {s.service_name} × {s.quantity}
                </span>
                <span>{s.subtotal.toFixed(2)} €</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-right font-display text-lg">
            Total {selected.total.toFixed(2)} €
          </p>
        </section>
      ) : null}
    </main>
  );
}
