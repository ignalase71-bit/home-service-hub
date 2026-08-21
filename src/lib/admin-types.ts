export type AdminInstaller = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  color: string;
  specialties: string[];
  zones: string[];
  max_visit_minutes: number;
  express_enabled: boolean;
  hourly_cost: number;
  active: boolean;
};

export type AdminVisitService = {
  id: string;
  visit_id: string;
  service_id: string | null;
  service_name: string;
  specialty: string | null;
  quantity: number;
  base_price: number;
  extras: number;
  duration_minutes: number;
  express: boolean;
  express_fee: number;
  subtotal: number;
  installer_cost: number;
  notes: string | null;
};

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  distance_km: number | null;
};

export type AdminVisit = {
  id: string;
  visit_number: number;
  customer_id: string;
  installer_id: string | null;
  visit_date: string;
  start_time: string;
  end_time: string;
  address: string | null;
  city: string | null;
  status: string;
  express: boolean;
  distance_km: number;
  distance_fee: number;
  services_total: number;
  express_total: number;
  total: number;
  installer_cost: number;
  payment_status: string;
  allow_overlap: boolean;
  notes: string | null;
  customer: AdminCustomer | null;
  services: AdminVisitService[];
};

export type AdminService = {
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
  active: boolean;
  sort_order: number;
};

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type AdminZone = { id: string; name: string; max_km: number; fee: number };

export type AdminOverview = {
  installers: AdminInstaller[];
  schedules: { installer_id: string; weekday: number; start_time: string; end_time: string }[];
  blocks: {
    id: string;
    installer_id: string;
    kind: string;
    start_date: string;
    end_date: string;
    start_time: string | null;
    end_time: string | null;
    reason: string | null;
  }[];
  visits: AdminVisit[];
  services: AdminService[];
  categories: AdminCategory[];
  customers: AdminCustomer[];
  zones: AdminZone[];
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En curso",
  done: "Finalizada",
  cancelled: "Cancelada",
};

export const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Sin pagar",
  partial: "Parcial",
  paid: "Pagado",
};

export const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
