import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeEuro,
  CalendarCheck,
  ShieldCheck,
  Sparkles,
  Timer,
  Wrench,
} from "lucide-react";

import { getCatalog } from "@/lib/public.functions";
import { formatEuro } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

import heroHome from "@/assets/hero-home.jpg";
import catClima from "@/assets/cat-climatizacion.jpg";
import catMontaje from "@/assets/cat-montaje.jpg";
import catElectricidad from "@/assets/cat-electricidad.jpg";
import catFontaneria from "@/assets/cat-fontaneria.jpg";
import catCocina from "@/assets/cat-cocina.jpg";
import catEnergia from "@/assets/cat-energia.jpg";
import heroIkea from "@/assets/hero-ikea.jpg";

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

const fallbackArt = [catCocina, catEnergia];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TeLoMontamos.com | Instalación y montaje a domicilio en Jerez y alrededores" },
      {
        name: "description",
        content:
          "Servicio premium de instalación y montaje a domicilio en Jerez y alrededores: precio cerrado, técnicos verificados, cita confirmada y opción Express en 24 h.",
      },
      { property: "og:title", content: "TeLoMontamos.com | Instalación premium a domicilio" },
      {
        property: "og:description",
        content:
          "Elige el servicio, ves el precio final y reservas la hora. Sin presupuestos eternos ni sorpresas.",
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
  const minZoneFee = data.zones.length
    ? Math.min(...data.zones.map((z) => z.fee))
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative isolate overflow-hidden">
          <img
            src={heroHome}
            alt="Salón mediterráneo contemporáneo con instalación terminada"
            width={1920}
            height={1080}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="hero-scrim absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-40">
            <p className="text-eyebrow text-primary-foreground/70">
              Jerez y alrededores · Servicio premium
            </p>
            <h1 className="text-display mt-5 max-w-3xl text-4xl text-primary-foreground sm:text-5xl md:text-6xl">
              Tu casa, instalada y montada como debe ser.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/80">
              Elige el servicio, obtén el precio final antes de confirmar y reserva la hora exacta.
              Nosotros llegamos puntuales, dejamos todo funcionando y recogemos al salir.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to="/reservar">
                  Ver precio y reservar
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-primary-foreground/30 bg-transparent px-7 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/servicios">Explorar servicios</Link>
              </Button>
            </div>

            <dl className="mt-16 grid max-w-3xl gap-8 sm:grid-cols-3">
              {[
                { icon: BadgeEuro, t: "Precio cerrado", d: "Lo que ves es lo que pagas." },
                { icon: Timer, t: "Express 24 h", d: "Cita en el día siguiente si hay hueco." },
                { icon: ShieldCheck, t: "Técnicos verificados", d: "Trabajo garantizado por escrito." },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="text-primary-foreground">
                  <Icon className="size-5 text-bronze" />
                  <dt className="mt-3 font-display text-base font-semibold">{t}</dt>
                  <dd className="mt-1 text-sm text-primary-foreground/70">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CATEGORÍAS */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-eyebrow">Qué hacemos</p>
              <h2 className="text-display mt-3 text-3xl md:text-4xl">
                Instalaciones y montajes con acabado impecable
              </h2>
            </div>
            <Link
              to="/servicios"
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-bronze"
            >
              Ver catálogo completo <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {data.categories.map((category, i) => {
              const services = data.services.filter((s) => s.category_id === category.id);
              const art = categoryArt[category.slug] ?? fallbackArt[i % fallbackArt.length];
              const cheapest = services.length
                ? Math.min(...services.map((s) => s.base_price))
                : null;
              return (
                <Link
                  key={category.id}
                  to="/servicios"
                  className="group media-frame relative block aspect-4/3"
                >
                  <img
                    src={art}
                    alt={category.name}
                    loading="lazy"
                    width={1280}
                    height={960}
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-foreground/80 via-foreground/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-7 text-background">
                    <h3 className="font-display text-2xl font-semibold">{category.name}</h3>
                    {category.description ? (
                      <p className="mt-1 max-w-sm text-sm text-background/80">
                        {category.description}
                      </p>
                    ) : null}
                    {cheapest !== null ? (
                      <p className="mt-3 text-sm font-medium text-background/90">
                        Desde {formatEuro(cheapest)} · {services.length} servicios
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ASÍ DE SENCILLO */}
        <section className="bg-foreground py-24 text-background">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-eyebrow text-background/60">Así de sencillo</p>
            <h2 className="text-display mt-3 max-w-2xl text-3xl md:text-4xl">
              Tres pasos y un técnico en tu puerta
            </h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-3">
              {[
                {
                  n: "01",
                  t: "Elige el servicio",
                  d: "Selecciona lo que necesitas. Puedes sumar varios trabajos en la misma visita.",
                },
                {
                  n: "02",
                  t: "Elige día y hora",
                  d: "Ves huecos reales de agenda, no una lista de espera. Express si tienes prisa.",
                },
                {
                  n: "03",
                  t: "Nosotros nos ocupamos",
                  d: "Técnico verificado, material previsto, prueba de funcionamiento y limpieza final.",
                },
              ].map((step) => (
                <li key={step.n} className="border-t border-background/20 pt-6">
                  <span className="font-display text-sm tracking-[0.2em] text-bronze">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold">{step.t}</h3>
                  <p className="mt-2 text-sm text-background/70">{step.d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-14">
              <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
                <Link to="/reservar">Empezar ahora</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* TRANSPARENCIA */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-14 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-eyebrow">Precio transparente</p>
              <h2 className="text-display mt-3 text-3xl md:text-4xl">
                Sin presupuestos eternos ni sorpresas al final
              </h2>
              <p className="mt-5 text-muted-foreground">
                Antes de confirmar ves el desglose completo: mano de obra, extras, desplazamiento y
                recargo Express si lo eliges. Un solo desplazamiento por visita, aunque agrupes
                varios trabajos.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  { icon: BadgeEuro, t: "Desglose antes de pagar" },
                  {
                    icon: Wrench,
                    t: `Desplazamiento ${minZoneFee === 0 ? "incluido en el centro de Jerez" : "según distancia"}`,
                  },
                  { icon: CalendarCheck, t: "Cita confirmada con franja horaria" },
                  { icon: Sparkles, t: "Retiramos embalajes y dejamos limpio" },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-bronze" />
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-9">
                <Button asChild variant="outline" className="rounded-full px-6">
                  <Link to="/precios">Ver precios y zonas</Link>
                </Button>
              </div>
            </div>
            <div className="media-frame">
              <img
                src={catCocina}
                alt="Cocina contemporánea con encimera y placa de inducción instalada"
                loading="lazy"
                width={1280}
                height={960}
                className="size-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* EXPRESS */}
        <section className="bg-surface py-24">
          <div className="mx-auto grid max-w-6xl gap-14 px-6 md:grid-cols-2 md:items-center">
            <div className="media-frame order-last md:order-first">
              <img
                src={catEnergia}
                alt="Instalación solar terminada en la azotea de una vivienda"
                loading="lazy"
                width={1280}
                height={960}
                className="size-full object-cover"
              />
            </div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-express/10 px-3 py-1 text-xs font-medium text-express">
                <Timer className="size-3.5" /> Servicio Express
              </span>
              <h2 className="text-display mt-5 text-3xl md:text-4xl">
                ¿Se ha roto hoy? Vamos mañana.
              </h2>
              <p className="mt-5 text-muted-foreground">
                Activa Express en la reserva y buscamos el primer hueco disponible en menos de 24 h.
                Verás el recargo exacto antes de confirmar; si no hay hueco, no se te cobra nada.
              </p>
              <div className="mt-8">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link to="/reservar">Comprobar disponibilidad de hoy</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* IKEA */}
        <section className="relative isolate overflow-hidden">
          <img
            src={heroIkea}
            alt="Dormitorio con armario y estantería de muebles montados"
            loading="lazy"
            width={1920}
            height={1088}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="hero-scrim absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-6 py-28">
            <p className="text-eyebrow text-primary-foreground/70">Montaje de muebles</p>
            <h2 className="text-display mt-4 max-w-2xl text-3xl text-primary-foreground md:text-4xl">
              Compraste el mueble. Nosotros lo dejamos montado y anclado.
            </h2>
            <p className="mt-5 max-w-xl text-primary-foreground/80">
              Armarios, cocinas, estanterías y cabeceros: montaje profesional, anclaje seguro a
              pared y retirada de embalajes. Precio por mueble, sin horas abiertas.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to="/ikea">Ver montaje de muebles</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-display mx-auto max-w-2xl text-3xl md:text-4xl">
            Reserva en dos minutos y olvídate del resto
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Disponibilidad real, precio cerrado y confirmación inmediata.
          </p>
          <div className="mt-9 flex justify-center">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/reservar">
                Reservar cita <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
