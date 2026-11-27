-- The add-ons become editable in the panel.
--
-- They were the one piece of content the owner could not touch: twenty-two
-- rows of brooms, scents, soak packets and linen, every price change a
-- migration. Saved as a whole list, like the gallery, the catalogue and
-- the rules — a row the array no longer carries is a row the owner removed.

create or replace function public.save_addons(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Only an administrator may edit the add-ons' using errcode = '42501';
  end if;

  if jsonb_typeof(payload) is distinct from 'array' then
    raise exception 'payload must be a JSON array';
  end if;

  delete from public.addons a
   where not exists (
     select 1 from jsonb_array_elements(payload) as e(value)
      where (e.value->>'id')::uuid = a.id
   );

  update public.addons a
     set name        = btrim(e.value->>'name'),
         description = nullif(btrim(coalesce(e.value->>'description', '')), ''),
         price       = greatest(coalesce((e.value->>'price')::integer, 0), 0),
         unit        = coalesce(btrim(e.value->>'unit'), ''),
         category    = nullif(btrim(coalesce(e.value->>'category', '')), ''),
         is_visible  = coalesce((e.value->>'is_visible')::boolean, true),
         sort_order  = e.ordinality::integer
    from jsonb_array_elements(payload) with ordinality as e(value, ordinality)
   where a.id = (e.value->>'id')::uuid;

  -- A new row needs a slug and the owner never sees one, so it is made
  -- here. Random rather than derived from the name: a Ukrainian name
  -- would need transliteration, and two scrubs called «Мрію» would then
  -- collide on save.
  insert into public.addons (slug, name, description, price, unit, category, is_visible, sort_order)
  select 'addon-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
         btrim(e.value->>'name'),
         nullif(btrim(coalesce(e.value->>'description', '')), ''),
         greatest(coalesce((e.value->>'price')::integer, 0), 0),
         coalesce(btrim(e.value->>'unit'), ''),
         nullif(btrim(coalesce(e.value->>'category', '')), ''),
         coalesce((e.value->>'is_visible')::boolean, true),
         e.ordinality::integer
    from jsonb_array_elements(payload) with ordinality as e(value, ordinality)
   where e.value->>'id' is null;
end;
$$;

revoke execute on function public.save_addons(jsonb) from public, anon;
grant execute on function public.save_addons(jsonb) to authenticated;

-- No policies here: `addons` already carries `addons_public_read`
-- (visible rows, to anon) and `addons_admin_all` from the content
-- migration, and the panel reads through the authenticated client.
