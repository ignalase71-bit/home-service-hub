import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";

import { getCatalog } from "@/lib/public.functions";
import { formatEuro } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

import catClima from "@/assets/cat-climatizacion.jpg";
import catMontaje from "@/assets/cat-montaje.jpg";
import catElectricidad from "@/assets/cat-electricidad.jpg";
import catFontaneria from "@/assets/cat-fontaneria.jpg";
import catCoche from "@/assets/cat-coche.jpg";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
});

const categoryArt: Record<string, string> = {
  climatizacion: catClima,
  "montaje-muebles": catMontaje,
  electricidad: catElectricidad,
  fontaneria: catFontaneria,
};

export const Route = createFileRoute("/servicios")({
  head: () => ({
    meta: [
      { title: "Servicios de instalación y montaje en Jerez | TeLoMontamos.com" },
      {
        name: "description",
        content:
          "Climatización, fontanería, electricidad y montaje de muebles a domicilio en Jerez. Precio por servicio, duración estimada y opción Express.",
      },
      { property: "og:title", content: "Servicios de instalación y montaje | TeLoMontamos.com" },
      {
        property: "og:description",
        content:
          "Catálogo completo con precio cerrado y duración estimada de cada instalación o montaje.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQuery);
  },
  component: ServiciosPage,
});

function ServiciosPage() {
  const { data } = useSuspenseQuery(catalogQuery);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <p className="text-eyebrow">Catálogo</p>
            <h1 className="text-display mt-4 max-w-3xl text-4xl md:text-5xl">
              Cada servicio, con su precio y su tiempo.
            </h1>
            <p className="mt-5 max-w-xl text-muted-foreground">
              Sin tarifas por hora abiertas. Eliges los trabajos que necesitas y los agrupamos en
              una sola visita con un único desplazamiento.
            </p>
          </div>
        </section>

        {data.categories.map((category) => {
          const services = data.services.filter((s) => s.category_id === category.id);
          if (services.length === 0) return null;
          const art = categoryArt[category.slug] ?? catCoche;
          return (
            <section key={category.id} className="mx-auto max-w-6xl px-6 py-20">
              <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                <div className="lg:sticky lg:top-24">
                  <div className="media-frame aspect-4/3">
                    <img
                      src={art}
                      alt={category.name}
                      loading="lazy"
                      width={1280}
                      height={960}
                      className="size-full object-cover"
                    />
                  </div>
                  <h2 className="text-display mt-6 text-2xl md:text-3xl">{category.name}</h2>
                  {category.description ? (
                    <p className="mt-3 text-sm text-muted-foreground">{category.description}</p>
                  ) : null}
                </div>

                <ul className="divide-y divide-border rule-line">
                  {services.map((service) => (
                    <li key={service.id} className="flex items-start justify-between gap-6 py-6">
                      <div>
                        <h3 className="font-display text-lg font-semibold">{service.name}</h3>
                        {service.description ? (
                          <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            {service.description}
                          </p>
                        ) : null}
                        <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {Math.round((service.duration_minutes / 60) * 10) / 10} h aprox.
                          </span>
                          {service.express_available ? (
                            <span className="inline-flex items-center gap-1 text-express">
                              <Timer className="size-3" /> Express disponible
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-xl font-semibold">
                          {formatEuro(service.base_price)}
                        </span>
                        <div className="mt-2">
                          <Button asChild size="sm" variant="outline" className="rounded-full">
                            <Link to="/reservar">Reservar</Link>
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}

        <section className="bg-foreground py-20 text-center text-background">
          <h2 className="text-display mx-auto max-w-2xl px-6 text-3xl md:text-4xl">
            ¿Varios trabajos? Una sola visita.
          </h2>
          <p className="mx-auto mt-4 max-w-xl px-6 text-background/70">
            Agrupa servicios en la misma reserva y pagas un único desplazamiento.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
              <Link to="/reservar">
                Configurar mi visita <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
