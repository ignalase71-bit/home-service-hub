import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  adminCatalog,
  adminCreateService,
  adminDeleteService,
  adminSetServiceActive,
  adminUpdateService,
} from "@/lib/admin.functions";
import type { AdminCategory, AdminService } from "@/lib/admin-types";
import { formatEuro } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type FormState = {
  id: string | null;
  category_id: string;
  slug: string;
  name: string;
  description: string;
  specialty: string;
  base_price: number;
  duration_minutes: number;
  addon_duration_minutes: number;
  express_available: boolean;
  express_fee: number;
  emoji: string;
  sort_order: number;
  active: boolean;
};

const emptyForm = (categoryId: string): FormState => ({
  id: null,
  category_id: categoryId,
  slug: "",
  name: "",
  description: "",
  specialty: "",
  base_price: 0,
  duration_minutes: 60,
  addon_duration_minutes: 30,
  express_available: true,
  express_fee: 100,
  emoji: "",
  sort_order: 0,
  active: true,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function ServicesManager() {
  const queryClient = useQueryClient();
  const catalogFn = useServerFn(adminCatalog);
  const createFn = useServerFn(adminCreateService);
  const updateFn = useServerFn(adminUpdateService);
  const toggleFn = useServerFn(adminSetServiceActive);
  const deleteFn = useServerFn(adminDeleteService);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: () => catalogFn({}),
  });

  const categories = (data?.categories ?? []) as AdminCategory[];
  const services = (data?.services ?? []) as AdminService[];
  const [form, setForm] = useState<FormState | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const save = useMutation({
    mutationFn: async (values: FormState) => {
      const payload = {
        category_id: values.category_id,
        slug: values.slug || slugify(values.name),
        name: values.name,
        description: values.description || null,
        specialty: values.specialty || slugify(values.name),
        base_price: Number(values.base_price),
        duration_minutes: Number(values.duration_minutes),
        addon_duration_minutes: Number(values.addon_duration_minutes),
        express_available: values.express_available,
        express_fee: Number(values.express_fee),
        emoji: values.emoji || null,
        sort_order: Number(values.sort_order),
        active: values.active,
      };
      if (values.id) return updateFn({ data: { id: values.id, values: payload } });
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Trabajo guardado");
      setForm(null);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Error al guardar"),
  });

  const toggle = useMutation({
    mutationFn: (values: { id: string; active: boolean }) => toggleFn({ data: values }),
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Trabajo eliminado");
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el trabajo"),
  });

  const grouped = useMemo(
    () =>
      categories.map((category) => ({
        category,
        services: services.filter((s) => s.category_id === category.id),
      })),
    [categories, services],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando catálogo…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Tipos de trabajo</h2>
          <p className="text-sm text-muted-foreground">
            Los cambios de precio no afectan a presupuestos ya emitidos.
          </p>
        </div>
        <Button
          onClick={() => setForm(emptyForm(categories[0]?.id ?? ""))}
          disabled={categories.length === 0}
        >
          Nuevo trabajo
        </Button>
      </div>

      {form ? (
        <section className="rounded-lg border border-border p-4">
          <h3 className="font-display text-lg">
            {form.id ? "Editar trabajo" : "Añadir trabajo"}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Nombre</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-category">Categoría</Label>
              <select
                id="svc-category"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-price">Precio base (€)</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step="0.01"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-specialty">Especialidad</Label>
              <Input
                id="svc-specialty"
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-duration">Duración (min)</Label>
              <Input
                id="svc-duration"
                type="number"
                min={15}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-addon">Duración por unidad extra (min)</Label>
              <Input
                id="svc-addon"
                type="number"
                min={0}
                value={form.addon_duration_minutes}
                onChange={(e) =>
                  setForm({ ...form, addon_duration_minutes: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-express-fee">Recargo Express (€)</Label>
              <Input
                id="svc-express-fee"
                type="number"
                min={0}
                step="0.01"
                value={form.express_fee}
                onChange={(e) => setForm({ ...form, express_fee: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-order">Orden</Label>
              <Input
                id="svc-order"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="svc-desc">Descripción</Label>
              <Textarea
                id="svc-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.express_available}
                onCheckedChange={(v) => setForm({ ...form, express_available: v })}
              />
              <span className="text-sm">Disponible en Express (24 h)</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <span className="text-sm">Visible para clientes</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || form.name.length < 2 || !form.category_id}
            >
              {save.isPending ? "Guardando…" : "Guardar"}
            </Button>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
          </div>
        </section>
      ) : null}

      {grouped.map(({ category, services: list }) => (
        <section key={category.id} className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {category.name}
          </h3>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin trabajos en esta categoría.</p>
          ) : (
            <div className="grid gap-2">
              {list.map((service) => (
                <div
                  key={service.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="font-semibold">
                      {service.name}{" "}
                      {service.active ? null : <Badge variant="outline">Oculto</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatEuro(service.base_price)} · {service.duration_minutes} min · +
                      {service.addon_duration_minutes} min por unidad
                      {service.express_available ? " · Express" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          id: service.id,
                          category_id: service.category_id,
                          slug: service.slug,
                          name: service.name,
                          description: service.description ?? "",
                          specialty: service.specialty,
                          base_price: service.base_price,
                          duration_minutes: service.duration_minutes,
                          addon_duration_minutes: service.addon_duration_minutes,
                          express_available: service.express_available,
                          express_fee: service.express_fee,
                          emoji: service.emoji ?? "",
                          sort_order: service.sort_order,
                          active: service.active,
                        })
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        toggle.mutate({ id: service.id, active: !service.active })
                      }
                    >
                      {service.active ? "Desactivar" : "Activar"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar «{service.name}»?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Dejará de estar disponible para nuevos presupuestos. Los presupuestos y
                            visitas ya registrados conservan su nombre y precio.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(service.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
