import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDays,
  computeVisitDuration,
  installerAvailabilityState,
  round2,
  toMinutes,
  toTime,
  type Block,
  type InstallerLite,
  type ScheduledVisit,
  type WeeklySchedule,
} from "./scheduling";
import { getPricingRules, recalcVisit, translateDbError } from "./visits.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = SupabaseClient<any, any, any>;

export const assertAdmin = async (db: Db, userId: string) => {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("No se pudo verificar el rol de administrador");
  if (!data) throw new Error("Acceso restringido al administrador");
};

export const loadOverview = async (db: Db, fromDate: string, toDate: string) => {
  const [installers, schedules, blocks, visits, services, categories, customers, zones] =
    await Promise.all([
      db.from("installers").select("*").order("name"),
      db.from("installer_schedules").select("*"),
      db.from("installer_blocks").select("*"),
      db
        .from("visits")
        .select("*, customer:customers(*), services:visit_services(*)")
        .gte("visit_date", fromDate)
        .lte("visit_date", toDate)
        .order("visit_date")
        .order("start_time"),
      db.from("services").select("*").order("sort_order"),
      db.from("categories").select("*").order("sort_order"),
      db.from("customers").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("zones").select("*").order("max_km"),
    ]);

  return {
    installers: installers.data ?? [],
    schedules: (schedules.data ?? []) as WeeklySchedule[],
    blocks: (blocks.data ?? []) as Block[],
    visits: visits.data ?? [],
    services: services.data ?? [],
    categories: categories.data ?? [],
    customers: customers.data ?? [],
    zones: zones.data ?? [],
  };
};

const toInstallerLite = (i: Record<string, unknown>): InstallerLite => ({
  id: i["id"] as string,
  name: i["name"] as string,
  specialties: (i["specialties"] ?? []) as string[],
  zones: (i["zones"] ?? []) as string[],
  max_visit_minutes: i["max_visit_minutes"] as number,
  express_enabled: i["express_enabled"] as boolean,
  active: i["active"] as boolean,
});

/** Estado de cada instalador (🟢 / 🟡 / 🔴) para una franja concreta. */
export const availabilityMatrix = async (
  db: Db,
  params: {
    date: string;
    startTime: string;
    endTime: string;
    requiredSpecialties: string[];
    zone?: string | null | undefined;
    excludeVisitId?: string | null | undefined;
  },
) => {
  const [installers, schedules, blocks, visits] = await Promise.all([
    db.from("installers").select("*").eq("active", true).order("name"),
    db.from("installer_schedules").select("*"),
    db.from("installer_blocks").select("*"),
    db
      .from("visits")
      .select("id, installer_id, visit_date, start_time, end_time, status")
      .eq("visit_date", params.date),
  ]);

  return (installers.data ?? []).map((raw) => {
    const installer = toInstallerLite(raw);
    const state = installerAvailabilityState({
      installer,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      schedules: (schedules.data ?? []) as WeeklySchedule[],
      blocks: (blocks.data ?? []) as Block[],
      visits: (visits.data ?? []) as ScheduledVisit[],
      requiredSpecialties: params.requiredSpecialties,
      zone: params.zone ?? null,
      excludeVisitId: params.excludeVisitId ?? null,
    });
    return { id: installer.id, name: installer.name, state };
  });
};

const visitSpecialties = async (db: Db, visitId: string) => {
  const { data } = await db.from("visit_services").select("specialty").eq("visit_id", visitId);
  return [...new Set((data ?? []).map((r) => r.specialty).filter(Boolean) as string[])];
};

