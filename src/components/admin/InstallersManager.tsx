import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  adminDeleteBlock,
  adminDeleteInstaller,
  adminInstallersPanel,
  adminSaveBlock,
  adminSaveInstaller,
  adminSaveSchedule,
} from "@/lib/admin.functions";
import { WEEKDAYS, type AdminInstaller } from "@/lib/admin-types";
import { formatDateES, formatRange } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type ScheduleRow = { installer_id: string; weekday: number; start_time: string; end_time: string };
type BlockRow = {
  id: string;
  installer_id: string;
  kind: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

type FormState = {
  id: string | null;
  name: string;
  phone: string;
  email: string;
  color: string;
  specialties: string[];
  zones: string;
  maxVisitMinutes: number;
  expressEnabled: boolean;
  hourlyCost: number;
  active: boolean;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  phone: "",
  email: "",
  color: "#f97316",
  specialties: [],
  zones: "",
  maxVisitMinutes: 480,
  expressEnabled: true,
  hourlyCost: 0,
  active: true,
};

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function InstallersManager() {
  const queryClient = useQueryClient();
  const panelFn = useServerFn(adminInstallersPanel);
  const saveFn = useServerFn(adminSaveInstaller);
  const scheduleFn = useServerFn(adminSaveSchedule);
  const blockFn = useServerFn(adminSaveBlock);
  const deleteBlockFn = useServerFn(adminDeleteBlock);
  const deleteFn = useServerFn(adminDeleteInstaller);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-installers"],
    queryFn: () => panelFn({}),
  });

  const installers = (data?.installers ?? []) as AdminInstaller[];
  const schedules = (data?.schedules ?? []) as ScheduleRow[];
  const blocks = (data?.blocks ?? []) as BlockRow[];
  const specialtyOptions = (data?.specialties ?? []) as string[];
  const workload = data?.workload ?? [];

  const [form, setForm] = useState<FormState>(emptyForm);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draftSchedule, setDraftSchedule] = useState<ScheduleRow[]>([]);
  const [block, setBlock] = useState({
    kind: "block" as "block" | "vacation",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-installers"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: form.id,
          name: form.name,
          phone: form.phone,
          email: form.email,
          color: form.color,
          specialties: form.specialties,
          zones: form.zones
            .split(",")
            .map((z) => z.trim())
            .filter(Boolean),
          maxVisitMinutes: form.maxVisitMinutes,
          expressEnabled: form.expressEnabled,
          hourlyCost: form.hourlyCost,
          active: form.active,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Instalador actualizado" : "Instalador creado");
      setForm(emptyForm);
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el instalador"),
  });

  const saveSchedule = useMutation({
    mutationFn: (installerId: string) =>
      scheduleFn({
        data: {
          installerId,
          windows: draftSchedule.map((w) => ({
            weekday: w.weekday,
            startTime: w.start_time,
            endTime: w.end_time,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Horario guardado");
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el horario"),
  });

  const saveBlock = useMutation({
    mutationFn: (installerId: string) =>
      blockFn({
        data: {
          installerId,
          kind: block.kind,
          startDate: block.startDate,
          endDate: block.endDate || block.startDate,
          startTime: block.startTime || null,
          endTime: block.endTime || null,
          reason: block.reason,
        },
      }),
    onSuccess: () => {
      toast.success("Ausencia registrada");
      setBlock({
        kind: "block",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        reason: "",
      });
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la ausencia"),
  });

  const removeBlock = useMutation({
    mutationFn: (id: string) => deleteBlockFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const removeInstaller = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (result) => {
      toast.success(
        result.deactivated
          ? "Tiene visitas asociadas: se ha desactivado en lugar de eliminarlo"
          : "Instalador eliminado",
      );
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Error"),
  });

  const openInstaller = (installer: AdminInstaller) => {
    const next = openId === installer.id ? null : installer.id;
    setOpenId(next);
    if (next) {
      setDraftSchedule(schedules.filter((s) => s.installer_id === installer.id));
    }
  };

  const workloadById = useMemo(
    () => new Map(workload.map((w) => [w.installerId, w])),
    [workload],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando instaladores…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Instaladores</h2>
        <p className="text-sm text-muted-foreground">
          Cada instalador tiene su propio calendario: varios pueden hacer el mismo trabajo a la vez
          y al buscar disponibilidad se prioriza quien tenga la hora más cercana.
        </p>
      </div>

      <section className="rounded-lg border border-border p-4">
        <h3 className="font-display text-lg">
          {form.id ? "Editar instalador" : "Nuevo instalador"}
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="inst-name">Nombre</Label>
            <Input
              id="inst-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inst-phone">Teléfono</Label>
            <Input
              id="inst-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inst-email">Email</Label>
            <Input
              id="inst-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inst-color">Color en la agenda</Label>
            <Input
              id="inst-color"
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inst-zones">Zonas (separadas por comas)</Label>
            <Input
              id="inst-zones"
              value={form.zones}
              onChange={(e) => setForm({ ...form, zones: e.target.value })}
              placeholder="Jerez, Bahía"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inst-max">Máx. minutos por visita</Label>
            <Input
              id="inst-max"
              type="number"
              value={form.maxVisitMinutes}
              onChange={(e) => setForm({ ...form, maxVisitMinutes: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inst-cost">Coste por hora (€)</Label>
            <Input
              id="inst-cost"
              type="number"
              step="0.01"
              value={form.hourlyCost}
              onChange={(e) => setForm({ ...form, hourlyCost: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              id="inst-express"
              checked={form.expressEnabled}
              onCheckedChange={(v) => setForm({ ...form, expressEnabled: v })}
            />
            <Label htmlFor="inst-express">Acepta Express 24 h</Label>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              id="inst-active"
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            <Label htmlFor="inst-active">Activo</Label>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label>Especialidades</Label>
          <div className="flex flex-wrap gap-2">
            {specialtyOptions.map((specialty) => {
              const selected = form.specialties.includes(specialty);
              return (
                <button
                  key={specialty}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      specialties: selected
                        ? form.specialties.filter((s) => s !== specialty)
                        : [...form.specialties, specialty],
                    })
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {specialty}
                </button>
              );
            })}
            {specialtyOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Crea trabajos con especialidad para poder asignarlas.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending || form.name.length < 2}>
            {save.isPending ? "Guardando…" : form.id ? "Guardar cambios" : "Crear instalador"}
          </Button>
          {form.id ? (
            <Button variant="ghost" onClick={() => setForm(emptyForm)}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </section>

      <div className="space-y-3">
        {installers.map((installer) => {
          const load = workloadById.get(installer.id);
          const own = schedules.filter((s) => s.installer_id === installer.id);
          const ownBlocks = blocks.filter((b) => b.installer_id === installer.id);
          return (
            <section key={installer.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-display text-lg">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: installer.color }}
                    />
                    {installer.name}
                    {!installer.active ? <Badge variant="outline">Inactivo</Badge> : null}
                    {installer.express_enabled ? <Badge variant="secondary">🚀 Express</Badge> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {installer.specialties.join(" · ") || "Sin especialidades"} ·{" "}
                    {installer.zones.join(", ") || "Todas las zonas"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {load?.upcomingVisits ?? 0} visitas próximas ·{" "}
                    {Math.round((load?.upcomingMinutes ?? 0) / 60)} h planificadas ·{" "}
                    {load?.openRequests ?? 0} solicitudes asignadas
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({
                        id: installer.id,
                        name: installer.name,
                        phone: installer.phone ?? "",
                        email: installer.email ?? "",
                        color: installer.color,
                        specialties: installer.specialties,
                        zones: installer.zones.join(", "),
                        maxVisitMinutes: installer.max_visit_minutes,
                        expressEnabled: installer.express_enabled,
                        hourlyCost: Number(installer.hourly_cost),
                        active: installer.active,
                      })
                    }
                  >
                    Editar ficha
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openInstaller(installer)}>
                    {openId === installer.id ? "Ocultar agenda" : "Horario y ausencias"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar a ${installer.name}?`)) {
                        removeInstaller.mutate(installer.id);
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {own.length === 0
                  ? "Sin horario semanal configurado: no aparecerá en las búsquedas de disponibilidad."
                  : own
                      .slice()
                      .sort(
                        (a, b) =>
                          WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday),
                      )
                      .map(
                        (w) =>
                          `${WEEKDAYS[w.weekday]?.slice(0, 3)} ${formatRange(w.start_time, w.end_time)}`,
                      )
                      .join(" · ")}
              </p>

              {openId === installer.id ? (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide">
                      Horario semanal
                    </h4>
                    <div className="mt-2 space-y-2">
                      {draftSchedule.map((window, index) => (
                        <div key={index} className="flex flex-wrap items-end gap-2">
                          <div className="space-y-1">
                            <Label htmlFor={`wd-${installer.id}-${index}`}>Día</Label>
                            <select
                              id={`wd-${installer.id}-${index}`}
                              className="rounded-md border border-border bg-background px-2 py-2 text-sm"
                              value={window.weekday}
                              onChange={(e) =>
                                setDraftSchedule((prev) =>
                                  prev.map((w, i) =>
                                    i === index ? { ...w, weekday: Number(e.target.value) } : w,
                                  ),
                                )
                              }
                            >
                              {WEEKDAY_ORDER.map((wd) => (
                                <option key={wd} value={wd}>
                                  {WEEKDAYS[wd]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`from-${installer.id}-${index}`}>Desde</Label>
                            <Input
                              id={`from-${installer.id}-${index}`}
                              type="time"
                              value={window.start_time.slice(0, 5)}
                              onChange={(e) =>
                                setDraftSchedule((prev) =>
                                  prev.map((w, i) =>
                                    i === index ? { ...w, start_time: e.target.value } : w,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`to-${installer.id}-${index}`}>Hasta</Label>
                            <Input
                              id={`to-${installer.id}-${index}`}
                              type="time"
                              value={window.end_time.slice(0, 5)}
                              onChange={(e) =>
                                setDraftSchedule((prev) =>
                                  prev.map((w, i) =>
                                    i === index ? { ...w, end_time: e.target.value } : w,
                                  ),
                                )
                              }
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDraftSchedule((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            Quitar
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDraftSchedule((prev) => [
                            ...prev,
                            {
                              installer_id: installer.id,
                              weekday: 1,
                              start_time: "09:00",
                              end_time: "18:00",
                            },
                          ])
                        }
                      >
                        Añadir tramo
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveSchedule.mutate(installer.id)}
                        disabled={saveSchedule.isPending}
                      >
                        {saveSchedule.isPending ? "Guardando…" : "Guardar horario"}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide">
                      Ausencias y bloqueos
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      {ownBlocks.map((b) => (
                        <li key={b.id} className="flex items-center gap-2">
                          <span>
                            {b.kind === "vacation" ? "🌴" : "⛔"} {formatDateES(b.start_date)} →{" "}
                            {formatDateES(b.end_date)}
                            {b.start_time && b.end_time
                              ? ` (${formatRange(b.start_time, b.end_time)})`
                              : " (día completo)"}
                            {b.reason ? ` · ${b.reason}` : ""}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBlock.mutate(b.id)}
                          >
                            Quitar
                          </Button>
                        </li>
                      ))}
                      {ownBlocks.length === 0 ? (
                        <li className="text-muted-foreground">Sin ausencias próximas.</li>
                      ) : null}
                    </ul>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      <div className="space-y-1">
                        <Label htmlFor={`bkind-${installer.id}`}>Tipo</Label>
                        <select
                          id={`bkind-${installer.id}`}
                          className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                          value={block.kind}
                          onChange={(e) =>
                            setBlock({ ...block, kind: e.target.value as "block" | "vacation" })
                          }
                        >
                          <option value="block">Bloqueo</option>
                          <option value="vacation">Vacaciones</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`bfrom-${installer.id}`}>Desde</Label>
                        <Input
                          id={`bfrom-${installer.id}`}
                          type="date"
                          value={block.startDate}
                          onChange={(e) => setBlock({ ...block, startDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`bto-${installer.id}`}>Hasta</Label>
                        <Input
                          id={`bto-${installer.id}`}
                          type="date"
                          value={block.endDate}
                          onChange={(e) => setBlock({ ...block, endDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`bstart-${installer.id}`}>Hora inicio</Label>
                        <Input
                          id={`bstart-${installer.id}`}
                          type="time"
                          value={block.startTime}
                          onChange={(e) => setBlock({ ...block, startTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`bend-${installer.id}`}>Hora fin</Label>
                        <Input
                          id={`bend-${installer.id}`}
                          type="time"
                          value={block.endTime}
                          onChange={(e) => setBlock({ ...block, endTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`breason-${installer.id}`}>Motivo</Label>
                        <Input
                          id={`breason-${installer.id}`}
                          value={block.reason}
                          onChange={(e) => setBlock({ ...block, reason: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      onClick={() => saveBlock.mutate(installer.id)}
                      disabled={saveBlock.isPending || !block.startDate}
                    >
                      {saveBlock.isPending ? "Guardando…" : "Añadir ausencia"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
        {installers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay instaladores.</p>
        ) : null}
      </div>
    </div>
  );
}
