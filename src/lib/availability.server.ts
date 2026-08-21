import { internalDb } from "./booking.server";
import {
  addDays,
  computeVisitDuration,
  computeVisitTotals,
  generateSlotsForDate,
  installerMatches,
  round2,
  toMinutes,
  toTime,
  type Block,
  type InstallerLite,
  type ScheduledVisit,
  type WeeklySchedule,
} from "./scheduling";
import { getPricingRules, translateDbError, zoneFeeForDistance } from "./visits.server";

type AvailabilityInput = {
  serviceIds: string[];
  distanceKm: number;
  express: boolean;
  fromDate: string;
  days: number;
};

const loadSchedulingContext = async (params: {
  serviceIds: string[];
  distanceKm: number;
  fromDate: string;
  toDate: string;
}) => {
  const db = internalDb();
  const [servicesRes, installersRes, schedulesRes, blocksRes, visitsRes] = await Promise.all([
    db.from("services").select("*").in("id", params.serviceIds).eq("active", true),
    db.from("installers").select("*").eq("active", true),
    db.from("installer_schedules").select("*"),
    db.from("installer_blocks").select("*").lte("start_date", params.toDate).gte("end_date", params.fromDate),
    db
      .from("visits")
      .select("id, installer_id, visit_date, start_time, end_time, status")
      .gte("visit_date", params.fromDate)
      .lte("visit_date", params.toDate)
      .neq("status", "cancelled"),
  ]);

  const services = servicesRes.data ?? [];
  if (services.length !== params.serviceIds.length) {
    throw new Error("Alguno de los servicios seleccionados ya no está disponible");
  }

  const zone = await zoneFeeForDistance(db, params.distanceKm);
  const requiredSpecialties = [...new Set(services.map((s) => s.specialty as string))];

  const installers: InstallerLite[] = (installersRes.data ?? []).map((i) => ({
    id: i.id as string,
    name: i.name as string,
    specialties: (i.specialties ?? []) as string[],
    zones: (i.zones ?? []) as string[],
    max_visit_minutes: i.max_visit_minutes as number,
    express_enabled: i.express_enabled as boolean,
    active: i.active as boolean,
  }));

  const compatible = installers.filter((i) =>
    installerMatches(i, { specialties: requiredSpecialties, zone: zone.zoneName }),
  );

  const duration = computeVisitDuration(
    services.map((s) => ({
      duration_minutes: s.duration_minutes as number,
      addon_duration_minutes: s.addon_duration_minutes as number,
    })),
  );

  return {
    db,
    services,
    zone,
    duration,
    requiredSpecialties,
    compatible,
    schedules: (schedulesRes.data ?? []) as WeeklySchedule[],
    blocks: (blocksRes.data ?? []) as Block[],
    visits: (visitsRes.data ?? []) as ScheduledVisit[],
  };
};

/**
 * Huecos reales visibles por el cliente. Nunca se expone qué instalador
 * realizará el trabajo ni la agenda interna: solo fecha y franja horaria.
 */
export const computePublicAvailability = async (input: AvailabilityInput) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowTime = toTime(now.getUTCHours() * 60 + now.getUTCMinutes());

  const fromDate = input.fromDate < today ? today : input.fromDate;
  const days = input.express ? 2 : input.days;
  const toDate = addDays(fromDate, days - 1);

  const ctx = await loadSchedulingContext({
    serviceIds: input.serviceIds,
    distanceKm: input.distanceKm,
    fromDate,
    toDate,
  });

  const expressInstallers = input.express
    ? ctx.compatible.filter((i) => i.express_enabled)
    : ctx.compatible;

  // Express: solo huecos dentro de las próximas 24 horas.
  const expressLimitDate = input.express ? addDays(today, 1) : null;

  const daysOut: {
    date: string;
    slots: { startTime: string; endTime: string }[];
  }[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = addDays(fromDate, i);
    if (expressLimitDate && date > expressLimitDate) break;
    const slots = generateSlotsForDate({
      date,
      durationMinutes: ctx.duration,
      installers: expressInstallers,
      schedules: ctx.schedules,
      blocks: ctx.blocks,
      visits: ctx.visits,
      stepMinutes: 30,
      notBefore: { date: today, time: nowTime },
    }).filter((slot) => {
      if (!expressLimitDate) return true;
      if (date === expressLimitDate) return toMinutes(slot.startTime) <= toMinutes(nowTime);
      return true;
    });

    const unique = new Map<string, { startTime: string; endTime: string }>();
    for (const slot of slots) {
      unique.set(slot.startTime, { startTime: slot.startTime, endTime: slot.endTime });
    }
    if (unique.size > 0) {
      daysOut.push({
        date,
        slots: [...unique.values()].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
      });
    }
  }

  const rules = await getPricingRules(ctx.db);
  const totals = computeVisitTotals(
    ctx.services.map((s) => ({
      base_price: Number(s.base_price),
      express: input.express && (s.express_available as boolean),
      express_fee: Number(s.express_fee),
    })),
    { distanceFee: ctx.zone.fee, rules },
  );

  return {
    durationMinutes: ctx.duration,
    zoneName: ctx.zone.zoneName,
    distanceFee: ctx.zone.fee,
    totals,
    expressAvailable: input.express ? daysOut.length > 0 : undefined,
    days: daysOut,
    compatibleInstallers: ctx.compatible.length,
  };
};

