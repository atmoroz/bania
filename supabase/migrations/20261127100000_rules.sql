-- The house rules, as the owner publishes them.
--
-- They live in Instagram stories today: five pictures of text that nobody
-- can read before booking and that cannot be changed without redrawing the
-- picture. Here they are rows, shown in a dialog beside the booking button
-- and edited in the panel.
--
-- One table, not two. A section is a title, an optional opening line, a
-- list of rules and an optional closing note — and the list is jsonb rather
-- than a child table because a rule has no identity of its own: it is a
-- line in a section, moved and deleted with it. The whole section is
-- written at once, so there is nothing to join and nothing to keep in step.

create table if not exists public.rule_sections (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  intro      text,
  -- [{ "text": "...", "note": "..." }]; `note` is the smaller line under a rule.
  items      jsonb not null default '[]'::jsonb,
  note       text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rule_sections_title_not_blank check (btrim(title) <> ''),
  constraint rule_sections_items_is_array check (jsonb_typeof(items) = 'array')
);

create index if not exists rule_sections_visible_sort_idx
  on public.rule_sections (sort_order) where is_visible;

drop trigger if exists rule_sections_touch_updated_at on public.rule_sections;
create trigger rule_sections_touch_updated_at before update on public.rule_sections
  for each row execute function private.touch_updated_at();

alter table public.rule_sections enable row level security;
alter table public.rule_sections force row level security;

drop policy if exists rule_sections_public_read on public.rule_sections;
create policy rule_sections_public_read on public.rule_sections
  for select to anon, authenticated using (is_visible);

drop policy if exists rule_sections_admin_all on public.rule_sections;
create policy rule_sections_admin_all on public.rule_sections
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select on public.rule_sections to anon, authenticated;
grant insert, update, delete on public.rule_sections to authenticated;

-- Saved as a whole, like the gallery and the catalogue: a section the array
-- no longer carries is a section the owner removed.
-- The parameter is `payload`, not `items`: the table has an `items` column,
-- and inside the function the two names collide — "column reference items is
-- ambiguous", from the delete, which is the one statement that would quietly
-- have deleted everything had it resolved the other way.
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
         sort_order = e.ordinality::integer
    from jsonb_array_elements(payload) with ordinality as e(value, ordinality)
   where s.id = (e.value->>'id')::uuid;

  insert into public.rule_sections (title, intro, items, note, is_visible, sort_order)
  select btrim(e.value->>'title'),
         nullif(btrim(coalesce(e.value->>'intro', '')), ''),
         coalesce(e.value->'items', '[]'::jsonb),
         nullif(btrim(coalesce(e.value->>'note', '')), ''),
         coalesce((e.value->>'is_visible')::boolean, true),
         e.ordinality::integer
    from jsonb_array_elements(payload) with ordinality as e(value, ordinality)
   where e.value->>'id' is null;
end;
$$;

revoke execute on function public.save_rules(jsonb) from public, anon;
grant execute on function public.save_rules(jsonb) to authenticated;
-- The rules as the owner published them in the stories, word for word.
-- Idempotent: the panel owns them from here on, so this only fills an
-- empty table.

