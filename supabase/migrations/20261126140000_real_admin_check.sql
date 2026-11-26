-- Authorisation, not merely authentication.
--
-- The first version of private.is_admin() returned `auth.uid() is not null`,
-- which means "somebody is signed in". That is not the same as "this person may
-- manage the venue", and Supabase makes the gap dangerous: if anonymous
-- sign-ins are ever enabled, an anonymous visitor also carries a uid and the
-- `authenticated` Postgres role, and would have passed the check.
--
-- Administrators are now an explicit list.

begin;

-- Lives in `private`, so PostgREST never exposes it and no policy has to guard
-- it. The only way in is the SQL editor or a migration, which is the right
-- amount of friction for granting someone control of the calendar.
create table if not exists private.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

-- Defence in depth. The private schema is not exposed to PostgREST and the
-- roles have no grant on it, so this changes nothing today; it means a future
-- mistake that exposes the schema does not also hand over the admin list.
alter table private.admin_users enable row level security;
alter table private.admin_users force row level security;

-- Reads an internal lookup table, so it must bypass RLS — which is the one
-- legitimate use of SECURITY DEFINER. It checks the caller's own identity, it
-- lives outside the exposed schema, and PUBLIC cannot execute it.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Whoever exists in auth.users right now is the owner: the project has exactly
-- one account, created by hand for this purpose. Adding another administrator
-- later means inserting a row here on purpose.
insert into private.admin_users (user_id, note)
select id, 'seeded: first account on the project'
from auth.users
on conflict (user_id) do nothing;

commit;