type BookingInput = {
  customer: {
    name: string;
    phone: string;
    email?: string | undefined;
    address: string;
    city: string;
    postalCode?: string | undefined;
    notes?: string | undefined;
  };
  serviceIds: string[];
  distanceKm: number;
  express: boolean;
  date: string;
  startTime: string;
};

export const submitBooking = async (input: BookingInput) => {
  const ctx = await loadSchedulingContext({
    serviceIds: input.serviceIds,
    distanceKm: input.distanceKm,
    fromDate: input.date,
    toDate: input.date,
  });
  const db = ctx.db;

  const endTime = toTime(toMinutes(input.startTime) + ctx.duration);

  const pool = input.express
    ? ctx.compatible.filter((i) => i.express_enabled)
    : ctx.compatible;

  const freeSlots = generateSlotsForDate({
    date: input.date,
    durationMinutes: ctx.duration,
    installers: pool,
    schedules: ctx.schedules,
    blocks: ctx.blocks,
    visits: ctx.visits,
    stepMinutes: 30,
  }).filter((s) => s.startTime === input.startTime);

  const chosen = freeSlots[0];
  if (!chosen) {
    throw new Error("Ese horario ya no está disponible. Elige otro hueco.");
  }

  const rules = await getPricingRules(db);

  const { data: customer, error: customerError } = await db
    .from("customers")
    .insert({
      name: input.customer.name,
      phone: input.customer.phone,
      email: input.customer.email || null,
      address: input.customer.address,
      city: input.customer.city,
      postal_code: input.customer.postalCode || null,
      distance_km: input.distanceKm,
      notes: input.customer.notes || null,
    })
    .select("id")
    .single();
  if (customerError || !customer) throw new Error("No se pudo registrar el cliente");

  const items = ctx.services.map((s) => ({
    base_price: Number(s.base_price),
    express: input.express && (s.express_available as boolean),
    express_fee: Number(s.express_fee),
  }));
  const totals = computeVisitTotals(items, { distanceFee: ctx.zone.fee, rules });

  const { data: visit, error: visitError } = await db
    .from("visits")
    .insert({
      customer_id: customer.id,
      installer_id: chosen.installerId,
      visit_date: input.date,
      start_time: input.startTime,
      end_time: endTime,
      address: input.customer.address,
      city: input.customer.city,
      status: "pending",
      express: items.some((i) => i.express),
      distance_km: input.distanceKm,
      distance_fee: ctx.zone.fee,
      services_total: totals.servicesTotal,
      express_total: totals.expressTotal,
      total: totals.total,
      notes: input.customer.notes || null,
    })
    .select("id, visit_number")
    .single();
  if (visitError || !visit) throw new Error(translateDbError(visitError?.message ?? "Error"));

  const rows = ctx.services.map((s) => {
    const express = input.express && (s.express_available as boolean);
    const expressFee = express
      ? rules.expressPerService
        ? Number(s.express_fee)
        : 0
      : 0;
    return {
      visit_id: visit.id,
      service_id: s.id,
      service_name: s.name,
      specialty: s.specialty,
      quantity: 1,
      base_price: Number(s.base_price),
      duration_minutes: s.duration_minutes,
      express,
      express_fee: expressFee,
      subtotal: round2(Number(s.base_price) + expressFee),
    };
  });
  if (!rules.expressPerService && rows.some((r) => r.express)) {
    const first = rows.find((r) => r.express);
    if (first) {
      first.express_fee = rules.expressFee;
      first.subtotal = round2(first.base_price + rules.expressFee);
    }
  }
  const { error: rowsError } = await db.from("visit_services").insert(rows);
  if (rowsError) throw new Error(rowsError.message);

  return {
    visitId: visit.id as string,
    visitNumber: visit.visit_number as number,
    date: input.date,
    startTime: input.startTime,
    endTime,
    totals,
  };
};
