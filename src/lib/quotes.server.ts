import { internalDb } from "./booking.server";
import {
  addDays,
  computeRequiredProfessionals,
  computeVisitDuration,
  computeVisitTotals,
  generateSlotsForDate,
  round2,
  toMinutes,
  toTime,
  type Block,
  type InstallerLite,
  type ProfessionalCapability,
  type ScheduledVisit,
  type VisitTotals,
  type WeeklySchedule,
} from "./scheduling";
import { getPricingRules, zoneFeeForDistance } from "./visits.server";


export type QuoteItemInput = { serviceId: string; quantity: number };

export type QuoteLine = {
  serviceId: string;
  name: string;
  specialty: string;
  quantity: number;
  unitPrice: number;
  express: boolean;
  expressFee: number;
  durationMinutes: number;
  subtotal: number;
};

export type Quote = {
  lines: QuoteLine[];
  totals: VisitTotals;
  durationMinutes: number;
  zoneName: string | null;
  distanceFee: number;
  express: boolean;
  expressAvailable: boolean;
  /** Motivo por el que el Express no se puede contratar (mensaje de servicio). */
  expressUnavailableReason: string | null;
  /** Nº de profesionales/equipos distintos necesarios (uso interno/admin). */
  professionalsRequired: number;
};


/**
 * Capacidades de los profesionales activos: qué tipos de trabajo puede hacer
 * cada uno. Fuente principal: tabla installer_services. Fallback seguro:
 * la especialidad del servicio frente a las especialidades del instalador.
 */
export const loadProfessionalCapabilities = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  options: { expressOnly?: boolean } = {},
): Promise<ProfessionalCapability[]> => {
  const [installersRes, linksRes, servicesRes] = await Promise.all([
    db.from("installers").select("id, specialties, active, express_enabled").eq("active", true),
    db.from("installer_services").select("installer_id, service_id"),
    db.from("services").select("id, specialty"),
  ]);
  const installers = (installersRes.data ?? []) as {
    id: string;
    specialties: string[] | null;
    express_enabled: boolean;
  }[];
  const links = (linksRes.data ?? []) as { installer_id: string; service_id: string }[];
  const services = (servicesRes.data ?? []) as { id: string; specialty: string | null }[];

  return installers
    .filter((i) => (options.expressOnly ? i.express_enabled : true))
    .map((i) => {
      const explicit = links.filter((l) => l.installer_id === i.id).map((l) => l.service_id);
      if (explicit.length > 0) return { id: i.id, serviceIds: explicit };
      const specialties = i.specialties ?? [];
      return {
        id: i.id,
        serviceIds: services
          .filter((s) => s.specialty && specialties.includes(s.specialty))
          .map((s) => s.id),
      };
    });
};


/**
 * Presupuesto con cantidades. Reutiliza exactamente las reglas de precio
 * existentes (computeVisitTotals) añadiendo la multiplicación por cantidad.
 */