insert into public.rule_sections (title, intro, items, note, sort_order)
select * from (values
(
  $q$Умови бронювання$q$,
  null::text,
  $j$[
    {"text": "Бронюємо тільки по передоплаті 50%", "note": "Від вартості відпочинку: на картку, на рахунок ФОП або особисто готівкою."},
    {"text": "Передоплата не повертається", "note": "Але можна перенести запис один раз."},
    {"text": "Бронювання без передоплати тримаємо одну годину", "note": "Після години очікування бронювання згорає."},
    {"text": "При відміні бронювання за два дні", "note": "Бронювання не переноситься та передоплата не повертається."},
    {"text": "У святкові дні бронювання не переноситься", "note": "Та передоплата не повертається. Святкові дні: 24 грудня — 13 січня / 12 — 15 лютого / 6 — 9 березня / 1 — 9 травня / Великдень."},
    {"text": "Застава — 2000 ₴", "note": "При відвідуванні компаній більше ніж шести людей та при бронюванні більш чим на 3 години. Після відпочинку застава повертається — за умови, що все ціле та на своїх місцях."}
  ]$j$::jsonb,
  $q$Адміністрація та власники «Стара Дорога» в праві зробити зауваження та відмовити у відпочинку, якщо ці правила будуть порушені.$q$,
  1
),
(
  $q$Наш простір$q$,
  $q$Ці слова — з минулого. «САУНА — це Содом і Гоморра» — залишаємо там же. Є речі, які варто залишити в минулому: слова, стереотипи, шумні уявлення. Бо це не про наш простір.$q$,
  $j$[
    {"text": "Баня — це не про хаос", "note": "Не про алкоголь. Не про пияцтво в усмерть. Не про «перебрати»."},
    {"text": "Баня — це простір тиші", "note": "Де чути дихання. Де тіло відпускає напругу. Де тепло — не для показу, а для зцілення."},
    {"text": "Тут не збираються для галасу", "note": "Тут приходять повернутися до себе."},
    {"text": "Ми створили місце, де повага важливіша за градуси", "note": "Де спокій цінніший за гучність, де кожен ритуал — про відновлення."}
  ]$j$::jsonb,
  $q$Якщо тобі близьке саме таке — ти точно наш гість.$q$,
  2
),
(
  $q$Шановні гості$q$,
  $q$На території бані та чану «Стара Дорога».$q$,
  $j$[
    {"text": "Заборонено вмикати через колонки музику виконавців, заборонених в Україні", "note": null},
    {"text": "Ми не контролюємо, якою мовою ви спілкуєтесь", "note": "І не втручаємось у те, яку музику ви слухаєте особисто, за зачиненими дверима."},
    {"text": "Але музика, яка звучить через колонки, — це вже простір нашої локації", "note": "Її чують інші гості та сусіди, тому просимо поважати правила закладу."}
  ]$j$::jsonb,
  $q$Власники та адміністрація мають право зробити зауваження та вимагати вимкнути таку музику.$q$,
  3
),
(
  $q$Відпочинок з дітьми$q$,
  $q$За кожну дитину несе відповідальність дорослий. На території ведеться відеоспостереження.$q$,
  $j$[
    {"text": "Стрибати в басейн з поручнів чану строго заборонено", "note": null},
    {"text": "Ходити та гуляти поза межами тераси заборонено", "note": null},
    {"text": "Не можна лізти у порожній чан, сувати чи витягувати каміння з нього", "note": null},
    {"text": "Заборонено залізати на паркан — це дуже небезпечно", "note": null},
    {"text": "Заборонено кидати у басейн багажки та все інше, окрім надувних засобів", "note": null},
    {"text": "Заборонено мити руки та іграшки у басейні", "note": "Для цього є душ та три раковини."},
    {"text": "Заборонено стрибати на шезлонгах", "note": null},
    {"text": "Забороняється стрибати у басейн та чан «бомбочкою»", "note": null},
    {"text": "Забороняється ходити у взутті по бортах басейну та вставати у взутті на сходи", "note": null},
    {"text": "Забороняється гойдатись на сходах басейну", "note": null},
    {"text": "Забороняється стрибати в капцях у басейн", "note": null},
    {"text": "Заборонено заходити з їжею, шоколадками, бубликами до парної", "note": null},
    {"text": "Забороняється ходити по газону", "note": null},
    {"text": "Заборонено лізти під чан і щось витягати з-під нього", "note": null},
    {"text": "Не можна їсти та пити біля басейну і в самому басейні", "note": null},
    {"text": "Ковиряти та вивчати, як там горить той ліхтар у басейні, заборонено", "note": null},
    {"text": "Якщо ви хочете, щоб вода у басейні була прозора — пісяти туди не треба", "note": null},
    {"text": "Розбитий посуд, поламані речі та псування майна сплачують гості", "note": null}
  ]$j$::jsonb,
  $q$Адміністрація має право відмовити у відвідуванні у разі неадекватної поведінки, без пояснення причин.$q$,
  4
)) as seed(title, intro, items, note, sort_order)
where not exists (select 1 from public.rule_sections);
