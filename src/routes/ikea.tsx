import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight, PackageOpen, Ruler, ShieldCheck, Sparkles } from "lucide-react";

import { getCatalog } from "@/lib/public.functions";
import { formatEuro } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

import heroIkea from "@/assets/hero-ikea.jpg";
import catMontaje from "@/assets/cat-montaje.jpg";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
});

export const Route = createFileRoute("/ikea")({
  head: () => ({
    meta: [
      { title: "Montaje de muebles IKEA a domicilio en Jerez | Instalia" },
      {
        name: "description",
        content:
          "Montaje profesional de muebles IKEA y similares en Jerez: precio por mueble, anclaje seguro a pared y retirada de embalajes.",
      },
      { property: "og:title", content: "Montaje de muebles IKEA en Jerez | Instalia" },
      {
        property: "og:description",
        content:
          "Armarios, estanterías y cocinas montados por profesionales, con precio cerrado y cita confirmada.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQuery);
  },
  component: IkeaPage,
});

function IkeaPage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const category = data.categories.find((c) => c.slug === "montaje-muebles");
  const services = category
    ? data.services.filter((s) => s.category_id === category.id)
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden">
          <img
            src={heroIkea}
            alt="Salón con estantería y armario de muebles montados profesionalmente"
            width={1920}
            height={1088}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="hero-scrim absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-36">
            <p className="text-eyebrow text-primary-foreground/70">Montaje de muebles</p>
            <h1 className="text-display mt-5 max-w-3xl text-4xl text-primary-foreground md:text-5xl">
              Deja la caja cerrada. Nosotros lo montamos.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/80">
              Muebles de IKEA y de cualquier marca montados por profesionales: anclaje seguro,
              puertas alineadas y embalajes fuera de casa.
            </p>
            <div className="mt-9">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to="/reservar">
                  Reservar montaje <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Ruler, t: "Anclaje a pared", d: "Armarios y estanterías fijados con el sistema adecuado a tu pared." },
              { icon: PackageOpen, t: "Embalajes fuera", d: "Retiramos cartón y plásticos al terminar el montaje." },
              { icon: ShieldCheck, t: "Sin piezas sueltas", d: "Revisamos herrajes, tiradores y nivelado antes de irnos." },
              { icon: Sparkles, t: "Acabado limpio", d: "Aspirado de la zona y mueble listo para usar." },
            ].map(({ icon: Icon, t, d }) => (
              <article key={t} className="panel p-6">
                <Icon className="size-5 text-bronze" />
                <h2 className="mt-4 font-display text-lg font-semibold">{t}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </article>
            ))}
          </div>
        </section>

        {services.length ? (
          <section className="bg-surface py-24">
            <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-eyebrow">Tarifas</p>
                <h2 className="text-display mt-3 text-3xl md:text-4xl">Precio por mueble</h2>
                <ul className="mt-8 divide-y divide-border rule-line">
                  {services.map((service) => (
                    <li key={service.id} className="flex items-start justify-between gap-6 py-5">
                      <div>
                        <h3 className="font-display text-lg font-semibold">{service.name}</h3>
                        {service.description ? (
                          <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            {service.description}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Math.round((service.duration_minutes / 60) * 10) / 10} h aprox.
                        </p>
                      </div>
                      <span className="font-display text-xl font-semibold">
                        {formatEuro(service.base_price)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-muted-foreground">
                  ¿Varios muebles? Se montan en la misma visita y pagas un solo desplazamiento.
                </p>
              </div>
              <div className="media-frame">
                <img
                  src={catMontaje}
                  alt="Armario de roble montado en un dormitorio luminoso"
                  loading="lazy"
                  width={1280}
                  height={960}
                  className="size-full object-cover"
                />
              </div>
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-display mx-auto max-w-2xl text-3xl md:text-4xl">
            Elige el día y ten el mueble listo esta semana
          </h2>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/reservar">Ver disponibilidad</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