export const computeQuote = async (input: {
  items: QuoteItemInput[];
  distanceKm: number;
  express: boolean;
}): Promise<Quote> => {
  const db = internalDb();
  const ids = input.items.map((i) => i.serviceId);
  const { data } = await db.from("services").select("*").in("id", ids).eq("active", true);
  const services = data ?? [];
  if (services.length !== new Set(ids).size) {
    throw new Error("Alguno de los servicios seleccionados ya no está disponible");
  }

  const rules = await getPricingRules(db);
  const zone = await zoneFeeForDistance(db, input.distanceKm);

  const lines: QuoteLine[] = input.items.map((item) => {
    const service = services.find((s) => s.id === item.serviceId)!;
    const quantity = Math.max(1, Math.round(item.quantity));
    const unitPrice = Number(service.base_price);
    const express = input.express && Boolean(service.express_available);
    return {
      serviceId: service.id as string,
      name: service.name as string,
      specialty: service.specialty as string,
      quantity,
      unitPrice,
      express,
      // El Express ya no se cobra por trabajo: es una única línea del total.
      expressFee: 0,
      durationMinutes: service.duration_minutes as number,
      subtotal: round2(unitPrice * quantity),
    };
  });

  const durationMinutes = computeVisitDuration(
    input.items.map((item) => {
      const service = services.find((s) => s.id === item.serviceId)!;
      return {
        duration_minutes: service.duration_minutes as number,
        addon_duration_minutes: service.addon_duration_minutes as number,
        quantity: Math.max(1, Math.round(item.quantity)),
      };
    }),
  );

  const uniqueIds = [...new Set(ids)];
  const catalogAllowsExpress = services.every((s) => s.express_available);

  // Profesionales/equipos necesarios (para el importe y para el nº de líneas).
  const allProfessionals = await loadProfessionalCapabilities(db);
  const required = computeRequiredProfessionals(uniqueIds, allProfessionals);

  // El Express solo se puede contratar si (1) todos los trabajos elegidos
  // están cubiertos por profesionales habilitados para Express y (2) existe
  // hueco real en las próximas 24 h para todos ellos.
  const feasibility = catalogAllowsExpress
    ? await checkExpressFeasibility(db, { serviceIds: uniqueIds, durationMinutes })
    : {
        eligible: false,
        reason: "No disponible para estos trabajos",
        professionalsRequired: required.count,
      };

  const expressAvailable = feasibility.eligible;
  const expressActive = input.express && expressAvailable;
  const professionalsRequired = expressActive
    ? Math.max(1, feasibility.professionalsRequired)
    : required.count;
  const expressTotal = expressActive
    ? round2(professionalsRequired * Number(rules.expressFee))
    : 0;

  const totals = computeVisitTotals(
    lines.map((l) => ({
      base_price: l.unitPrice,
      quantity: l.quantity,
      express: expressActive && l.express,
    })),
    { distanceFee: zone.fee, rules, expressOverride: expressTotal },
  );

  return {
    lines: lines.map((l) => ({ ...l, express: expressActive && l.express })),
    totals,
    durationMinutes,
    zoneName: zone.zoneName,
    distanceFee: zone.fee,
    express: expressActive,
    expressAvailable,
    expressUnavailableReason: expressAvailable ? null : feasibility.reason,
    professionalsRequired,
  };
};

/**
 * Comprueba que el Express es realmente contratable: cobertura de todos los
 * tipos de trabajo por profesionales habilitados para Express y hueco libre
 * en las próximas 24 horas en la agenda de cada uno de ellos.
 */
