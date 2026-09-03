import type { Db } from "./admin.server";
import {
  addDays,
  generateSlotsForDate,
  installerMatches,
  toMinutes,
  toTime,
  type Block,
  type InstallerLite,
  type ScheduledVisit,
  type WeeklySchedule,
} from "./scheduling";
import { zoneFeeForDistance } from "./visits.server";

export const EXPRESS_WINDOW_HOURS = 24;

const toInstallerLite = (i: Record<string, unknown>): InstallerLite => ({
  id: i["id"] as string,
  name: i["name"] as string,
  specialties: (i["specialties"] ?? []) as string[],
  zones: (i["zones"] ?? []) as string[],
  max_visit_minutes: i["max_visit_minutes"] as number,
  express_enabled: i["express_enabled"] as boolean,
  active: i["active"] as boolean,
});

/** Panel de instaladores: ficha, horario semanal, bloqueos y carga de trabajo. */
export const loadInstallersPanel = async (db: Db) => {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = addDays(today, 30);
  const [installers, schedules, blocks, visits, requests, services] = await Promise.all([
    db.from("installers").select("*").order("name"),
    db.from("installer_schedules").select("*").order("weekday"),
    db.from("installer_blocks").select("*").gte("end_date", today).order("start_date"),
    db
      .from("visits")
      .select("id, installer_id, visit_date, start_time, end_time, status")
      .gte("visit_date", today)
      .lte("visit_date", horizon),
    db
      .from("requests")
      .select("id, installer_id, status")
      .not("installer_id", "is", null),
    db.from("services").select("specialty").eq("active", true),
  ]);

  const specialties = [
    ...new Set((services.data ?? []).map((s) => s.specialty as string).filter(Boolean)),
  ].sort();

  const visitRows = (visits.data ?? []) as ScheduledVisit[];
  const requestRows = (requests.data ?? []) as { installer_id: string | null; status: string }[];

  return {
    installers: installers.data ?? [],
    schedules: (schedules.data ?? []) as WeeklySchedule[],
    blocks: blocks.data ?? [],
    specialties,
    workload: (installers.data ?? []).map((i) => {
      const id = i["id"] as string;
      const own = visitRows.filter((v) => v.installer_id === id && v.status !== "cancelled");
      return {
        installerId: id,
        upcomingVisits: own.length,
        upcomingMinutes: own.reduce(
          (acc, v) => acc + (toMinutes(v.end_time) - toMinutes(v.start_time)),
          0,
        ),
        openRequests: requestRows.filter(
          (r) => r.installer_id === id && r.status !== "done" && r.status !== "cancelled",
        ).length,
      };
    }),
  };
};

type EarliestParams = {
  requestId: string;
  days?: number | undefined;
};

/**
 * Busca el primer hueco libre de CADA instalador compatible con la solicitud.
 * Cada instalador tiene su propio calendario: varios pueden hacer el mismo
 * trabajo, y el ranking se ordena por la hora disponible más cercana.
 */
