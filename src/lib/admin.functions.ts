import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const rangeSchema = z.object({ fromDate: z.string(), toDate: z.string() });

export const adminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, loadOverview } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return loadOverview(context.supabase, data.fromDate, data.toDate);
  });

export const adminAvailabilityMatrix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        requiredSpecialties: z.array(z.string()).default([]),
        zone: z.string().nullable().optional(),
        excludeVisitId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, availabilityMatrix } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return availabilityMatrix(context.supabase, data);
  });

export const adminChangeInstaller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        visitId: z.string().uuid(),
        installerId: z.string().uuid(),
        force: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, changeInstaller } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return changeInstaller(context.supabase, data);
  });

export const adminMoveVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        visitId: z.string().uuid(),
        date: z.string(),
        startTime: z.string(),
        force: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, moveVisit } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return moveVisit(context.supabase, data);
  });

export const adminGroupVisits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ visitIds: z.array(z.string().uuid()).min(2) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, groupVisits } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return groupVisits(context.supabase, data.visitIds);
  });

export const adminSplitVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        visitId: z.string().uuid(),
        visitServiceIds: z.array(z.string().uuid()).min(1),
        date: z.string(),
        startTime: z.string(),
        installerId: z.string().uuid().nullable().default(null),
        force: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, splitVisit } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return splitVisit(context.supabase, data);
  });

export const adminAddServiceToVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        visitId: z.string().uuid(),
        serviceId: z.string().uuid(),
        express: z.boolean().default(false),
        quantity: z.number().min(1).max(20).default(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, addServiceToVisit } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return addServiceToVisit(context.supabase, data);
  });

export const adminRemoveVisitService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ visitServiceId: z.string().uuid(), visitId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { recalcVisit } = await import("./visits.server");
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("visit_services").delete().eq("id", data.visitServiceId);
    await recalcVisit(context.supabase, data.visitId);
    return { ok: true as const };
  });

export const adminUpdateVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        visitId: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "in_progress", "done", "cancelled"]).optional(),
        paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
        installerCost: z.number().min(0).optional(),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { translateDbError } = await import("./visits.server");
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("visits")
      .update({
        ...(data.status ? { status: data.status } : {}),
        ...(data.paymentStatus ? { payment_status: data.paymentStatus } : {}),
        ...(data.installerCost !== undefined ? { installer_cost: data.installerCost } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      })
      .eq("id", data.visitId);
    if (error) throw new Error(translateDbError(error.message));
    return { ok: true as const };
  });

export const adminGroupingSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ fromDate: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, groupingSuggestions } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return groupingSuggestions(context.supabase, data.fromDate);
  });

