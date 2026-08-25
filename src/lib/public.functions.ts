import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const availabilitySchema = z.object({
  serviceIds: z.array(z.string().uuid()).min(1),
  distanceKm: z.number().min(0).max(200),
  express: z.boolean().default(false),
  fromDate: z.string(),
  days: z.number().min(1).max(30).default(14),
});

const bookingSchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().min(4),
    city: z.string().min(2),
    postalCode: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  }),
  serviceIds: z.array(z.string().uuid()).min(1),
  distanceKm: z.number().min(0).max(200),
  express: z.boolean().default(false),
  date: z.string(),
  startTime: z.string(),
});

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { loadCatalog } = await import("./catalog.server");
  return loadCatalog();
});

export const getPublicAvailability = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => availabilitySchema.parse(input))
  .handler(async ({ data }) => {
    const { computePublicAvailability } = await import("./availability.server");
    return computePublicAvailability(data);
  });

export const createBookingRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const { submitBooking } = await import("./availability.server");
    return submitBooking(data);
  });

const quoteItemsSchema = z.object({
  items: z
    .array(z.object({ serviceId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1),
  distanceKm: z.number().min(0).max(200),
  express: z.boolean().default(false),
});

const quoteRequestSchema = quoteItemsSchema.extend({
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().min(4),
    city: z.string().min(2),
    postalCode: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  }),
});

/** Presupuesto en vivo con cantidades (sin reservar nada). */
export const getQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => quoteItemsSchema.parse(input))
  .handler(async ({ data }) => {
    const { computeQuote } = await import("./quotes.server");
    return computeQuote(data);
  });

/** El cliente acepta el presupuesto y solicita fecha de montaje. */
export const requestAssemblyDate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => quoteRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const { createQuoteRequest } = await import("./quotes.server");
    return createQuoteRequest(data);
  });

export const getRequestByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(8) }).parse(input))
  .handler(async ({ data }) => {
    const { loadRequestByToken } = await import("./quotes.server");
    return loadRequestByToken(data.token);
  });

export const chooseRequestSlot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(8), slotIndex: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { chooseProposedSlot } = await import("./quotes.server");
    return chooseProposedSlot(data.token, data.slotIndex);
  });