export const changeInstaller = async (
  db: Db,
  params: { visitId: string; installerId: string; force: boolean },
) => {
  const { data: visit } = await db.from("visits").select("*").eq("id", params.visitId).single();
  if (!visit) throw new Error("Visita no encontrada");

  const specialties = await visitSpecialties(db, params.visitId);
  const matrix = await availabilityMatrix(db, {
    date: visit.visit_date,
    startTime: visit.start_time,
    endTime: visit.end_time,
    requiredSpecialties: specialties,
    excludeVisitId: params.visitId,
  });
  const target = matrix.find((m) => m.id === params.installerId);
  if (!target) throw new Error("Instalador no encontrado o inactivo");

  if (!params.force && (target.state === "busy" || target.state === "unqualified")) {
    return {
      ok: false as const,
      state: target.state,
      message:
        target.state === "busy"
          ? `⚠️ Conflicto de agenda: ${target.name} no está libre en esa franja.`
          : `⚠️ ${target.name} no tiene las especialidades o la zona necesarias.`,
    };
  }

  const { error } = await db
    .from("visits")
    .update({ installer_id: params.installerId, allow_overlap: params.force })
    .eq("id", params.visitId);
  if (error) throw new Error(translateDbError(error.message));
  return { ok: true as const, state: target.state, message: `✅ Asignada a ${target.name}` };
};

export const moveVisit = async (
  db: Db,
  params: { visitId: string; date: string; startTime: string; force: boolean },
) => {
  const { data: visit } = await db.from("visits").select("*").eq("id", params.visitId).single();
  if (!visit) throw new Error("Visita no encontrada");
  const duration = toMinutes(visit.end_time) - toMinutes(visit.start_time);
  const endTime = toTime(toMinutes(params.startTime) + duration);
  const { error } = await db
    .from("visits")
    .update({
      visit_date: params.date,
      start_time: params.startTime,
      end_time: endTime,
      allow_overlap: params.force,
    })
    .eq("id", params.visitId);
  if (error) throw new Error(translateDbError(error.message));
  return { ok: true as const, endTime };
};

/** Agrupa varias visitas del mismo cliente/dirección en una única visita. */
export const groupVisits = async (db: Db, visitIds: string[]) => {
  const { data: visits } = await db
    .from("visits")
    .select("*, services:visit_services(*)")
    .in("id", visitIds)
    .order("start_time");
  const list = visits ?? [];
  if (list.length < 2) throw new Error("Selecciona al menos dos visitas");

  const first = list[0];
  const sameCustomer = list.every((v) => v.customer_id === first.customer_id);
  const sameAddress = list.every((v) => (v.address ?? "") === (first.address ?? ""));
  const sameDate = list.every((v) => v.visit_date === first.visit_date);
  const sameInstaller = list.every((v) => v.installer_id === first.installer_id);
  if (!sameCustomer || !sameAddress || !sameDate || !sameInstaller) {
    throw new Error(
      "Solo se pueden agrupar visitas del mismo cliente, dirección, fecha e instalador",
    );
  }

  const allServices = list.flatMap((v) => v.services ?? []);
  const duration = computeVisitDuration(
    allServices.map((s: Record<string, unknown>) => ({
      duration_minutes: s["duration_minutes"] as number,
      addon_duration_minutes: (s["duration_minutes"] as number) / 2,
      quantity: s["quantity"] as number,
    })),
  );
  const startTime = list.reduce(
    (min, v) => (toMinutes(v.start_time) < toMinutes(min) ? v.start_time : min),
    first.start_time as string,
  );

  // Todos los trabajos pasan a la primera visita; el desplazamiento se cobra una sola vez.
  const others = list.filter((v) => v.id !== first.id);
  await db
    .from("visit_services")
    .update({ visit_id: first.id })
    .in(
      "visit_id",
      others.map((v) => v.id),
    );

  await db.from("visits").update({ allow_overlap: true }).eq("id", first.id);
  await db
    .from("visits")
    .delete()
    .in(
      "id",
      others.map((v) => v.id),
    );

  const { error } = await db
    .from("visits")
    .update({
      start_time: startTime,
      end_time: toTime(toMinutes(startTime) + duration),
      allow_overlap: false,
    })
    .eq("id", first.id);
  if (error) throw new Error(translateDbError(error.message));

  await recalcVisit(db, first.id as string);
  return { visitId: first.id as string };
};

