-- ROLES
create type public.app_role as enum ('admin','staff');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (active);
create policy "categories admin all" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  specialty text not null,
  base_price numeric(10,2) not null default 0,
  duration_minutes int not null default 60,
  addon_duration_minutes int not null default 30,
  express_available boolean not null default true,
  express_fee numeric(10,2) not null default 100,
  emoji text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services public read" on public.services for select to anon, authenticated using (active);
create policy "services admin all" on public.services for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger services_updated before update on public.services for each row execute function public.set_updated_at();

-- ZONES
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  max_km int not null,
  fee numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.zones to anon;
grant select, insert, update, delete on public.zones to authenticated;
grant all on public.zones to service_role;
alter table public.zones enable row level security;
create policy "zones public read" on public.zones for select to anon, authenticated using (active);
create policy "zones admin all" on public.zones for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- INSTALLERS
create table public.installers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  color text not null default '#f97316',
  specialties text[] not null default '{}',
  zones text[] not null default '{}',
  max_visit_minutes int not null default 480,
  max_daily_minutes int not null default 480,
  express_enabled boolean not null default true,
  hourly_cost numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.installers to authenticated;
grant all on public.installers to service_role;
alter table public.installers enable row level security;
create policy "installers admin all" on public.installers for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger installers_updated before update on public.installers for each row execute function public.set_updated_at();

