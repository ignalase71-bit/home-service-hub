import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getCatalog, getQuote, requestAssemblyDate } from "@/lib/public.functions";
import { formatEuro } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: () => getCatalog() });

export const Route = createFileRoute("/reservar")({
  head: () => ({
    meta: [
      { title: "Solicitar montaje en Jerez | TeLoMontamos.com" },
      {
        name: "description",
        content:
          "Elige tus trabajos y cantidades, acepta el presupuesto y te proponemos tres fechas de montaje para que elijas la que mejor te venga.",
      },
      { property: "og:title", content: "Solicitar montaje | TeLoMontamos.com" },
      {
        property: "og:description",
        content: "Presupuesto transparente, tres fechas a elegir y opción Express en 24 h.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQuery);
  },
  component: BookingPage,
});

function BookingPage() {
  const { data: catalog } = useSuspenseQuery(catalogQuery);
  const quoteFn = useServerFn(getQuote);
  const requestFn = useServerFn(requestAssemblyDate);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [distanceKm, setDistanceKm] = useState(0);
  const [express, setExpress] = useState(false);
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
    requestNumber: number;
    token: string;
    total: number;
  } | null>(null);

  const items = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([serviceId, quantity]) => ({ serviceId, quantity })),
    [quantities],
  );

  const chosenServices = catalog.services.filter((s) => (quantities[s.id] ?? 0) > 0);
  const expressPossible = chosenServices.some((s) => s.express_available);

  const quote = useQuery({
    queryKey: ["quote", items, distanceKm, express],
    enabled: items.length > 0,
    queryFn: () => quoteFn({ data: { items, distanceKm, express } }),
  });

  const request = useMutation({
    mutationFn: requestFn,
    onSuccess: (result) => {
      setConfirmation({
        requestNumber: result.requestNumber,
        token: result.token,
        total: result.totals.total,
      });
      toast.success("Solicitud registrada");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Error al enviar la solicitud"),
  });

  const zone = useMemo(
    () => catalog.zones.find((z) => distanceKm <= z.max_km) ?? catalog.zones.at(-1) ?? null,
    [catalog.zones, distanceKm],
  );

  const setQty = (id: string, qty: number) =>
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(50, qty);
      return next;
    });

  if (confirmation) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
          <div className="panel p-8 text-center">
            <p className="text-eyebrow">Solicitud recibida</p>
            <h1 className="text-display mt-2 text-3xl">
              Solicitud #{confirmation.requestNumber}
            </h1>
            <p className="mt-4 text-muted-foreground">
              Presupuesto aceptado por{" "}
              <strong className="text-foreground">{formatEuro(confirmation.total)}</strong>. Te
              propondremos tres fechas de montaje; recibirás un aviso y podrás elegir la que mejor
              te venga desde tu enlace de seguimiento.
            </p>
            <Button asChild className="mt-6 rounded-full px-6">
              <Link to="/solicitud/$token" params={{ token: confirmation.token }}>
                Ver mi solicitud
              </Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Guarda este enlace: es privado y te permite elegir la fecha del montaje.
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
        <p className="text-eyebrow">Configurador</p>
        <h1 className="text-display mt-3 text-4xl">Solicita tu montaje</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Elige los trabajos y las cantidades. Verás el presupuesto cerrado y, al aceptarlo, te
          propondremos tres fechas para que elijas.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-8">
            {/* 1. Trabajos */}
            <section className="panel p-5">
              <p className="text-eyebrow">Paso 1</p>
              <h2 className="text-xl font-bold">Elige los trabajos y cantidades</h2>
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
                          const qty = quantities[service.id] ?? 0;
                          return (
                            <div
                              key={service.id}
                              className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 transition ${
                                qty > 0 ? "border-primary bg-primary/5" : "border-border"
                              }`}
                            >
                              <span className="flex min-w-[12rem] flex-1 flex-col">
                                <span className="font-semibold">{service.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {service.duration_minutes} min · +
                                  {service.addon_duration_minutes} min por unidad añadida
                                </span>
                              </span>
                              <span className="font-semibold">
                                {formatEuro(service.base_price)}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  aria-label={`Quitar una unidad de ${service.name}`}
                                  onClick={() => setQty(service.id, qty - 1)}
                                  disabled={qty === 0}
                                >
                                  −
                                </Button>
                                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  aria-label={`Añadir una unidad de ${service.name}`}
                                  onClick={() => setQty(service.id, qty + 1)}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {chosenServices.length > 1 ? (
                <p className="mt-4 rounded-md bg-success/10 p-3 text-sm text-foreground">
                  ✅ Podemos realizar estos trabajos en una única visita: pagas un solo
                  desplazamiento y el tiempo añadido es reducido.
                </p>
              ) : null}
            </section>

            {/* 2. Dónde y Express */}
            <section className="panel p-5">
              <p className="text-eyebrow">Paso 2</p>
              <h2 className="text-xl font-bold">Dónde y con qué urgencia</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="distance">Distancia desde Jerez (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    min={0}
                    max={35}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
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
                      onCheckedChange={setExpress}
                    />
                    <span className="text-sm">
                      {expressPossible
                        ? "Montaje dentro de las próximas 24 h"
                        : "No disponible para estos trabajos"}
                    </span>
                  </div>
                </div>
              </div>
              {quote.data ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Duración estimada de la visita: {quote.data.durationMinutes} min
                </p>
              ) : null}
              {quote.isError ? (
                <p className="mt-4 text-sm text-destructive">
                  {quote.error instanceof Error
                    ? quote.error.message
                    : "No se pudo calcular el presupuesto"}
                </p>
              ) : null}
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
              <h2 className="text-lg font-bold">Presupuesto</h2>
              <div className="mt-4 space-y-2 text-sm">
                {chosenServices.length === 0 ? (
                  <p className="text-muted-foreground">Sin trabajos seleccionados.</p>
                ) : (
                  chosenServices.map((s) => (
                    <div key={s.id} className="flex justify-between gap-2">
                      <span>
                        {s.name} × {quantities[s.id]}
                      </span>
                      <span>{formatEuro(s.base_price * (quantities[s.id] ?? 1))}</span>
                    </div>
                  ))
                )}
              </div>
              <Separator className="my-4" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Trabajos</span>
                  <span>{formatEuro(quote.data?.totals.servicesTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Express</span>
                  <span>{formatEuro(quote.data?.totals.expressTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Desplazamiento (1 por visita)</span>
                  <span>{formatEuro(quote.data?.distanceFee ?? zone?.fee ?? 0)}</span>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-bold text-primary">
                  {formatEuro(quote.data?.totals.total ?? 0)}
                </span>
              </div>
              <Button
                className="mt-5 w-full"
                disabled={
                  request.isPending ||
                  items.length === 0 ||
                  !quote.data ||
                  customer.name.length < 2 ||
                  customer.phone.length < 6 ||
                  customer.address.length < 4
                }
                onClick={() =>
                  request.mutate({
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
                      items,
                      distanceKm,
                      express,
                    },
                  })
                }
              >
                {request.isPending ? "Enviando…" : "Aceptar presupuesto y pedir fecha"}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Sin compromiso: después de aceptar el presupuesto te proponemos tres fechas y tú
                eliges.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