/** Separa trabajos de una visita creando una visita nueva independiente. */
export const splitVisit = async (
  db: Db,
  params: {
    visitId: string;
    visitServiceIds: string[];
    date: string;
    startTime: string;
    installerId: string | null;
    force: boolean;
  },
) => {
  const { data: visit } = await db.from("visits").select("*").eq("id", params.visitId).single();
  if (!visit) throw new Error("Visita no encontrada");

  const { data: moving } = await db
    .from("visit_services")
    .select("*")
    .in("id", params.visitServiceIds);
  const rows = moving ?? [];
  if (rows.length === 0) throw new Error("Selecciona los trabajos que quieres separar");

  const { count } = await db
    .from("visit_services")
    .select("id", { count: "exact", head: true })
    .eq("visit_id", params.visitId);
  if ((count ?? 0) <= rows.length) {
    throw new Error("Debe quedar al menos un trabajo en la visita original");
  }

  const duration = computeVisitDuration(
    rows.map((r) => ({
      duration_minutes: r.duration_minutes as number,
      addon_duration_minutes: r.duration_minutes as number,
      quantity: r.quantity as number,
    })),
  );

  const { data: created, error: createError } = await db
    .from("visits")
    .insert({
      customer_id: visit.customer_id,
      installer_id: params.installerId ?? visit.installer_id,
      visit_date: params.date,
      start_time: params.startTime,
      end_time: toTime(toMinutes(params.startTime) + duration),
      address: visit.address,
      city: visit.city,
      status: visit.status,
      distance_km: visit.distance_km,
      distance_fee: visit.distance_fee, // desplazamiento propio de la nueva visita
      allow_overlap: params.force,
      notes: visit.notes,
    })
    .select("id")
    .single();
  if (createError || !created) throw new Error(translateDbError(createError?.message ?? "Error"));

  await db
    .from("visit_services")
    .update({ visit_id: created.id })
    .in("id", params.visitServiceIds);

  await recalcVisit(db, created.id as string);
  await recalcVisit(db, params.visitId);
  return { newVisitId: created.id as string };
};

export const addServiceToVisit = async (
  db: Db,
  params: { visitId: string; serviceId: string; express: boolean; quantity: number },
) => {
  const { data: service } = await db
    .from("services")
    .select("*")
    .eq("id", params.serviceId)
    .single();
  if (!service) throw new Error("Servicio no encontrado");

  const { count } = await db
    .from("visit_services")
    .select("id", { count: "exact", head: true })
    .eq("visit_id", params.visitId);
  const isAddon = (count ?? 0) > 0;
  const rules = await getPricingRules(db);
  const expressFee = params.express ? Number(service.express_fee) : 0;

  const { error } = await db.from("visit_services").insert({
    visit_id: params.visitId,
    service_id: service.id,
    service_name: service.name,
    specialty: service.specialty,
    quantity: params.quantity,
    base_price: Number(service.base_price), // precio congelado
    duration_minutes: isAddon ? service.addon_duration_minutes : service.duration_minutes,
    express: params.express && service.express_available,
    express_fee: rules.expressPerService ? expressFee : 0,
    subtotal: round2(Number(service.base_price) * params.quantity + expressFee),
  });
  if (error) throw new Error(error.message);
  await recalcVisit(db, params.visitId);
  return { ok: true as const };
};

export const groupingSuggestions = async (db: Db, fromDate: string) => {
  const toDate = addDays(fromDate, 30);
  const { data } = await db
    .from("visits")
    .select("id, customer_id, address, visit_date, start_time, end_time, installer_id, customer:customers(name)")
    .gte("visit_date", fromDate)
    .lte("visit_date", toDate)
    .neq("status", "cancelled");
  const visits = data ?? [];
  const groups = new Map<string, typeof visits>();
  for (const v of visits) {
    const key = `${v.customer_id}|${v.address ?? ""}|${v.visit_date}|${v.installer_id ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => ({
      customerName: (g[0]?.customer as { name?: string } | null)?.name ?? "Cliente",
      date: g[0]?.visit_date as string,
      address: (g[0]?.address as string) ?? "",
      visitIds: g.map((v) => v.id as string),
      count: g.length,
    }));
};
