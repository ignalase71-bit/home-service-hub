import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { chooseRequestSlot, getRequestByToken } from "@/lib/public.functions";
import { formatEuro } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/solicitud/$token")({
  head: () => ({
    meta: [
      { title: "Tu solicitud de montaje | Instalia Jerez" },
      {
        name: "description",
        content:
          "Consulta tu presupuesto de montaje y elige una de las tres fechas propuestas por nuestro equipo.",
      },
      { property: "og:title", content: "Tu solicitud de montaje | Instalia Jerez" },
      {
        property: "og:description",
        content: "Presupuesto detallado y elección de fecha de montaje.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestPage,
});

const formatSlot = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function RequestPage() {
  const { token } = Route.useParams();
  const loadFn = useServerFn(getRequestByToken);
  const chooseFn = useServerFn(chooseRequestSlot);

  const request = useQuery({
    queryKey: ["request", token],
    queryFn: () => loadFn({ data: { token } }),
  });

  const choose = useMutation({
    mutationFn: chooseFn,
    onSuccess: () => {
      toast.success("Fecha confirmada");
      void request.refetch();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar la fecha"),
  });

  const data = request.data;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        {request.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando tu solicitud…</p>
        ) : request.isError || !data ? (
          <div className="panel p-8 text-center">
            <h1 className="text-display text-2xl">No encontramos esta solicitud</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Comprueba el enlace que te enviamos o vuelve a solicitar tu montaje.
            </p>
            <Button asChild className="mt-6 rounded-full px-6">
              <Link to="/reservar">Solicitar montaje</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-eyebrow">Solicitud #{data.requestNumber}</p>
            <h1 className="text-display mt-3 text-4xl">Hola, {data.customerName}</h1>
            {data.express ? (
              <Badge className="mt-3" variant="secondary">
                🚀 Express · montaje en 24 h
              </Badge>
            ) : null}

            <section className="panel mt-8 p-5">
              <h2 className="text-xl font-bold">Tu presupuesto</h2>
              <div className="mt-4 space-y-2 text-sm">
                {data.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-2">
                    <span>
                      {item.name} × {item.quantity}
                      {item.express ? " · Express" : ""}
                    </span>
                    <span>{formatEuro(item.subtotal + item.expressFee)}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Trabajos</span>
                  <span>{formatEuro(data.servicesTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Express</span>
                  <span>{formatEuro(data.expressTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Desplazamiento</span>
                  <span>{formatEuro(data.distanceFee)}</span>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-bold text-primary">
                  {formatEuro(data.total)}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Precio cerrado: aunque nuestras tarifas cambien, este presupuesto se mantiene.
              </p>
            </section>

            <section className="panel mt-6 p-5">
              <h2 className="text-xl font-bold">Fecha del montaje</h2>
              {data.chosenSlot ? (
                <p className="mt-3 rounded-md bg-success/10 p-3 text-sm">
                  ✅ Has elegido el{" "}
                  <strong className="capitalize">{formatSlot(data.chosenSlot)}</strong>. Te
                  confirmaremos el técnico asignado.
                </p>
              ) : data.proposedSlots.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Estamos revisando la agenda. En breve te propondremos tres fechas para que elijas
                  la que mejor te venga.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Elige la opción que mejor te venga:
                  </p>
                  {data.proposalNote ? (
                    <p className="mt-2 text-sm text-muted-foreground">{data.proposalNote}</p>
                  ) : null}
                  <div className="mt-4 grid gap-3">
                    {data.proposedSlots.map((slot, index) => (
                      <Button
                        key={slot}
                        variant="outline"
                        className="h-auto justify-between px-4 py-3 capitalize"
                        disabled={choose.isPending}
                        onClick={() =>
                          choose.mutate({
                            data: { token, slotIndex: (index + 1) as 1 | 2 | 3 },
                          })
                        }
                      >
                        <span>{formatSlot(slot)}</span>
                        <span className="text-xs uppercase tracking-wide">Elegir</span>
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
