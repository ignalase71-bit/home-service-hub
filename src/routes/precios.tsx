import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Check, Timer } from "lucide-react";

import { getCatalog } from "@/lib/public.functions";
import { formatEuro } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
});

export const Route = createFileRoute("/precios")({
  head: () => ({
    meta: [
      { title: "Precios transparentes y zonas de servicio | Instalia Jerez" },
      {
        name: "description",
        content:
          "Cómo calculamos el precio: mano de obra cerrada, desplazamiento según zona y recargo Express opcional. Todo visible antes de confirmar la cita.",
      },
      { property: "og:title", content: "Precios transparentes | Instalia Jerez" },
      {
        property: "og:description",
        content:
          "Mano de obra, desplazamiento y Express: el desglose completo antes de pagar, sin sorpresas.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQuery);
  },
  component: PreciosPage,
});

function PreciosPage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const expressServices = data.services.filter((s) => s.express_available);
  const expressFee = expressServices.length
    ? Math.min(...expressServices.map((s) => s.express_fee))
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <p className="text-eyebrow">Transparencia</p>
            <h1 className="text-display mt-4 max-w-3xl text-4xl md:text-5xl">
              Sabes lo que pagas antes de reservar.
            </h1>
            <p className="mt-5 max-w-xl text-muted-foreground">
              El precio se compone de tres cosas y las ves todas en pantalla: servicio,
              desplazamiento y Express si lo eliges.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Servicio",
                d: "Precio cerrado por trabajo, con duración estimada. Si sumas trabajos parecidos, el tiempo extra es menor.",
              },
              {
                n: "02",
                t: "Desplazamiento",
                d: "Una única vez por visita, según la zona. Aunque hagamos tres trabajos, se cobra un solo desplazamiento.",
              },
              {
                n: "03",
                t: "Express (opcional)",
                d: `Solo si quieres cita en menos de 24 h. Desde ${formatEuro(expressFee)} y siempre visible antes de confirmar.`,
              },
            ].map((item) => (
              <article key={item.n} className="panel p-7">
                <span className="font-display text-sm tracking-[0.2em] text-bronze">{item.n}</span>
                <h2 className="mt-3 font-display text-xl font-semibold">{item.t}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-surface py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-eyebrow">Zonas</p>
            <h2 className="text-display mt-3 text-3xl md:text-4xl">Desplazamiento por distancia</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.zones.map((zone) => (
                <div key={zone.id} className="panel flex items-baseline justify-between p-6">
                  <div>
                    <p className="font-display text-lg font-semibold">{zone.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Hasta {zone.max_km} km</p>
                  </div>
                  <p className="font-display text-xl font-semibold">
                    {zone.fee === 0 ? "Incluido" : formatEuro(zone.fee)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-display text-3xl">Siempre incluido</h2>
              <ul className="mt-6 space-y-3">
                {[
                  "Técnico verificado y asegurado",
                  "Franja horaria confirmada por escrito",
                  "Prueba de funcionamiento al terminar",
                  "Retirada de embalajes y limpieza de la zona",
                  "Garantía sobre la mano de obra",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-express/10 px-3 py-1 text-xs font-medium text-express">
                <Timer className="size-3.5" /> Express
              </span>
              <h2 className="text-display mt-5 text-2xl">¿Cuándo merece la pena?</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Cuando no puedes esperar: aire acondicionado en pleno agosto, termo sin agua
                caliente o una avería eléctrica. Buscamos el primer hueco libre en menos de 24 h y
                te mostramos el recargo exacto antes de confirmar.
              </p>
              <div className="mt-7">
                <Button asChild className="rounded-full px-6">
                  <Link to="/reservar">Ver mi precio final</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