export const adminSaveInstaller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().default(null),
        name: z.string().min(2),
        phone: z.string().optional().default(""),
        email: z.string().optional().default(""),
        color: z.string().default("#f97316"),
        specialties: z.array(z.string()).default([]),
        zones: z.array(z.string()).default([]),
        maxVisitMinutes: z.number().min(30).max(1440).default(480),
        expressEnabled: z.boolean().default(true),
        hourlyCost: z.number().min(0).default(0),
        active: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    const payload = {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      color: data.color,
      specialties: data.specialties,
      zones: data.zones,
      max_visit_minutes: data.maxVisitMinutes,
      express_enabled: data.expressEnabled,
      hourly_cost: data.hourlyCost,
      active: data.active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("installers").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("installers")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const adminSaveSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        installerId: z.string().uuid(),
        windows: z
          .array(
            z.object({
              weekday: z.number().min(0).max(6),
              startTime: z.string(),
              endTime: z.string(),
            }),
          )
          .default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    await context.supabase
      .from("installer_schedules")
      .delete()
      .eq("installer_id", data.installerId);
    if (data.windows.length > 0) {
      const { error } = await context.supabase.from("installer_schedules").insert(
        data.windows.map((w) => ({
          installer_id: data.installerId,
          weekday: w.weekday,
          start_time: w.startTime,
          end_time: w.endTime,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const adminSaveBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        installerId: z.string().uuid(),
        kind: z.enum(["vacation", "block"]).default("block"),
        startDate: z.string(),
        endDate: z.string(),
        startTime: z.string().nullable().default(null),
        endTime: z.string().nullable().default(null),
        reason: z.string().optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("installer_blocks").insert({
      installer_id: data.installerId,
      kind: data.kind,
      start_date: data.startDate,
      end_date: data.endDate,
      start_time: data.startTime,
      end_time: data.endTime,
      reason: data.reason || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("installer_blocks").delete().eq("id", data.id);
    return { ok: true as const };
  });

export const adminSaveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().default(null),
        categoryId: z.string().uuid(),
        slug: z.string().min(2),
        name: z.string().min(2),
        description: z.string().optional().default(""),
        specialty: z.string().min(2),
        basePrice: z.number().min(0),
        durationMinutes: z.number().min(15).max(1440),
        addonDurationMinutes: z.number().min(0).max(1440),
        expressAvailable: z.boolean().default(true),
        expressFee: z.number().min(0).default(100),
        emoji: z.string().optional().default(""),
        active: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    const payload = {
      category_id: data.categoryId,
      slug: data.slug,
      name: data.name,
      description: data.description || null,
      specialty: data.specialty,
      base_price: data.basePrice,
      duration_minutes: data.durationMinutes,
      addon_duration_minutes: data.addonDurationMinutes,
      express_available: data.expressAvailable,
      express_fee: data.expressFee,
      emoji: data.emoji || null,
      active: data.active,
    };
    if (data.id) {
      // Cambiar el precio NO afecta a las visitas ya contratadas.
      const { error } = await context.supabase.from("services").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("services")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const adminSavePricingRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ expressPerService: z.boolean(), expressFee: z.number().min(0) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("settings")
      .upsert({
        key: "pricing",
        value: { express_per_service: data.expressPerService, express_fee: data.expressFee },
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminCreateVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        customer: z.object({
          id: z.string().uuid().nullable().default(null),
          name: z.string().min(2),
          phone: z.string().optional().default(""),
          email: z.string().optional().default(""),
          address: z.string().min(3),
          city: z.string().min(2),
          distanceKm: z.number().min(0).max(200).default(0),
        }),
        installerId: z.string().uuid(),
        date: z.string(),
        startTime: z.string(),
        serviceIds: z.array(z.string().uuid()).min(1),
        express: z.boolean().default(false),
        force: z.boolean().default(false),
        notes: z.string().optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, addServiceToVisit } = await import("./admin.server");
    const { recalcVisit, translateDbError, zoneFeeForDistance } = await import("./visits.server");
    await assertAdmin(context.supabase, context.userId);
    const db = context.supabase;

    let customerId = data.customer.id;
    if (!customerId) {
      const { data: created, error } = await db
        .from("customers")
        .insert({
          name: data.customer.name,
          phone: data.customer.phone || null,
          email: data.customer.email || null,
          address: data.customer.address,
          city: data.customer.city,
          distance_km: data.customer.distanceKm,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      customerId = created.id as string;
    }

    const zone = await zoneFeeForDistance(db, data.customer.distanceKm);
    const { data: visit, error: visitError } = await db
      .from("visits")
      .insert({
        customer_id: customerId,
        installer_id: data.installerId,
        visit_date: data.date,
        start_time: data.startTime,
        end_time: data.startTime,
        address: data.customer.address,
        city: data.customer.city,
        status: "confirmed",
        distance_km: data.customer.distanceKm,
        distance_fee: zone.fee,
        allow_overlap: data.force,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (visitError || !visit) throw new Error(translateDbError(visitError?.message ?? "Error"));

    for (const serviceId of data.serviceIds) {
      await addServiceToVisit(db, {
        visitId: visit.id as string,
        serviceId,
        express: data.express,
        quantity: 1,
      });
    }
    await recalcVisit(db, visit.id as string);
    return { visitId: visit.id as string };
  });

export const adminDeleteVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("visits").delete().eq("id", data.visitId);
    return { ok: true as const };
  });

/* ------------------------------ Catálogo -------------------------------- */

const serviceInputSchema = z.object({
  category_id: z.string().uuid(),
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().nullable().optional(),
  specialty: z.string().min(2),
  base_price: z.number().min(0),
  duration_minutes: z.number().int().min(15).max(1440),
  addon_duration_minutes: z.number().int().min(0).max(1440),
  express_available: z.boolean(),
  express_fee: z.number().min(0),
  emoji: z.string().nullable().optional(),
  sort_order: z.number().int().min(0),
  active: z.boolean(),
});

export const adminCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { loadAdminCatalog } = await import("./admin-catalog.server");
    await assertAdmin(context.supabase, context.userId);
    return loadAdminCatalog(context.supabase);
  });

export const adminCreateService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => serviceInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { createService } = await import("./admin-catalog.server");
    await assertAdmin(context.supabase, context.userId);
    return createService(context.supabase, data);
  });

export const adminUpdateService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), values: serviceInputSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { updateService } = await import("./admin-catalog.server");
    await assertAdmin(context.supabase, context.userId);
    return updateService(context.supabase, data.id, data.values);
  });

export const adminSetServiceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { setServiceActive } = await import("./admin-catalog.server");
    await assertAdmin(context.supabase, context.userId);
    return setServiceActive(context.supabase, data.id, data.active);
  });

export const adminDeleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { deleteService } = await import("./admin-catalog.server");
    await assertAdmin(context.supabase, context.userId);
    return deleteService(context.supabase, data.id);
  });

/* ----------------------------- Solicitudes ------------------------------ */

export const adminRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { loadRequests } = await import("./admin-requests.server");
    await assertAdmin(context.supabase, context.userId);
    return loadRequests(context.supabase);
  });

export const adminProposeSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        slots: z.array(z.string()).max(3),
        note: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { proposeSlots } = await import("./admin-requests.server");
    await assertAdmin(context.supabase, context.userId);
    return proposeSlots(context.supabase, data);
  });

export const adminUpdateRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ requestId: z.string().uuid(), status: z.string().min(2) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { updateRequestStatus } = await import("./admin-requests.server");
    await assertAdmin(context.supabase, context.userId);
    return updateRequestStatus(context.supabase, data.requestId, data.status);
  });

/* ---------------------------- Instaladores ------------------------------ */

export const adminInstallersPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { loadInstallersPanel } = await import("./admin-installers.server");
    await assertAdmin(context.supabase, context.userId);
    return loadInstallersPanel(context.supabase);
  });

export const adminEarliestInstallerSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ requestId: z.string().uuid(), days: z.number().int().min(1).max(45).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { earliestInstallerSlots } = await import("./admin-installers.server");
    await assertAdmin(context.supabase, context.userId);
    return earliestInstallerSlots(context.supabase, data);
  });

export const adminAssignRequestInstaller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ requestId: z.string().uuid(), installerId: z.string().uuid().nullable() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { assignRequestInstaller } = await import("./admin-installers.server");
    await assertAdmin(context.supabase, context.userId);
    return assignRequestInstaller(context.supabase, data);
  });

export const adminDeleteInstaller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    const { deleteInstaller } = await import("./admin-installers.server");
    await assertAdmin(context.supabase, context.userId);
    return deleteInstaller(context.supabase, data.id);
  });
