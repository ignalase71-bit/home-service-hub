CREATE SEQUENCE IF NOT EXISTS public.request_number_seq;

CREATE TABLE public.requests (
  id uuid primary key default gen_random_uuid(),
  request_number bigint not null default nextval('public.request_number_seq'),
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'quote_requested',
  express boolean not null default false,
  distance_km numeric not null default 0,
  distance_fee numeric not null default 0,
  services_total numeric not null default 0,
  express_total numeric not null default 0,
  total numeric not null default 0,
  duration_minutes integer not null default 0,
  proposed_slot_1 timestamptz,
  proposed_slot_2 timestamptz,
  proposed_slot_3 timestamptz,
  proposal_note text,
  chosen_slot timestamptz,
  chosen_at timestamptz,
  visit_id uuid references public.visits(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  specialty text,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  express boolean not null default false,
  express_fee numeric not null default 0,
  duration_minutes integer not null default 0,
  subtotal numeric not null default 0,
  created_at timestamptz not null default now()
);

CREATE INDEX requests_status_idx ON public.requests(status);
CREATE INDEX request_items_request_idx ON public.request_items(request_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_items TO authenticated;
GRANT ALL ON public.request_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.request_number_seq TO authenticated, service_role;

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requests admin all" ON public.requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "request items admin all" ON public.request_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER requests_updated BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();