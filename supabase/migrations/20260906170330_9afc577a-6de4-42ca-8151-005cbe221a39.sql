create table if not exists public.installer_services (
  installer_id uuid not null references public.installers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (installer_id, service_id)
);

grant select, insert, update, delete on public.installer_services to authenticated;
grant all on public.installer_services to service_role;

alter table public.installer_services enable row level security;

drop policy if exists "Admins manage installer_services" on public.installer_services;
create policy "Admins manage installer_services"
on public.installer_services for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create index if not exists installer_services_service_idx on public.installer_services(service_id);

insert into public.installer_services (installer_id, service_id)
select i.id, s.id
from public.installers i
join public.services s on s.specialty = any (i.specialties)
on conflict do nothing;

alter table public.requests
  add column if not exists express_professionals integer not null default 0;