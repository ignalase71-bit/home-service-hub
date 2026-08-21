/**
 * Núcleo de reglas de agenda y precios. Módulo puro (sin acceso a red ni a
 * base de datos) para poder usarse tanto en el servidor como en el cliente.
 *
 * Reglas fundamentales:
 *  - La ocupación es POR INSTALADOR. Dos instaladores distintos pueden tener
 *    trabajos a la misma hora sin ningún conflicto.
 *  - Existe conflicto solo con: mismo instalador + misma fecha + solapamiento.
 *  - Una VISITA es un desplazamiento y puede contener varios TRABAJOS.
 *  - El desplazamiento se cobra una vez por visita, no por trabajo.
 */

export const toMinutes = (time: string): number => {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
};

export const toTime = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const formatRange = (start: string, end: string) =>
  `${start.slice(0, 5)}–${end.slice(0, 5)}`;

export const overlaps = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean => toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);

export type ScheduledVisit = {
  id: string;
  installer_id: string | null;
  visit_date: string;
  start_time: string;
  end_time: string;
  status?: string;
};

export type ConflictCheck = {
  installerId: string;
  date: string;
  startTime: string;
  endTime: string;
  excludeVisitId?: string | null;
};

/** Devuelve las visitas del MISMO instalador que se solapan realmente. */
export const findInstallerConflicts = <T extends ScheduledVisit>(
  visits: T[],
  check: ConflictCheck,
): T[] =>
  visits.filter(
    (v) =>
      v.installer_id === check.installerId &&
      v.visit_date === check.date &&
      v.id !== check.excludeVisitId &&
      v.status !== "cancelled" &&
      overlaps(check.startTime, check.endTime, v.start_time, v.end_time),
  );

export type ServiceDurationInput = {
  duration_minutes: number;
  addon_duration_minutes: number;
  quantity?: number;
};

/**
 * Duración de una visita con varios trabajos.
 * El trabajo principal (el más largo) aporta su duración completa; el resto
 * aportan su "duración adicional en visita existente" (configurable por
 * servicio). Nunca se suma de forma rígida.
 */
export const computeVisitDuration = (services: ServiceDurationInput[]): number => {
  if (services.length === 0) return 0;
  const expanded: ServiceDurationInput[] = [];
  for (const s of services) {
    const qty = Math.max(1, s.quantity ?? 1);
    for (let i = 0; i < qty; i += 1) expanded.push(s);
  }
  const sorted = [...expanded].sort((a, b) => b.duration_minutes - a.duration_minutes);
  const [primary, ...rest] = sorted;
  return (
    (primary?.duration_minutes ?? 0) +
    rest.reduce((sum, s) => sum + s.addon_duration_minutes, 0)
  );
};

export type PricingRules = {
  expressPerService: boolean;
  expressFee: number;
};

export const defaultPricingRules: PricingRules = {
  expressPerService: true,
  expressFee: 100,
};

export type PricedItem = {
  base_price: number;
  quantity?: number;
  extras?: number;
  express?: boolean;
  express_fee?: number;
};

export type VisitTotals = {
  servicesTotal: number;
  expressTotal: number;
  distanceFee: number;
  total: number;
};

/** Totales de una visita: servicios + Express + UN solo desplazamiento. */
export const computeVisitTotals = (
  items: PricedItem[],
  options: { distanceFee: number; rules?: PricingRules },
): VisitTotals => {
  const rules = options.rules ?? defaultPricingRules;
  const servicesTotal = items.reduce(
    (sum, i) => sum + (i.base_price + (i.extras ?? 0)) * Math.max(1, i.quantity ?? 1),
    0,
  );
  const expressItems = items.filter((i) => i.express);
  const expressTotal = rules.expressPerService
    ? expressItems.reduce((sum, i) => sum + (i.express_fee ?? rules.expressFee), 0)
    : expressItems.length > 0
      ? (expressItems[0]?.express_fee ?? rules.expressFee)
      : 0;
  const distanceFee = options.distanceFee;
  return {
    servicesTotal: round2(servicesTotal),
    expressTotal: round2(expressTotal),
    distanceFee: round2(distanceFee),
    total: round2(servicesTotal + expressTotal + distanceFee),
  };
};

export const round2 = (value: number) => Math.round(value * 100) / 100;

export const formatEuro = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

/* ---------------------------------------------------------------------- */
/* Generación de huecos disponibles                                        */
/* ---------------------------------------------------------------------- */

