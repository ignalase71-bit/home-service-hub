-- Bootstrap: first registered user becomes admin
create or replace function public.bootstrap_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists bootstrap_first_admin on auth.users;
create trigger bootstrap_first_admin
after insert on auth.users
for each row execute function public.bootstrap_first_admin();

-- Grant admin to existing users when nobody is admin yet
insert into public.user_roles (user_id, role)
select u.id, 'admin' from auth.users u
where not exists (select 1 from public.user_roles where role = 'admin')
on conflict (user_id, role) do nothing;