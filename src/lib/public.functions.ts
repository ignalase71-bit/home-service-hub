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