export type WeeklySchedule = {
  installer_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type Block = {
  installer_id: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
};

export type InstallerLite = {
  id: string;
  name: string;
  specialties: string[];
  zones: string[];
  max_visit_minutes: number;
  express_enabled: boolean;
  active: boolean;
};

export type Slot = {
  date: string;
  startTime: string;
  endTime: string;
  installerId: string;
  installerName: string;
};

export const weekdayOf = (isoDate: string): number => {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.getUTCDay();
};

export const isBlocked = (
  blocks: Block[],
  installerId: string,
  date: string,
  startTime: string,
  endTime: string,
): boolean =>
  blocks.some((b) => {
    if (b.installer_id !== installerId) return false;
    if (date < b.start_date || date > b.end_date) return false;
    if (!b.start_time || !b.end_time) return true; // día completo / vacaciones
    return overlaps(startTime, endTime, b.start_time, b.end_time);
  });

export const installerMatches = (
  installer: InstallerLite,
  requirements: { specialties: string[]; zone?: string | null },
): boolean => {
  if (!installer.active) return false;
  const hasSpecialties = requirements.specialties.every((s) =>
    installer.specialties.includes(s),
  );
  const hasZone = !requirements.zone || installer.zones.includes(requirements.zone);
  return hasSpecialties && hasZone;
};

/**
 * Genera los huecos reales para una fecha concreta considerando SOLO los
 * instaladores compatibles. Un hueco existe si al menos un instalador
 * compatible está libre: la agenda de otro instalador nunca bloquea la fecha.
 */
export const generateSlotsForDate = (params: {
  date: string;
  durationMinutes: number;
  installers: InstallerLite[];
  schedules: WeeklySchedule[];
  blocks: Block[];
  visits: ScheduledVisit[];
  stepMinutes?: number;
  notBefore?: { date: string; time: string } | null;
}): Slot[] => {
  const step = params.stepMinutes ?? 30;
  const weekday = weekdayOf(params.date);
  const slots: Slot[] = [];

  for (const installer of params.installers) {
    if (params.durationMinutes > installer.max_visit_minutes) continue;
    const windows = params.schedules.filter(
      (s) => s.installer_id === installer.id && s.weekday === weekday,
    );
    for (const w of windows) {
      const from = toMinutes(w.start_time);
      const until = toMinutes(w.end_time) - params.durationMinutes;
      for (let start = from; start <= until; start += step) {
        const startTime = toTime(start);
        const endTime = toTime(start + params.durationMinutes);
        if (
          params.notBefore &&
          (params.date < params.notBefore.date ||
            (params.date === params.notBefore.date &&
              toMinutes(startTime) < toMinutes(params.notBefore.time)))
        ) {
          continue;
        }
        if (isBlocked(params.blocks, installer.id, params.date, startTime, endTime)) continue;
        const conflicts = findInstallerConflicts(params.visits, {
          installerId: installer.id,
          date: params.date,
          startTime,
          endTime,
        });
        if (conflicts.length > 0) continue;
        slots.push({
          date: params.date,
          startTime,
          endTime,
          installerId: installer.id,
          installerName: installer.name,
        });
      }
    }
  }
  return slots;
};

export const addDays = (isoDate: string, days: number): string => {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const startOfWeek = (isoDate: string): string => {
  const wd = weekdayOf(isoDate);
  const diff = wd === 0 ? -6 : 1 - wd; // lunes
  return addDays(isoDate, diff);
};

export const formatVisitNumber = (n: number | null | undefined) =>
  `#${String(n ?? 0).padStart(6, "0")}`;

export const formatDateES = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/** Grado de disponibilidad de un instalador para un hueco concreto. */
export type AvailabilityState = "available" | "nearby" | "busy" | "unqualified";

export const installerAvailabilityState = (params: {
  installer: InstallerLite;
  date: string;
  startTime: string;
  endTime: string;
  schedules: WeeklySchedule[];
  blocks: Block[];
  visits: ScheduledVisit[];
  requiredSpecialties: string[];
  zone?: string | null;
  excludeVisitId?: string | null;
}): AvailabilityState => {
  const {
    installer,
    date,
    startTime,
    endTime,
    schedules,
    blocks,
    visits,
    requiredSpecialties,
    zone,
    excludeVisitId,
  } = params;
  if (!installerMatches(installer, { specialties: requiredSpecialties, zone })) {
    return "unqualified";
  }
  const conflicts = findInstallerConflicts(visits, {
    installerId: installer.id,
    date,
    startTime,
    endTime,
    excludeVisitId: excludeVisitId ?? null,
  });
  if (conflicts.length > 0) return "busy";
  if (isBlocked(blocks, installer.id, date, startTime, endTime)) return "busy";
  const weekday = weekdayOf(date);
  const inSchedule = schedules.some(
    (s) =>
      s.installer_id === installer.id &&
      s.weekday === weekday &&
      toMinutes(s.start_time) <= toMinutes(startTime) &&
      toMinutes(s.end_time) >= toMinutes(endTime),
  );
  if (!inSchedule) return "busy";
  const nearby = visits.some(
    (v) =>
      v.installer_id === installer.id &&
      v.visit_date === date &&
      v.id !== excludeVisitId &&
      v.status !== "cancelled" &&
      Math.min(
        Math.abs(toMinutes(v.start_time) - toMinutes(endTime)),
        Math.abs(toMinutes(startTime) - toMinutes(v.end_time)),
      ) <= 60,
  );
  return nearby ? "nearby" : "available";
};
