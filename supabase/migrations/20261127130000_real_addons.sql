-- The real price list for everything sold beside the hour.
--
-- The four rows seeded at the start of the project were placeholders I
-- invented to have something on the page. These are the owner's own, from
-- the two price stories: brooms, Finnish steam scents, chan and banya
-- soak packets, the small care products, and the linen.
--
-- They come in five groups, so `category` joins the table. Free text
-- rather than an enum: these are the owner's headings, and the next one
-- should not need a migration. Order inside the page is `sort_order`,
-- and groups are shown in the order of their first row.

alter table public.addons
  add column if not exists category text;

drop index if exists public.addons_visible_sort_idx;
create index if not exists addons_visible_sort_idx
  on public.addons (sort_order) where is_visible;

-- The placeholders go. Named one by one rather than truncated, so a row
-- the owner has added by hand in the meantime survives.
delete from public.addons
 where slug in ('parmeister', 'honey-peeling', 'broom-oak-birch', 'grill-rental');

insert into public.addons (slug, category, name, description, price, unit, sort_order)
values
  ('broom-oak',            'Віники', 'Дуб канадський', null, 20000, '/ шт', 1),
  ('broom-oak-eucalyptus', 'Віники', 'Дуб + евкаліпт', null, 25000, '/ шт', 2),
  ('broom-raspberry',      'Віники', 'Малина', null, 20000, '/ шт', 3),
  ('broom-eucalyptus',     'Віники', 'Евкаліпт', null, 30000, '/ шт', 4),

  ('rento-arctic', 'Фінські аромати для бані', 'Rento «Арктичні ягоди»',
   'Концентрат для води на камені', 15000, '', 5),
  ('rento-birch', 'Фінські аромати для бані', 'Rento «Береза»',
   'Концентрат для води на камені', 15000, '', 6),
  ('essential-oil', 'Фінські аромати для бані', 'Ефірна олія',
   'Евкаліпт, ялівець, помаранч, лимон, лаванда, сандал та інші', 15000, '', 7),

  ('spa-pine',      'Додатки для чана та бані', 'SPA-пакет для чану «Хвойний»', '300 г', 25000, '', 8),
  ('spa-berry',     'Додатки для чана та бані', 'SPA-пакет для чану «Ягідний»', '300 г', 25000, '', 9),
  ('spa-lavender',  'Додатки для чана та бані', 'SPA-пакет для чану «Лаванда»', '300 г', 25000, '', 10),
  ('spa-cleopatra', 'Додатки для чана та бані', 'SPA-пакет для чану «Молочні ванни Клеопатри»',
   '300 г', 30000, '', 11),
  ('steep-chan',    'Додатки для чана та бані', 'Запарка для чану «Трави Карпат»', null, 25000, '', 12),
  ('steep-banya',   'Додатки для чана та бані', 'Запарка для бані «Трави Карпат»', null, 25000, '', 13),

  ('scrub-mriyu',   'Доглядові штучки', 'Скраб для тіла «Мрію»', '25 г', 10000, '', 14),
  ('scrub-kohayu',  'Доглядові штучки', 'Скраб для тіла «Кохаю»', '25 г', 10000, '', 15),
  ('scrub-tsiluyu', 'Доглядові штучки', 'Скраб для тіла «Цілую»', '25 г', 10000, '', 16),
  ('shampoo',       'Доглядові штучки', 'Шампунь для волосся Farmagan', null, 5000, '', 17),
  ('hair-mask',     'Доглядові штучки', 'Маска для волосся Farmagan', null, 5000, '', 18),
  ('sponge',        'Доглядові штучки', 'Губка для душу', null, 10000, '', 19),

  ('robe',        'Інші послуги', 'Халат', null, 5000, '', 20),
  ('towel',       'Інші послуги', 'Рушник', null, 5000, '', 21),
  ('extra-sheet', 'Інші послуги', 'Додаткове простирадло', null, 2500, '', 22)
on conflict (slug) do update
  set category    = excluded.category,
      name        = excluded.name,
      description = excluded.description,
      price       = excluded.price,
      unit        = excluded.unit,
      sort_order  = excluded.sort_order;
