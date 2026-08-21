import { internalDb } from "./booking.server";

export type CatalogService = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  specialty: string;
  base_price: number;
  duration_minutes: number;
  addon_duration_minutes: number;
  express_available: boolean;
  express_fee: number;
  emoji: string | null;
};

export const loadCatalog = async () => {
  const db = internalDb();
  const [categories, services, zones, settings] = await Promise.all([
    db.from("categories").select("*").eq("active", true).order("sort_order"),
    db.from("services").select("*").eq("active", true).order("sort_order"),
    db.from("zones").select("*").eq("active", true).order("max_km"),
    db.from("settings").select("value").eq("key", "pricing").maybeSingle(),
  ]);

  return {
    categories: (categories.data ?? []).map((c) => ({
      id: c.id as string,
      slug: c.slug as string,
      name: c.name as string,
      description: c.description as string | null,
      icon: c.icon as string | null,
    })),
    services: (services.data ?? []).map((s) => ({
      id: s.id as string,
      category_id: s.category_id as string,
      slug: s.slug as string,
      name: s.name as string,
      description: s.description as string | null,
      specialty: s.specialty as string,
      base_price: Number(s.base_price),
      duration_minutes: s.duration_minutes as number,
      addon_duration_minutes: s.addon_duration_minutes as number,
      express_available: s.express_available as boolean,
      express_fee: Number(s.express_fee),
      emoji: s.emoji as string | null,
    })) satisfies CatalogService[],
    zones: (zones.data ?? []).map((z) => ({
      id: z.id as string,
      name: z.name as string,
      max_km: z.max_km as number,
      fee: Number(z.fee),
    })),
    pricing: (settings.data?.value ?? { express_per_service: true, express_fee: 100 }) as {
      express_per_service?: boolean;
      express_fee?: number;
    },
  };
};
