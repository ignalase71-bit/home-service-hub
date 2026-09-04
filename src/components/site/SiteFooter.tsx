import { Link } from "@tanstack/react-router";

import logo from "@/assets/logo-telomontamos.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <img
              src={logo.url}
              alt="TeLoMontamos.com"
              width={640}
              height={128}
              loading="lazy"
              className="h-9 w-auto"
            />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Instalación y montaje a domicilio con precio cerrado, técnicos verificados y cita
              confirmada. Jerez de la Frontera y alrededores.
            </p>
          </div>

          <div>
            <p className="text-eyebrow">Servicios</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/servicios" className="hover:text-foreground">
                  Catálogo completo
                </Link>
              </li>
              <li>
                <Link to="/ikea" className="hover:text-foreground">
                  Montaje IKEA
                </Link>
              </li>
              <li>
                <Link to="/precios" className="hover:text-foreground">
                  Precios y desplazamiento
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-eyebrow">Compañía</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/reservar" className="hover:text-foreground">
                  Reservar cita
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-foreground">
                  Acceso equipo
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Instalia · Jerez de la Frontera</span>
          <span>Técnicos verificados · Trabajo garantizado · Precio sin sorpresas</span>
        </div>
      </div>
    </footer>
  );
}
