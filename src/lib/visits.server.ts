import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeVisitDuration,
  computeVisitTotals,
  defaultPricingRules,
  round2,
  toMinutes,
  toTime,
  type PricingRules,
} from "./scheduling";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export const getPricingRules = async (db: Client): Promise<PricingRules> => {
  const { data } = await db.from("settings").select("value").eq("key", "pricing").maybeSingle();
  const value = (data?.value ?? {}) as Record<string, unknown>;
  return {
    expressPerService:
      typeof value["express_per_service"] === "boolean"
        ? (value["express_per_service"] as boolean)
        : defaultPricingRules.expressPerService,
    expressFee:
      typeof value["express_fee"] === "number"
        ? (value["express_fee"] as number)
        : defaultPricingRules.expressFee,
  };
};

export const zoneFeeForDistance = async (db: Client, distanceKm: number) => {
  const { data } = await db
    .from("zones")
    .select("name, max_km, fee")
    .eq("active", true)
    .order("max_km", { ascending: true });
  const zone = (data ?? []).find((z) => distanceKm <= z.max_km);
  return { fee: Number(zone?.fee ?? 0), zoneName: zone?.name ?? null };
};

/**
 * Recalcula duración y totales de una visita a partir de sus trabajos.
 * Los precios de cada trabajo NO se recalculan: quedan congelados en el
 * momento de la contratación (histórico intacto).
 */
export const recalcVisit = async (db: Client, visitId: string) => {
  const { data: visit, error: visitError } = await db
    .from("visits")
    .select("*")
    .eq("id", visitId)
    .single();
  if (visitError || !visit) throw new Error("Visita no encontrada");

  const { data: rows } = await db
    .from("visit_services")
    .select("*")
    .eq("visit_id", visitId);
  const services = rows ?? [];

  const duration = computeVisitDuration(
    services.map((s) => ({
      duration_minutes: s.duration_minutes,
      addon_duration_minutes: s.addon_duration_minutes ?? Math.round(s.duration_minutes / 2),
      quantity: s.quantity,
    })),
  );

  const rules = await getPricingRules(db);
  const totals = computeVisitTotals(
    services.map((s) => ({
      base_price: Number(s.base_price),
      quantity: s.quantity,
      extras: Number(s.extras ?? 0),
      express: s.express,
      express_fee: Number(s.express_fee ?? rules.expressFee),
    })),
    { distanceFee: Number(visit.distance_fee ?? 0), rules },
  );

  const start = toMinutes(visit.start_time);
  const endTime = duration > 0 ? toTime(start + duration) : visit.end_time;

  const installerCost = round2(
    services.reduce((sum, s) => sum + Number(s.installer_cost ?? 0), 0),
  );

  const { error } = await db
    .from("visits")
    .update({
      end_time: endTime,
      services_total: totals.servicesTotal,
      express_total: totals.expressTotal,
      total: totals.total,
      installer_cost: installerCost,
      express: services.some((s) => s.express),
    })
    .eq("id", visitId);
  if (error) throw new Error(translateDbError(error.message));

  return { duration, endTime, totals };
};

export const translateDbError = (message: string): string => {
  if (message.includes("CONFLICT_INSTALLER_BUSY")) {
    const match = message.match(/CONFLICT_INSTALLER_BUSY: (\S+) - (\S+)/);
    const from = match?.[1]?.slice(0, 5) ?? "";
    const to = match?.[2]?.slice(0, 5) ?? "";
    return `⚠️ Este instalador ya tiene un trabajo asignado entre las ${from} y las ${to}.`;
  }
  return message;
};
