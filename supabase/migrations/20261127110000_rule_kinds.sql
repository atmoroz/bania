-- Two kinds of section in the same table.
--
-- The owner's stories carry two different things: the rules (what is
-- expected of a guest) and what the price includes — towels, the kettle,
-- the shower, and what to bring yourself. They are read at the same
-- moment, beside the booking button, but not in the same breath: one is
-- the terms, the other is the packing list.
--
-- A second table would be the same five columns under another name, so
-- this is a column. `rules` is the default, which is what every existing
-- row is.

alter table public.rule_sections
  add column if not exists kind text not null default 'rules';

alter table public.rule_sections
  drop constraint if exists rule_sections_kind_known;
alter table public.rule_sections
  add constraint rule_sections_kind_known check (kind in ('rules', 'included'));

drop index if exists public.rule_sections_visible_sort_idx;
create index if not exists rule_sections_kind_sort_idx
  on public.rule_sections (kind, sort_order) where is_visible;

create or replace function public.save_rules(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Only an administrator may edit the rules' using errcode = '42501';
  end if;

  if jsonb_typeof(payload) is distinct from 'array' then
    raise exception 'payload must be a JSON array';
  end if;

  delete from public.rule_sections s
   where not exists (
     select 1 from jsonb_array_elements(payload) as e(value)
      where (e.value->>'id')::uuid = s.id
   );

  update public.rule_sections s
     set title      = btrim(e.value->>'title'),
         intro      = nullif(btrim(coalesce(e.value->>'intro', '')), ''),
         items      = coalesce(e.value->'items', '[]'::jsonb),
         note       = nullif(btrim(coalesce(e.value->>'note', '')), ''),
         is_visible = coalesce((e.value->>'is_visible')::boolean, true),
         kind       = coalesce(nullif(btrim(coalesce(e.value->>'kind', '')), ''), 'rules'),
         sort_order = e.ordinality::integer
    from jsonb_array_elements(payload) with ordinality as e(value, ordinality)
   where s.id = (e.value->>'id')::uuid;

  insert into public.rule_sections (title, intro, items, note, is_visible, kind, sort_order)
  select btrim(e.value->>'title'),
         nullif(btrim(coalesce(e.value->>'intro', '')), ''),
         coalesce(e.value->'items', '[]'::jsonb),
         nullif(btrim(coalesce(e.value->>'note', '')), ''),
         coalesce((e.value->>'is_visible')::boolean, true),
         coalesce(nullif(btrim(coalesce(e.value->>'kind', '')), ''), 'rules'),
         e.ordinality::integer
    from jsonb_array_elements(payload) with ordinality as e(value, ordinality)
   where e.value->>'id' is null;
end;
$$;

revoke execute on function public.save_rules(jsonb) from public, anon;
grant execute on function public.save_rules(jsonb) to authenticated;

-- What a booking includes, and what to bring. Straight from the stories.
insert into public.rule_sections (kind, title, intro, items, note, sort_order)
select * from (values
(
  $q$included$q$,
  $q$Що входить до бронювання$q$,
  $q$Однаково для чану та бань — уже у вартості години.$q$,
  $j$[
    {"text": "Питна вода, чай, мед та бублики", "note": null},
    {"text": "Простирадла, шапки, гумові капці", "note": null},
    {"text": "Кухня: чайник, мікрохвильовка, холодильник", "note": null},
    {"text": "Посуд: тарілки, чашки, склянки, столові прибори та інше", "note": null},
    {"text": "Кімната відпочинку", "note": null},
    {"text": "Душ та санвузол", "note": null},
    {"text": "Закрита тераса на вулиці, мангал та приладдя для нього", "note": null}
  ]$j$::jsonb,
  null::text,
  1
),
(
  $q$included$q$,
  $q$Що взяти з собою$q$,
  null,
  $j$[
    {"text": "Рушник та засоби гігієни", "note": null},
    {"text": "Їжу та напої", "note": null},
    {"text": "Вугілля для мангалу", "note": null},
    {"text": "Обов'язково гарний настрій", "note": null}
  ]$j$::jsonb,
  $q$Інші дрібнички та додатки можна придбати у нас.$q$,
  2
)) as seed(kind, title, intro, items, note, sort_order)
where not exists (select 1 from public.rule_sections where kind = 'included');
