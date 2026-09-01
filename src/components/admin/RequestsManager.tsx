import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  adminProposeSlots,
  adminRequests,
  adminUpdateRequestStatus,
} from "@/lib/admin.functions";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_ORDER,
  type AdminRequest,
} from "@/lib/admin-types";
import { formatEuro } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const formatSlot = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export function RequestsManager() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(adminRequests);
  const proposeFn = useServerFn(adminProposeSlots);
  const statusFn = useServerFn(adminUpdateRequestStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: () => listFn({}),
  });
  const requests = (data ?? []) as AdminRequest[];

  const [openId, setOpenId] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>(["", "", ""]);
  const [note, setNote] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-requests"] });

  const propose = useMutation({
    mutationFn: (requestId: string) =>
      proposeFn({
        data: {
          requestId,
          slots: slots.filter(Boolean).map((s) => new Date(s).toISOString()),
          note: note || null,
        },
      }),
    onSuccess: (result) => {
      toast.success(
        result.expressIncomplete
          ? "Fechas enviadas (recuerda proponer 3 opciones en Express)"
          : "Fechas propuestas enviadas al cliente",
      );
      setOpenId(null);
      setSlots(["", "", ""]);
      setNote("");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudieron proponer las fechas"),
  });

  const setStatus = useMutation({
    mutationFn: (values: { requestId: string; status: string }) => statusFn({ data: values }),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Error"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando solicitudes…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl">Solicitudes de montaje</h2>
        <p className="text-sm text-muted-foreground">
          Propón hasta tres fechas y el cliente elegirá una desde su enlace privado.
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay solicitudes.</p>
      ) : null}

      {requests.map((request) => {
        const proposed = [
          request.proposed_slot_1,
          request.proposed_slot_2,
          request.proposed_slot_3,
        ].filter(Boolean) as string[];
        return (
          <section key={request.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg">
                  Solicitud #{request.request_number} · {request.customer?.name ?? "Cliente"}
                  {request.express ? (
                    <Badge className="ml-2" variant="secondary">
                      🚀 Express 24 h
                    </Badge>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {request.customer?.phone ?? ""} · {request.customer?.address ?? ""} (
                  {request.distance_km} km)
                </p>
                <p className="text-sm text-muted-foreground">
                  {request.items.map((i) => `${i.service_name} × ${i.quantity}`).join(" · ")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-semibold">{formatEuro(request.total)}</p>
                <p className="text-xs text-muted-foreground">
                  {request.duration_minutes} min estimados
                </p>
                <select
                  aria-label="Estado de la solicitud"
                  className="mt-2 rounded-md border border-border bg-background px-2 py-1 text-sm"
                  value={request.status}
                  onChange={(e) =>
                    setStatus.mutate({ requestId: request.id, status: e.target.value })
                  }
                >
                  {REQUEST_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {REQUEST_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              {request.chosen_slot ? (
                <p className="rounded-md bg-success/10 p-2 capitalize">
                  ✅ El cliente eligió {formatSlot(request.chosen_slot)}
                </p>
              ) : proposed.length > 0 ? (
                <p className="text-muted-foreground">
                  Fechas propuestas:{" "}
                  <span className="capitalize">{proposed.map(formatSlot).join(" · ")}</span>
                </p>
              ) : (
                <p className="text-muted-foreground">Sin fechas propuestas todavía.</p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOpenId(openId === request.id ? null : request.id);
                  setSlots(["", "", ""]);
                  setNote(request.proposal_note ?? "");
                }}
              >
                {proposed.length > 0 ? "Cambiar fechas" : "Proponer fechas"}
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={`/solicitud/${request.public_token}`} target="_blank" rel="noreferrer">
                  Ver enlace del cliente
                </a>
              </Button>
            </div>

            {openId === request.id ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`slot-${request.id}-${index}`}>Opción {index + 1}</Label>
                    <Input
                      id={`slot-${request.id}-${index}`}
                      type="datetime-local"
                      value={slots[index] ?? ""}
                      onChange={(e) =>
                        setSlots((prev) =>
                          prev.map((v, i) => (i === index ? e.target.value : v)),
                        )
                      }
                    />
                  </div>
                ))}
                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor={`note-${request.id}`}>Nota para el cliente</Label>
                  <Textarea
                    id={`note-${request.id}`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-3">
                  {request.express ? (
                    <p className="mb-2 text-xs text-muted-foreground">
                      🚀 Express: las tres opciones deben estar dentro de las próximas 24 horas.
                    </p>
                  ) : null}
                  <Button
                    onClick={() => propose.mutate(request.id)}
                    disabled={propose.isPending || slots.filter(Boolean).length === 0}
                  >
                    {propose.isPending ? "Enviando…" : "Enviar fechas al cliente"}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
