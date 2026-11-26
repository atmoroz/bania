-- A way for the application to ask "am I an administrator?".
--
-- private.is_admin() lives outside the exposed schema, so PostgREST cannot
-- reach it. This wrapper can be called, but only by a signed-in user, and it
-- only ever reports on the caller — it takes no arguments, so there is nothing
-- to probe with.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin();
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
