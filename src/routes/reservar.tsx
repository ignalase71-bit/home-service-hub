import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  createBookingRequest,
  getCatalog,
  getPublicAvailability,
} from "@/lib/public.functions";
import { formatDateES, formatEuro, formatRange, formatVisitNumber, todayISO } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: () => getCatalog() });

export const Route = createFileRoute("/reservar")({
  head: () => ({
    meta: [
      { title: "Reservar instalación en Jerez | Instalia Jerez" },
      {
        name: "description",
        content:
          "Elige tus servicios, comprueba huecos reales y reserva tu instalación en Jerez y alrededores. Agrupamos varios trabajos en una única visita.",
      },
      { property: "og:title", content: "Reservar instalación | Instalia Jerez" },
      {
        property: "og:description",
        content: "Huecos reales de agenda, precio cerrado y opción Express en 24 h.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQuery);
  },
  component: BookingPage,
});

type Slot = { startTime: string; endTime: string };

function BookingPage() {
  const { data: catalog } = useSuspenseQuery(catalogQuery);
  const availabilityFn = useServerFn(getPublicAvailability);
  const bookFn = useServerFn(createBookingRequest);

  const [selected, setSelected] = useState<string[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [express, setExpress] = useState(false);
  const [slot, setSlot] = useState<{ date: string; slot: Slot } | null>(null);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "Jerez de la Frontera",
    postalCode: "",
    notes: "",
  });
  const [confirmation, setConfirmation] = useState<{
    visitNumber: number;
    date: string;
    startTime: string;
    endTime: string;
    total: number;
  } | null>(null);

  const chosenServices = catalog.services.filter((s) => selected.includes(s.id));
  const expressPossible = chosenServices.some((s) => s.express_available);

  const availability = useQuery({
    queryKey: ["availability", selected, distanceKm, express],
    enabled: selected.length > 0,
    queryFn: () =>
      availabilityFn({
        data: {
          serviceIds: selected,
          distanceKm,
          express,
          fromDate: todayISO(),
          days: 14,
        },
      }),
  });

  const booking = useMutation({
    mutationFn: bookFn,
    onSuccess: (result) => {
      setConfirmation({
        visitNumber: result.visitNumber,
        date: result.date,
        startTime: result.startTime,
        endTime: result.endTime,
        total: result.totals.total,
      });
      toast.success("Solicitud registrada");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Error al reservar"),
  });

  const zone = useMemo(
    () => catalog.zones.find((z) => distanceKm <= z.max_km) ?? catalog.zones.at(-1) ?? null,
    [catalog.zones, distanceKm],
  );

  const toggle = (id: string) => {
    setSlot(null);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (confirmation) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="panel p-8 text-center">
          <p className="text-eyebrow">Solicitud recibida</p>
          <h1 className="mt-2 text-3xl font-bold">
            Visita {formatVisitNumber(confirmation.visitNumber)}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {formatDateES(confirmation.date)} ·{" "}
            {formatRange(confirmation.startTime, confirmation.endTime)}
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-primary">
            {formatEuro(confirmation.total)}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Te confirmaremos por teléfono la asignación del técnico. Todos los trabajos elegidos se
            realizarán en esta única visita.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link to="/" className="text-sm text-muted-foreground underline">
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Reserva tu instalación</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          {/* 1. Servicios */}
          <section className="panel p-5">
            <p className="text-eyebrow">Paso 1</p>
            <h2 className="text-xl font-bold">Elige los servicios</h2>
            <div className="mt-4 space-y-6">
              {catalog.categories.map((category) => {
                const services = catalog.services.filter((s) => s.category_id === category.id);
                if (services.length === 0) return null;
                return (
                  <div key={category.id}>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      {category.name}
                    </h3>
                    <div className="mt-2 grid gap-2">
                      {services.map((service) => {
                        const active = selected.includes(service.id);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggle(service.id)}
                            className={`flex items-center justify-between rounded-md border p-3 text-left transition ${
                              active
                                ? "border-primary bg-accent"
                                : "border-border hover:border-primary/60"
                            }`}
                          >
                            <span>
                              <span className="block text-sm font-semibold">
                                {service.emoji ? `${service.emoji} ` : ""}
                                {service.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {service.duration_minutes} min · +{service.addon_duration_minutes}{" "}
                                min si se añade a otra visita
                              </span>
                            </span>
                            <span className="font-semibold">{formatEuro(service.base_price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {selected.length > 1 ? (
              <p className="mt-4 rounded-md bg-success/10 p-3 text-sm text-foreground">
                ✅ Podemos realizar estos trabajos en una única visita: pagas un solo
                desplazamiento y el tiempo añadido es reducido.
              </p>
            ) : null}
          </section>

          {/* 2. Dirección y distancia */}
          <section className="panel p-5">
            <p className="text-eyebrow">Paso 2</p>
            <h2 className="text-xl font-bold">Dónde y cuándo</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="distance">Distancia desde Jerez (km)</Label>
                <Input
                  id="distance"
                  type="number"
                  min={0}
                  max={35}
                  value={distanceKm}
                  onChange={(e) => {
                    setSlot(null);
                    setDistanceKm(Number(e.target.value));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Zona: {zone?.name ?? "—"} · desplazamiento{" "}
                  {zone ? formatEuro(zone.fee) : "—"} por visita
                </p>
              </div>
              <div className="space-y-2">
                <Label>Servicio Express (24 h)</Label>
                <div className="flex items-center gap-3 rounded-md border border-border p-3">
                  <Switch
                    checked={express}
                    disabled={!expressPossible}
                    onCheckedChange={(v) => {
                      setSlot(null);
                      setExpress(v);
                    }}
                  />
                  <span className="text-sm">
                    {expressPossible
                      ? "Buscar solo huecos en las próximas 24 h"
                      : "No disponible para estos servicios"}
                  </span>
                </div>
              </div>
            </div>

            {selected.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Selecciona al menos un servicio para ver la disponibilidad real.
              </p>
            ) : availability.isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Calculando huecos reales…</p>
            ) : availability.isError ? (
              <p className="mt-4 text-sm text-destructive">
                {availability.error instanceof Error
                  ? availability.error.message
                  : "No se pudo calcular la disponibilidad"}
              </p>
            ) : availability.data && availability.data.days.length === 0 ? (
              <p className="mt-4 rounded-md bg-warning/15 p-3 text-sm">
                {express
                  ? "🚀 Express no disponible actualmente: no hay técnico compatible libre en las próximas 24 h."
                  : "No hay huecos en los próximos días para esta combinación de servicios."}
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Duración estimada de la visita: {availability.data?.durationMinutes} min
                </p>
                {availability.data?.days.map((day) => (
                  <div key={day.date}>
                    <p className="text-sm font-semibold capitalize">{formatDateES(day.date)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {day.slots.map((s) => {
                        const active = slot?.date === day.date && slot.slot.startTime === s.startTime;
                        return (
                          <button
                            key={s.startTime}
                            type="button"
                            onClick={() => setSlot({ date: day.date, slot: s })}
                            className={`rounded-md border px-3 py-1.5 text-sm transition ${
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary"
                            }`}
                          >
                            {formatRange(s.startTime, s.endTime)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Datos */}
          <section className="panel p-5">
            <p className="text-eyebrow">Paso 3</p>
            <h2 className="text-xl font-bold">Tus datos</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "Nombre y apellidos"],
                  ["phone", "Teléfono"],
                  ["email", "Email (opcional)"],
                  ["address", "Dirección"],
                  ["city", "Localidad"],
                  ["postalCode", "Código postal"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    value={customer[key]}
                    onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Detalles del trabajo</Label>
                <Textarea
                  id="notes"
                  value={customer.notes}
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Resumen */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="panel p-5">
            <h2 className="text-lg font-bold">Resumen</h2>
            <div className="mt-4 space-y-2 text-sm">
              {chosenServices.length === 0 ? (
                <p className="text-muted-foreground">Sin servicios seleccionados.</p>
              ) : (
                chosenServices.map((s) => (
                  <div key={s.id} className="flex justify-between gap-2">
                    <span>{s.name}</span>
                    <span>{formatEuro(s.base_price)}</span>
                  </div>
                ))
              )}
            </div>
            <Separator className="my-4" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Servicios</span>
                <span>{formatEuro(availability.data?.totals.servicesTotal ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Express</span>
                <span>{formatEuro(availability.data?.totals.expressTotal ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Desplazamiento (1 por visita)</span>
                <span>{formatEuro(availability.data?.distanceFee ?? zone?.fee ?? 0)}</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl font-bold text-primary">
                {formatEuro(availability.data?.totals.total ?? 0)}
              </span>
            </div>
            {slot ? (
              <Badge className="mt-4" variant="secondary">
                {formatDateES(slot.date)} · {formatRange(slot.slot.startTime, slot.slot.endTime)}
              </Badge>
            ) : null}
            <Button
              className="mt-5 w-full"
              disabled={
                booking.isPending ||
                !slot ||
                selected.length === 0 ||
                customer.name.length < 2 ||
                customer.phone.length < 6 ||
                customer.address.length < 4
              }
              onClick={() => {
                if (!slot) return;
                booking.mutate({
                  data: {
                    customer: {
                      name: customer.name,
                      phone: customer.phone,
                      email: customer.email,
                      address: customer.address,
                      city: customer.city,
                      postalCode: customer.postalCode,
                      notes: customer.notes,
                    },
                    serviceIds: selected,
                    distanceKm,
                    express,
                    date: slot.date,
                    startTime: slot.slot.startTime,
                  },
                });
              }}
            >
              {booking.isPending ? "Enviando…" : "Confirmar solicitud"}
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
