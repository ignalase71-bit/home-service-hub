import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getCatalog } from "@/lib/public.functions";
import { formatEuro } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Instalia Jerez | Instalación de aire, fontanería y electricidad" },
      {
        name: "description",
        content:
          "Instaladores profesionales en Jerez de la Frontera. Precio cerrado, cita en el día con servicio Express y varios trabajos en una sola visita.",
      },
      { property: "og:title", content: "Instalia Jerez | Instaladores profesionales" },
      {
        property: "og:description",
        content:
          "Reserva instalación de climatización, fontanería o electricidad con precio cerrado y cita confirmada.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQuery);
  },
  component: Landing,
});

function Landing() {
  const { data } = useSuspenseQuery(catalogQuery);

  return (
    <main>
      <header className="gradient-hero px-6 py-20 text-secondary-foreground">
        <div className="mx-auto max-w-5xl">
          <p className="text-eyebrow text-primary">Jerez de la Frontera</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight md:text-6xl">
            Instaladores profesionales con precio cerrado y cita confirmada
          </h1>
          <p className="mt-5 max-w-xl text-lg opacity-90">
            Elige tus servicios, comprueba huecos reales de agenda y reserva. Si necesitas varios
            trabajos, los agrupamos en una sola visita y pagas un único desplazamiento.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/reservar">Ver disponibilidad y reservar</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Acceso equipo</Link>
            </Button>
          </div>
          <dl className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              ["Servicio Express", "Cita en menos de 24 h cuando hay hueco disponible."],
              ["Una sola visita", "Varios trabajos agrupados con un único desplazamiento."],
              ["Precio transparente", "Mano de obra, extras y desplazamiento antes de confirmar."],
            ].map(([title, text]) => (
              <div key={title}>
                <dt className="font-semibold">{title}</dt>
                <dd className="mt-1 text-sm opacity-80">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-eyebrow">Catálogo</p>
        <h2 className="mt-2 text-3xl font-bold">Servicios y precios</h2>
        <div className="mt-8 space-y-10">
          {data.categories.map((category) => {
            const services = data.services.filter((s) => s.category_id === category.id);
            if (services.length === 0) return null;
            return (
              <div key={category.id}>
                <h3 className="text-xl font-bold">{category.name}</h3>
                {category.description ? (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {services.map((service) => (
                    <article key={service.id} className="panel p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-semibold">
                            {service.emoji ? `${service.emoji} ` : ""}
                            {service.name}
                          </h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {Math.round(service.duration_minutes / 60 * 10) / 10} h aprox.
                            {service.express_available ? " · Express disponible" : ""}
                          </p>
                        </div>
                        <span className="whitespace-nowrap font-display text-lg font-bold text-primary">
                          {formatEuro(service.base_price)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-surface px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-eyebrow">Zonas y desplazamiento</p>
          <h2 className="mt-2 text-3xl font-bold">Coste según distancia</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {data.zones.map((zone) => (
              <div key={zone.id} className="panel p-4">
                <Badge variant="secondary">{zone.name}</Badge>
                <p className="mt-3 text-sm text-muted-foreground">Hasta {zone.max_km} km</p>
                <p className="font-display text-xl font-bold">
                  {zone.fee === 0 ? "Incluido" : formatEuro(zone.fee)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            El desplazamiento se cobra una sola vez por visita, aunque incluya varios trabajos.
          </p>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10 text-sm text-muted-foreground">
        <div className="mx-auto max-w-5xl">Instalia Jerez · Servicio profesional a domicilio</div>
      </footer>
    </main>
  );
}