export const earliestInstallerSlots = async (db: Db, params: EarliestParams) => {
  const { data: request } = await db
    .from("requests")
    .select("*, items:request_items(*), customer:customers(*)")
    .eq("id", params.requestId)
    .maybeSingle();
  if (!request) throw new Error("Solicitud no encontrada");

  const duration = Math.max(30, Number(request.duration_minutes) || 60);
  const requiredSpecialties = [
    ...new Set(
      ((request.items ?? []) as { specialty: string | null }[])
        .map((i) => i.specialty)
        .filter(Boolean) as string[],
    ),
  ];

  const zone = await zoneFeeForDistance(db, Number(request.distance_km) || 0);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowTime = toTime(now.getUTCHours() * 60 + now.getUTCMinutes());
  const express = Boolean(request.express);
  const days = express ? 2 : Math.min(45, Math.max(1, params.days ?? 21));
  const toDate = addDays(today, days - 1);

  const [installersRes, schedulesRes, blocksRes, visitsRes] = await Promise.all([
    db.from("installers").select("*").eq("active", true).order("name"),
    db.from("installer_schedules").select("*"),
    db
      .from("installer_blocks")
      .select("*")
      .lte("start_date", toDate)
      .gte("end_date", today),
    db
      .from("visits")
      .select("id, installer_id, visit_date, start_time, end_time, status")
      .gte("visit_date", today)
      .lte("visit_date", toDate)
      .neq("status", "cancelled"),
  ]);

  const schedules = (schedulesRes.data ?? []) as WeeklySchedule[];
  const blocks = (blocksRes.data ?? []) as Block[];
  const visits = (visitsRes.data ?? []) as ScheduledVisit[];

  const expressLimit = now.getTime() + EXPRESS_WINDOW_HOURS * 60 * 60 * 1000;

  const results = (installersRes.data ?? []).map((raw) => {
    const installer = toInstallerLite(raw);
    const qualified = installerMatches(installer, {
      specialties: requiredSpecialties,
      zone: zone.zoneName,
    });
    if (!qualified || (express && !installer.express_enabled)) {
      return {
        installerId: installer.id,
        name: installer.name,
        color: (raw["color"] as string) ?? "#f97316",
        qualified: false,
        reason: express && !installer.express_enabled ? "Sin Express" : "Sin especialidad o zona",
        slot: null as null | { date: string; startTime: string; endTime: string; iso: string },
      };
    }

    for (let i = 0; i < days; i += 1) {
      const date = addDays(today, i);
      const slots = generateSlotsForDate({
        date,
        durationMinutes: duration,
        installers: [installer],
        schedules,
        blocks,
        visits,
        stepMinutes: 30,
        notBefore: { date: today, time: nowTime },
      }).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
      const first = slots[0];
      if (!first) continue;
      const iso = new Date(`${date}T${first.startTime}:00`).toISOString();
      if (express && new Date(iso).getTime() > expressLimit) break;
      return {
        installerId: installer.id,
        name: installer.name,
        color: (raw["color"] as string) ?? "#f97316",
        qualified: true,
        reason: null as string | null,
        slot: { date, startTime: first.startTime, endTime: first.endTime, iso },
      };
    }

    return {
      installerId: installer.id,
      name: installer.name,
      color: (raw["color"] as string) ?? "#f97316",
      qualified: true,
      reason: express ? "Sin huecos en 24 h" : "Sin huecos en el periodo",
      slot: null as null | { date: string; startTime: string; endTime: string; iso: string },
    };
  });

  const ranked = [...results].sort((a, b) => {
    if (a.slot && b.slot) return a.slot.iso.localeCompare(b.slot.iso);
    if (a.slot) return -1;
    if (b.slot) return 1;
    if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    requestId: request.id as string,
    durationMinutes: duration,
    requiredSpecialties,
    zoneName: zone.zoneName,
    express,
    // El primero del ranking es el instalador con la hora más cercana.
    recommendedInstallerId: ranked.find((r) => r.slot)?.installerId ?? null,
    candidates: ranked,
  };
};

export const assignRequestInstaller = async (
  db: Db,
  params: { requestId: string; installerId: string | null },
) => {
  if (params.installerId) {
    const { data: installer } = await db
      .from("installers")
      .select("id, name, active")
      .eq("id", params.installerId)
      .maybeSingle();
    if (!installer) throw new Error("Instalador no encontrado");
    if (!installer.active) throw new Error("Ese instalador está desactivado");
  }

  const { error } = await db
    .from("requests")
    .update({
      installer_id: params.installerId,
      assigned_at: params.installerId ? new Date().toISOString() : null,
    })
    .eq("id", params.requestId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
};

export const deleteInstaller = async (db: Db, id: string) => {
  const { count } = await db
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("installer_id", id);
  if ((count ?? 0) > 0) {
    // Nunca se borra el histórico: se desactiva para conservar las visitas.
    const { error } = await db.from("installers").update({ active: false }).eq("id", id);
    if (error) throw new Error(error.message);
    return { deleted: false as const, deactivated: true as const };
  }
  const { error } = await db.from("installers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { deleted: true as const, deactivated: false as const };
};