export const checkExpressFeasibility = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  params: { serviceIds: string[]; durationMinutes: number },
): Promise<{ eligible: boolean; reason: string | null; professionalsRequired: number }> => {
  const expressPros = await loadProfessionalCapabilities(db, { expressOnly: true });
  const cover = computeRequiredProfessionals(params.serviceIds, expressPros);

  if (cover.unassignedServiceIds.length > 0 || cover.professionalIds.length === 0) {
    return {
      eligible: false,
      reason: "No hay profesionales disponibles para este trabajo en 24 horas",
      professionalsRequired: cover.count,
    };
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowTime = toTime(now.getUTCHours() * 60 + now.getUTCMinutes());
  const limitDate = addDays(today, 1);

  const [installersRes, schedulesRes, blocksRes, visitsRes] = await Promise.all([
    db.from("installers").select("*").eq("active", true).eq("express_enabled", true),
    db.from("installer_schedules").select("*"),
    db
      .from("installer_blocks")
      .select("*")
      .lte("start_date", limitDate)
      .gte("end_date", today),
    db
      .from("visits")
      .select("id, installer_id, visit_date, start_time, end_time, status")
      .gte("visit_date", today)
      .lte("visit_date", limitDate)
      .neq("status", "cancelled"),
  ]);

  const installers: InstallerLite[] = (installersRes.data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((i: any) => ({
      id: i.id as string,
      name: i.name as string,
      specialties: (i.specialties ?? []) as string[],
      zones: (i.zones ?? []) as string[],
      max_visit_minutes: i.max_visit_minutes as number,
      express_enabled: i.express_enabled as boolean,
      active: i.active as boolean,
    }))
    .filter((i: InstallerLite) => cover.professionalIds.includes(i.id));

  const schedules = (schedulesRes.data ?? []) as WeeklySchedule[];
  const blocks = (blocksRes.data ?? []) as Block[];
  const visits = (visitsRes.data ?? []) as ScheduledVisit[];

  const withSlot = new Set<string>();
  for (const date of [today, limitDate]) {
    const slots = generateSlotsForDate({
      date,
      durationMinutes: params.durationMinutes,
      installers,
      schedules,
      blocks,
      visits,
      stepMinutes: 30,
      notBefore: { date: today, time: nowTime },
    }).filter((slot) =>
      date === limitDate ? toMinutes(slot.startTime) <= toMinutes(nowTime) : true,
    );
    for (const slot of slots) withSlot.add(slot.installerId);
  }

  const allFree = cover.professionalIds.every((id) => withSlot.has(id));
  return {
    eligible: allFree,
    reason: allFree ? null : "Sin huecos libres en las próximas 24 horas",
    professionalsRequired: cover.count,
  };
};


export type CustomerInput = {
  name: string;
  phone: string;
  email?: string | undefined;
  address: string;
  city: string;
  postalCode?: string | undefined;
  notes?: string | undefined;
};

/**
 * El cliente acepta el presupuesto y solicita fecha de montaje.
 * Se guarda una copia congelada de precios y cantidades.
 */
export const createQuoteRequest = async (input: {
  customer: CustomerInput;
  items: QuoteItemInput[];
  distanceKm: number;
  express: boolean;
}) => {
  const quote = await computeQuote(input);
  const db = internalDb();

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

  const { data: request, error: requestError } = await db
    .from("requests")
    .insert({
      customer_id: customer.id,
      status: "quote_accepted",
      express: input.express && quote.lines.some((l) => l.express),
      distance_km: input.distanceKm,
      distance_fee: quote.distanceFee,
      services_total: quote.totals.servicesTotal,
      express_total: quote.totals.expressTotal,
      express_professionals: quote.totals.expressTotal > 0 ? quote.professionalsRequired : 0,

      total: quote.totals.total,
      duration_minutes: quote.durationMinutes,
      notes: input.customer.notes || null,
    })
    .select("id, request_number, public_token")
    .single();
  if (requestError || !request) throw new Error("No se pudo registrar la solicitud");

  const { error: itemsError } = await db.from("request_items").insert(
    quote.lines.map((l) => ({
      request_id: request.id,
      service_id: l.serviceId,
      service_name: l.name,
      specialty: l.specialty,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      express: l.express,
      express_fee: l.expressFee,
      duration_minutes: l.durationMinutes,
      subtotal: l.subtotal,
    })),
  );
  if (itemsError) throw new Error(itemsError.message);

  return {
    requestId: request.id as string,
    requestNumber: request.request_number as number,
    token: request.public_token as string,
    totals: quote.totals,
  };
};

const publicShape = (
  request: Record<string, unknown>,
  items: Record<string, unknown>[],
  customerName: string,
) => ({
  requestNumber: request["request_number"] as number,
  status: request["status"] as string,
  express: request["express"] as boolean,
  customerName,
  createdAt: request["created_at"] as string,
  servicesTotal: Number(request["services_total"]),
  expressTotal: Number(request["express_total"]),
  distanceFee: Number(request["distance_fee"]),
  total: Number(request["total"]),
  proposedSlots: [
    request["proposed_slot_1"],
    request["proposed_slot_2"],
    request["proposed_slot_3"],
  ].filter(Boolean) as string[],
  proposalNote: (request["proposal_note"] as string | null) ?? null,
  chosenSlot: (request["chosen_slot"] as string | null) ?? null,
  items: items.map((i) => ({
    id: i["id"] as string,
    name: i["service_name"] as string,
    quantity: i["quantity"] as number,
    unitPrice: Number(i["unit_price"]),
    express: i["express"] as boolean,
    expressFee: Number(i["express_fee"]),
    subtotal: Number(i["subtotal"]),
  })),
});

/** Consulta pública por token: nunca expone teléfono, email ni agenda interna. */
export const loadRequestByToken = async (token: string) => {
  const db = internalDb();
  const { data: request } = await db
    .from("requests")
    .select("*, customer:customers(name)")
    .eq("public_token", token)
    .maybeSingle();
  if (!request) throw new Error("Solicitud no encontrada");
  const { data: items } = await db.from("request_items").select("*").eq("request_id", request.id);
  const name = (request.customer as { name?: string } | null)?.name ?? "Cliente";
  return publicShape(request as Record<string, unknown>, (items ?? []) as Record<string, unknown>[], name);
};

/** El cliente elige una de las fechas propuestas por el administrador. */
export const chooseProposedSlot = async (token: string, slotIndex: 1 | 2 | 3) => {
  const db = internalDb();
  const { data: request } = await db
    .from("requests")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (!request) throw new Error("Solicitud no encontrada");
  if (request.chosen_slot) throw new Error("Ya has elegido una fecha para este montaje");

  const slot = [request.proposed_slot_1, request.proposed_slot_2, request.proposed_slot_3][
    slotIndex - 1
  ];
  if (!slot) throw new Error("Esa opción de fecha no está disponible");

  const { error } = await db
    .from("requests")
    .update({ chosen_slot: slot, chosen_at: new Date().toISOString(), status: "slot_chosen" })
    .eq("id", request.id);
  if (error) throw new Error(error.message);
  return { chosenSlot: slot as string };
};