-- INSTALLER SCHEDULES (weekly)
create table public.installer_schedules (
  id uuid primary key default gen_random_uuid(),
  installer_id uuid not null references public.installers(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.installer_schedules to authenticated;
grant all on public.installer_schedules to service_role;
alter table public.installer_schedules enable row level security;
create policy "schedules admin all" on public.installer_schedules for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- INSTALLER BLOCKS (vacations / unavailable slots)
create table public.installer_blocks (
  id uuid primary key default gen_random_uuid(),
  installer_id uuid not null references public.installers(id) on delete cascade,
  kind text not null default 'block',
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.installer_blocks to authenticated;
grant all on public.installer_blocks to service_role;
alter table public.installer_blocks enable row level security;
create policy "blocks admin all" on public.installer_blocks for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  city text,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  distance_km numeric(6,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "customers admin all" on public.customers for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();

-- VISITS
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  visit_number bigint generated by default as identity,
  customer_id uuid not null references public.customers(id) on delete cascade,
  installer_id uuid references public.installers(id) on delete set null,
  visit_date date not null,
  start_time time not null,
  end_time time not null,
  address text,
  city text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  status text not null default 'pending',
  express boolean not null default false,
  distance_km numeric(6,2) not null default 0,
  distance_fee numeric(10,2) not null default 0,
  services_total numeric(10,2) not null default 0,
  express_total numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  installer_cost numeric(10,2) not null default 0,
  payment_status text not null default 'unpaid',
  allow_overlap boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visits_installer_date_idx on public.visits (installer_id, visit_date);
grant select, insert, update, delete on public.visits to authenticated;
grant all on public.visits to service_role;
alter table public.visits enable row level security;
create policy "visits admin all" on public.visits for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger visits_updated before update on public.visits for each row execute function public.set_updated_at();

-- VISIT SERVICES (historical prices frozen)
create table public.visit_services (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  specialty text,
  quantity int not null default 1,
  base_price numeric(10,2) not null default 0,
  extras numeric(10,2) not null default 0,
  duration_minutes int not null default 60,
  express boolean not null default false,
  express_fee numeric(10,2) not null default 0,
  subtotal numeric(10,2) not null default 0,
  installer_cost numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index visit_services_visit_idx on public.visit_services (visit_id);
grant select, insert, update, delete on public.visit_services to authenticated;
grant all on public.visit_services to service_role;
alter table public.visit_services enable row level security;
create policy "visit services admin all" on public.visit_services for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- SETTINGS
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
grant select on public.settings to anon;
grant select, insert, update, delete on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "settings public read" on public.settings for select to anon, authenticated using (true);
create policy "settings admin all" on public.settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- CONFLICT RULE: same installer + same date + time overlap
create or replace function public.check_visit_conflict() returns trigger language plpgsql set search_path = public as $$
declare conflicting record;
begin
  if new.installer_id is null or new.allow_overlap then
    return new;
  end if;
  select v.id, v.start_time, v.end_time into conflicting
  from public.visits v
  where v.installer_id = new.installer_id
    and v.visit_date = new.visit_date
    and v.id <> new.id
    and v.status <> 'cancelled'
    and v.start_time < new.end_time
    and v.end_time > new.start_time
  limit 1;
  if conflicting.id is not null then
    raise exception 'CONFLICT_INSTALLER_BUSY: % - %', conflicting.start_time, conflicting.end_time;
  end if;
  return new;
end $$;

create trigger visits_conflict_check before insert or update on public.visits
for each row execute function public.check_visit_conflict();

-- SETTINGS DEFAULTS
insert into public.settings (key, value) values
  ('pricing', '{"express_per_service": true, "express_fee": 100, "group_discount": 0}'::jsonb);

-- ZONES DEFAULTS
insert into public.zones (name, max_km, fee, sort_order) values
  ('Jerez de la Frontera (casco urbano)', 10, 0, 1),
  ('Área metropolitana (hasta 20 km)', 20, 25, 2),
  ('Radio ampliado (hasta 35 km)', 35, 50, 3);

-- CATALOG DEFAULTS
insert into public.categories (slug, name, description, icon, sort_order) values
  ('climatizacion','Climatización','Aire acondicionado, bombas de calor y ventilación','snowflake',1),
  ('fontaneria','Fontanería','Termos, grifería, sanitarios y reparaciones','droplet',2),
  ('electricidad','Electricidad','Cuadros, puntos de luz, wallbox y solar','zap',3),
  ('montaje-muebles','Montaje de muebles','IKEA, armarios, cocinas y mobiliario','armchair',4);

insert into public.services (category_id, slug, name, description, specialty, base_price, duration_minutes, addon_duration_minutes, emoji, sort_order)
select c.id, s.slug, s.name, s.description, s.specialty, s.base_price, s.duration, s.addon, s.emoji, s.sort_order
from (values
  ('climatizacion','instalacion-aire-acondicionado','Instalación aire acondicionado split','Instalación completa de split 1x1 hasta 3 metros de tubería','aire_acondicionado',249.00,180,120,'❄️',1),
  ('climatizacion','mantenimiento-aire','Mantenimiento aire acondicionado','Limpieza de filtros, revisión de gas y desagüe','aire_acondicionado',79.00,60,40,'🌬️',2),
  ('fontaneria','instalacion-termo-electrico','Instalación termo eléctrico','Sustitución o instalación de termo eléctrico hasta 100 litros','termos',179.00,90,60,'🚿',1),
  ('fontaneria','instalacion-grifo-lavabo','Instalación grifo de lavabo','Sustitución de grifería de lavabo','fontaneria',69.00,45,30,'🚰',2),
  ('fontaneria','sustitucion-inodoro','Sustitución de inodoro','Retirada del antiguo e instalación del nuevo','fontaneria',129.00,90,60,'🚽',3),
  ('electricidad','instalacion-wallbox','Instalación wallbox','Punto de recarga para vehículo eléctrico','wallbox',349.00,240,150,'⚡',1),
  ('electricidad','puntos-luz','Instalación de puntos de luz','Nuevos puntos de luz o sustitución de luminarias','electricidad',59.00,45,25,'💡',2),
  ('montaje-muebles','montaje-ikea-pax','Montaje armario IKEA PAX','Montaje e instalación de armario PAX','ikea',149.00,150,90,'🪑',1),
  ('montaje-muebles','montaje-mueble-generico','Montaje de mueble','Montaje de mobiliario de cualquier marca','muebles',49.00,60,35,'🛠️',2)
) as s(cat, slug, name, description, specialty, base_price, duration, addon, emoji, sort_order)
join public.categories c on c.slug = s.cat;

-- INSTALLERS DEFAULTS
insert into public.installers (name, phone, color, specialties, zones, hourly_cost) values
  ('Manuel','600 000 001','#0ea5e9','{aire_acondicionado,termos,fontaneria}','{"Jerez de la Frontera (casco urbano)","Área metropolitana (hasta 20 km)","Radio ampliado (hasta 35 km)"}',18.00),
  ('Antonio','600 000 002','#f97316','{ikea,muebles,cocina}','{"Jerez de la Frontera (casco urbano)","Área metropolitana (hasta 20 km)"}',16.00),
  ('José','600 000 003','#22c55e','{electricidad,wallbox,solar}','{"Jerez de la Frontera (casco urbano)","Área metropolitana (hasta 20 km)","Radio ampliado (hasta 35 km)"}',20.00);

insert into public.installer_schedules (installer_id, weekday, start_time, end_time)
select i.id, d.weekday, '08:30'::time, '18:00'::time
from public.installers i
cross join (values (1),(2),(3),(4),(5)) as d(weekday);