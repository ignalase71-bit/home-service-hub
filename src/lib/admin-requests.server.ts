import type { Db } from "./admin.server";

export const EXPRESS_WINDOW_HOURS = 24;

export const loadRequests = async (db: Db) => {
  const { data, error } = await db
    .from("requests")
    .select("*, customer:customers(*), items:request_items(*)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
};

const isoDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha no válida");
  return d;
};

/**
 * El administrador propone hasta 3 fechas. En solicitudes EXPRESS todas las
 * fechas deben caer dentro de las próximas 24 horas.
 */
export const proposeSlots = async (
  db: Db,
  params: { requestId: string; slots: string[]; note?: string | null | undefined },
) => {
  const { data: request } = await db
    .from("requests")
    .select("id, express")
    .eq("id", params.requestId)
    .maybeSingle();
  if (!request) throw new Error("Solicitud no encontrada");

  const slots = params.slots.filter(Boolean);
  if (slots.length === 0) throw new Error("Introduce al menos una fecha propuesta");

  const now = Date.now();
  const limit = now + EXPRESS_WINDOW_HOURS * 60 * 60 * 1000;
  const dates = slots.map(isoDate);

  if (request.express) {
    const outside = dates.filter((d) => d.getTime() < now || d.getTime() > limit);
    if (outside.length > 0) {
      throw new Error(
        `🚀 Solicitud EXPRESS: las fechas propuestas deben estar dentro de las próximas ${EXPRESS_WINDOW_HOURS} h.`,
      );
    }
  }

  const { error } = await db
    .from("requests")
    .update({
      proposed_slot_1: dates[0]?.toISOString() ?? null,
      proposed_slot_2: dates[1]?.toISOString() ?? null,
      proposed_slot_3: dates[2]?.toISOString() ?? null,
      proposal_note: params.note ?? null,
      chosen_slot: null,
      chosen_at: null,
      status: "slots_proposed",
    })
    .eq("id", params.requestId);
  if (error) throw new Error(error.message);

  return {
    ok: true as const,
    proposed: dates.length,
    expressIncomplete: Boolean(request.express) && dates.length < 3,
  };
};

export const updateRequestStatus = async (db: Db, requestId: string, status: string) => {
  const { error } = await db.from("requests").update({ status }).eq("id", requestId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
};
