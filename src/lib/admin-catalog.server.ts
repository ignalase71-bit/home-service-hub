import type { Db } from "./admin.server";

export type ServiceInput = {
  category_id: string;
  slug: string;
  name: string;
  description?: string | null;
  specialty: string;
  base_price: number;
  duration_minutes: number;
  addon_duration_minutes: number;
  express_available: boolean;
  express_fee: number;
  emoji?: string | null;
  sort_order: number;
  active: boolean;
};

/** Catálogo completo (incluye desactivados) para administración. */
export const loadAdminCatalog = async (db: Db) => {
  const [services, categories] = await Promise.all([
    db.from("services").select("*").order("sort_order"),
    db.from("categories").select("*").order("sort_order"),
  ]);
  return { services: services.data ?? [], categories: categories.data ?? [] };
};

export const createService = async (db: Db, input: ServiceInput) => {
  const { data, error } = await db.from("services").insert(input).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
};

export const updateService = async (db: Db, id: string, input: Partial<ServiceInput>) => {
  const { error } = await db.from("services").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
};

export const setServiceActive = async (db: Db, id: string, active: boolean) => {
  const { error } = await db.from("services").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
};

/**
 * Borrado definitivo. Los presupuestos históricos no se pierden: request_items
 * y visit_services guardan una copia del nombre y del precio aplicado.
 */
export const deleteService = async (db: Db, id: string) => {
  const { error } = await db.from("services").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
};
