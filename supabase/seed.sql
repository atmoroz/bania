-- Seed: the site's current content, moved out of the TypeScript fixtures.
-- Idempotent: re-running it updates rather than duplicating.
begin;

-- settings -------------------------------------------------------------
insert into public.settings (
  id, site_title, wordmark, phone_display, phone_e164, email, address,
  map_url, instagram_handle, instagram_url, opening_hours_note,
  min_duration_minutes, buffer_minutes, slot_step_minutes
) values (
  true, $q$Стара Дорога$q$, $q$BATHHOUSE$q$, $q$066 123 12 31$q$, $q$+380661231231$q$,
  $q$welcome@staradoroga.ua$q$, $q$вул. Стара Дорога, 42, Лісове урочище, Київська обл.$q$,
  $q$https://maps.google.com/?q=Банний+комплекс+Стара+Дорога$q$,
  $q$@staradoroga$q$, $q$https://instagram.com/staradoroga$q$,
  $q$Щоденно 09:00 — 23:00$q$,
  60, 0, 120
)
on conflict (id) do update set
  site_title = excluded.site_title, wordmark = excluded.wordmark,
  phone_display = excluded.phone_display, phone_e164 = excluded.phone_e164,
  email = excluded.email, address = excluded.address, map_url = excluded.map_url,
  instagram_handle = excluded.instagram_handle, instagram_url = excluded.instagram_url,
  opening_hours_note = excluded.opening_hours_note;

-- media ----------------------------------------------------------------
insert into public.media (storage_path, alt) values
  ($q$banya-1-pool.png$q$, $q$Дерев'яна альтанка зі світлими шторами та відкритий басейн поруч$q$),
  ($q$chan.png$q$, $q$Чавунний чан з річковим камінням та хвоєю на дерев'яній терасі$q$),
  ($q$chan-lounge.png$q$, $q$Зона відпочинку біля чану з підвісним кріслом-коконом та декором$q$),
  ($q$live-fire.png$q$, $q$Живе полум'я та розжарені дубові дрова в топці$q$),
  ($q$steam-room.png$q$, $q$Парна з дерев'яними полицями, лавами та теплими світильниками$q$),
  ($q$banya-2-entrance.png$q$, $q$Вхід до Бані #2 з вивіскою «Баня мать вторая», сухими травами та оберегами$q$),
  ($q$banya-entrance.png$q$, $q$Кам'яна стіна з вивіскою «Стара Дорога Баня» та оберегами при вході$q$),
  ($q$shower-room.png$q$, $q$Душова кімната з виходом до парної$q$),
  ($q$lounge-kitchen.png$q$, $q$Кухня кімнати відпочинку з чайною зоною та технікою$q$)
on conflict (storage_path) do update set alt = excluded.alt;

-- rooms: the catalogue of bookable cards -------------------------------
insert into public.rooms (slug, eyebrow, name, short_description, description, capacity,
  price_per_hour, highlights, cta_label, is_featured, sort_order, cover_media_id)
select $q$banya-1$q$, $q$Локація #1$q$, $q$Баня #1 з відкритим басейном$q$, $q$Простора альтанка, відкритий басейн та парна на дровах.$q$, $q$Простора дерев'яна альтанка з легкими шторами, чистий відкритий басейн з джерельною водою та духмяна парна на дровах. Ідеально для великої родини або дружньої компанії.$q$, 8,
  65000, array[$q$Відкритий басейн для контрастного занурення$q$, $q$Велика тераса-альтанка з м'якими зонами$q$, $q$Чайний стіл, чайник, весь посуд та мангал$q$]::text[], $q$Забронювати лазню$q$, false, 1, m.id
from public.media m where m.storage_path = $q$banya-1-pool.png$q$
on conflict (slug) do update set
  eyebrow = excluded.eyebrow, name = excluded.name,
  short_description = excluded.short_description, description = excluded.description,
  capacity = excluded.capacity, price_per_hour = excluded.price_per_hour,
  highlights = excluded.highlights,
  cta_label = excluded.cta_label, is_featured = excluded.is_featured,
  sort_order = excluded.sort_order, cover_media_id = excluded.cover_media_id;
insert into public.rooms (slug, eyebrow, name, short_description, description, capacity,
  price_per_hour, highlights, cta_label, is_featured, sort_order, cover_media_id)
select $q$banya-1-chan$q$, $q$Локація #2 • Повний релакс$q$, $q$Баня #1 + Чан на дровах$q$, $q$Одночасне користування гарячим чаном та парною.$q$, $q$Баня #1 разом з чавунним чаном на вогні: прогрів у парній, купання в басейні та занурення в гарячу купіль з хвоєю. Чан поєднується лише з Банею #1 — до Бані #2 він технічно не прилягає.$q$, 8,
  130000, array[$q$До 8 осіб у вартість пакету$q$, $q$Гарячий чан з хвоєю та річковим камінням$q$, $q$Прогрів у парній + купання в басейні$q$, $q$Трав'яний збір, липовий мед та банний текстиль$q$]::text[], $q$Обрати комбо-пакет$q$, true, 2, m.id
from public.media m where m.storage_path = $q$chan.png$q$
on conflict (slug) do update set
  eyebrow = excluded.eyebrow, name = excluded.name,
  short_description = excluded.short_description, description = excluded.description,
  capacity = excluded.capacity, price_per_hour = excluded.price_per_hour,
  highlights = excluded.highlights,
  cta_label = excluded.cta_label, is_featured = excluded.is_featured,
  sort_order = excluded.sort_order, cover_media_id = excluded.cover_media_id;
insert into public.rooms (slug, eyebrow, name, short_description, description, capacity,
  price_per_hour, highlights, cta_label, is_featured, sort_order, cover_media_id)
select $q$banya-2$q$, $q$Локація #3$q$, $q$Баня #2 «Ніагара» з водоспадом$q$, $q$Атмосферна парна з потужним контрастним душем.$q$, $q$Атмосферна духмяна парна з написом «Баня мать вторая», запашні сухі трави та потужне перекидне відро-водоспад для максимального заряду ендорфінів.$q$, 6,
  60000, array[$q$Шоковий контрастний душ «Ніагара» (50 л води)$q$, $q$Трав'яні пучки полину та м'яти під стелею$q$, $q$Затишна кімната відпочинку з дерев'яним столом$q$]::text[], $q$Забронювати лазню$q$, false, 3, m.id
from public.media m where m.storage_path = $q$banya-2-entrance.png$q$
on conflict (slug) do update set
  eyebrow = excluded.eyebrow, name = excluded.name,
  short_description = excluded.short_description, description = excluded.description,
  capacity = excluded.capacity, price_per_hour = excluded.price_per_hour,
  highlights = excluded.highlights,
  cta_label = excluded.cta_label, is_featured = excluded.is_featured,
  sort_order = excluded.sort_order, cover_media_id = excluded.cover_media_id;
insert into public.rooms (slug, eyebrow, name, short_description, description, capacity,
  price_per_hour, highlights, cta_label, is_featured, sort_order, cover_media_id)
select $q$chan$q$, $q$Локація #4 • Окремий чан$q$, $q$Карпатський Чан на вогні$q$, $q$Чавунна купіль просто неба, підігріта живим багаттям.$q$, $q$Купіль з литого чавуну під відкритим небом. Дно встелене річковими валунами, свіжа смерека та розслаблюючі лісові збори дарують глибоке омолодження тіла.$q$, 6,
  80000, array[$q$Натуральна хвоя смереки та річковий камінь$q$, $q$Підвісне крісло-кокон та лаунж-тераса$q$, $q$Контрастне обливання з дубового відра$q$]::text[], $q$Забронювати чан$q$, false, 4, m.id
from public.media m where m.storage_path = $q$chan.png$q$
on conflict (slug) do update set
  eyebrow = excluded.eyebrow, name = excluded.name,
  short_description = excluded.short_description, description = excluded.description,
  capacity = excluded.capacity, price_per_hour = excluded.price_per_hour,
  highlights = excluded.highlights,
  cta_label = excluded.cta_label, is_featured = excluded.is_featured,
  sort_order = excluded.sort_order, cover_media_id = excluded.cover_media_id;

-- which cards a bundle is made of --------------------------------------
delete from public.room_components;
insert into public.room_components (room_id, component_id)
select parent.id, child.id from public.rooms parent, public.rooms child
where parent.slug = $q$banya-1-chan$q$ and child.slug in ($q$banya-1$q$, $q$chan$q$);

-- photographs for each card's slider -----------------------------------
delete from public.room_photos;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 1 from public.rooms r, public.media m
where r.slug = $q$banya-1$q$ and m.storage_path = $q$banya-1-pool.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 2 from public.rooms r, public.media m
where r.slug = $q$banya-1$q$ and m.storage_path = $q$steam-room.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 3 from public.rooms r, public.media m
where r.slug = $q$banya-1$q$ and m.storage_path = $q$shower-room.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 4 from public.rooms r, public.media m
where r.slug = $q$banya-1$q$ and m.storage_path = $q$lounge-kitchen.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 1 from public.rooms r, public.media m
where r.slug = $q$banya-1-chan$q$ and m.storage_path = $q$banya-1-pool.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 2 from public.rooms r, public.media m
where r.slug = $q$banya-1-chan$q$ and m.storage_path = $q$chan.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 3 from public.rooms r, public.media m
where r.slug = $q$banya-1-chan$q$ and m.storage_path = $q$chan-lounge.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 4 from public.rooms r, public.media m
where r.slug = $q$banya-1-chan$q$ and m.storage_path = $q$steam-room.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 1 from public.rooms r, public.media m
where r.slug = $q$banya-2$q$ and m.storage_path = $q$banya-2-entrance.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 2 from public.rooms r, public.media m
where r.slug = $q$banya-2$q$ and m.storage_path = $q$steam-room.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 3 from public.rooms r, public.media m
where r.slug = $q$banya-2$q$ and m.storage_path = $q$banya-entrance.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 1 from public.rooms r, public.media m
where r.slug = $q$chan$q$ and m.storage_path = $q$chan.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 2 from public.rooms r, public.media m
where r.slug = $q$chan$q$ and m.storage_path = $q$chan-lounge.png$q$
on conflict do nothing;
insert into public.room_photos (room_id, media_id, sort_order)
select r.id, m.id, 3 from public.rooms r, public.media m
where r.slug = $q$chan$q$ and m.storage_path = $q$live-fire.png$q$
on conflict do nothing;

-- opening hours: venue default, 09:00-23:00 every day --------------------
insert into public.opening_hours (room_id, weekday, opens_at, closes_at)
select null, g, time '09:00', time '23:00' from generate_series(0, 6) g
on conflict do nothing;

-- gallery --------------------------------------------------------------
delete from public.gallery_photos;
insert into public.gallery_photos (media_id, title, caption, sort_order)
select m.id, $q$Альтанка та відкритий басейн$q$, $q$Баня #1$q$, 1 from public.media m where m.storage_path = $q$banya-1-pool.png$q$
union all
select m.id, $q$Чавунний чан на терасі$q$, $q$Річкове каміння та свіжа хвоя$q$, 2 from public.media m where m.storage_path = $q$chan.png$q$
union all
select m.id, $q$Лаунж біля чану$q$, $q$Підвісне крісло-кокон$q$, 3 from public.media m where m.storage_path = $q$chan-lounge.png$q$
union all
select m.id, $q$Живий вогонь на дубових дровах$q$, $q$Серце кожної парної$q$, 4 from public.media m where m.storage_path = $q$live-fire.png$q$
union all
select m.id, $q$Парна на дровах$q$, $q$Липові полиці та м'яке світло$q$, 5 from public.media m where m.storage_path = $q$steam-room.png$q$
union all
select m.id, $q$Вхід до Бані #2$q$, $q$Сухі трави та обереги$q$, 6 from public.media m where m.storage_path = $q$banya-2-entrance.png$q$
union all
select m.id, $q$Вхід до комплексу$q$, $q$Автентичний декор$q$, 7 from public.media m where m.storage_path = $q$banya-entrance.png$q$
union all
select m.id, $q$Душова при парній$q$, $q$Контраст одразу після пари$q$, 8 from public.media m where m.storage_path = $q$shower-room.png$q$
union all
select m.id, $q$Кімната відпочинку$q$, $q$Чайна зона та все для столу$q$, 9 from public.media m where m.storage_path = $q$lounge-kitchen.png$q$;

-- add-ons --------------------------------------------------------------
insert into public.addons (slug, name, description, price, unit, sort_order)
values ($q$parmeister$q$, $q$Послуги пармейстера$q$, $q$Індивідуальне пропарювання дубовими віниками (40 хв)$q$, 120000, $q$$q$, 1)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  unit = excluded.unit, sort_order = excluded.sort_order;
insert into public.addons (slug, name, description, price, unit, sort_order)
values ($q$honey-peeling$q$, $q$Медово-сольовий пілінг$q$, $q$Скрабування натуральним карпатським медом і морською сіллю$q$, 85000, $q$$q$, 2)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  unit = excluded.unit, sort_order = excluded.sort_order;
insert into public.addons (slug, name, description, price, unit, sort_order)
values ($q$venik$q$, $q$Віник дубовий / березовий$q$, $q$Свіжозапарений, з щільною густою кроною$q$, 15000, $q$/ шт$q$, 3)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  unit = excluded.unit, sort_order = excluded.sort_order;
insert into public.addons (slug, name, description, price, unit, sort_order)
values ($q$grill$q$, $q$Оренда мангалу та вугілля$q$, $q$Мангал, решітка, шампури та мішок дубового вугілля$q$, 30000, $q$/ сет$q$, 4)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  unit = excluded.unit, sort_order = excluded.sort_order;

-- reviews --------------------------------------------------------------
delete from public.reviews;
insert into public.reviews (author_name, context, body, rating, is_approved, sort_order) values ($q$Олександр М.$q$, $q$Відпочинок у чані$q$, $q$Чан просто космічний! Вода з хвоєю пахне на весь ліс, дно з камінням дуже приємне для ніг. Після гарячого чану пірнути в басейн — відчуття, ніби народився заново.$q$, 5, true, 1);
insert into public.reviews (author_name, context, body, rating, is_approved, sort_order) values ($q$Катерина та Сергій$q$, $q$Баня #2 «Ніагара»$q$, $q$Дуже чисто, красиво, затишно. Парна на дровах тримає ідеальну вологість, а водоспад «Ніагара» — це справжній вибух свіжості. Обов'язково повернемося взимку!$q$, 5, true, 2);

-- pages ----------------------------------------------------------------
insert into public.pages (slug, nav_label, title, sort_order)
values ($q$$q$, $q$Головна$q$, $q$Головна$q$, 1)
on conflict (slug) do update set
  nav_label = excluded.nav_label, title = excluded.title, sort_order = excluded.sort_order;
insert into public.pages (slug, nav_label, title, sort_order)
values ($q$locations$q$, $q$Локації та Чан$q$, $q$Локації та Чан$q$, 2)
on conflict (slug) do update set
  nav_label = excluded.nav_label, title = excluded.title, sort_order = excluded.sort_order;
insert into public.pages (slug, nav_label, title, sort_order)
values ($q$pricing$q$, $q$Ціни та пакети$q$, $q$Ціни та пакети$q$, 3)
on conflict (slug) do update set
  nav_label = excluded.nav_label, title = excluded.title, sort_order = excluded.sort_order;
insert into public.pages (slug, nav_label, title, sort_order)
values ($q$gallery$q$, $q$Фотогалерея$q$, $q$Фотогалерея$q$, 4)
on conflict (slug) do update set
  nav_label = excluded.nav_label, title = excluded.title, sort_order = excluded.sort_order;
insert into public.pages (slug, nav_label, title, sort_order)
values ($q$booking$q$, $q$Календар$q$, $q$Календар бронювання$q$, 5)
on conflict (slug) do update set
  nav_label = excluded.nav_label, title = excluded.title, sort_order = excluded.sort_order;
insert into public.pages (slug, nav_label, title, sort_order)
values ($q$reviews$q$, $q$Відгуки$q$, $q$Відгуки$q$, 6)
on conflict (slug) do update set
  nav_label = excluded.nav_label, title = excluded.title, sort_order = excluded.sort_order;
insert into public.pages (slug, nav_label, title, sort_order)
values ($q$contacts$q$, $q$Контакти$q$, $q$Контакти$q$, 7)
on conflict (slug) do update set
  nav_label = excluded.nav_label, title = excluded.title, sort_order = excluded.sort_order;

-- page blocks ----------------------------------------------------------
delete from public.page_blocks;
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$$q$, $q$hero$q$::public.block_type, 1, $j${"eyebrow": "Автентичний банний ретрит • Київське урочище", "title": "Справжня лазня & гарячий чан на дровах", "lead": "Автентичний відпочинок у комплексі «Стара Дорога»: гарячий чавунний чан на дровах, дві парні на дубових дровах, відкритий басейн та крижаний душ-водоспад.", "backgroundMediaPath": "chan.png", "primaryCta": {"label": "Забронювати відпочинок", "href": "/booking"}, "secondaryCta": {"label": "Дослідити простір", "href": "/locations"}, "stats": [{"value": "100 °C", "label": "Парна на дровах", "isVisible": true}, {"value": "40–42 °C", "label": "Карпатський чан", "isVisible": true}, {"value": "100 %", "label": "Приватна зона", "isVisible": true}, {"value": "3", "label": "Автономні локації", "isVisible": true}]}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$$q$, $q$feature_grid$q$::public.block_type, 2, $j${"eyebrow": "Ритуал • Відновлення • Спокій", "title": "Живий вогонь та справжня м'яка пара", "lead": "Ми відродили первісний дух оздоровлення, де кожна деталь підпорядкована природному балансу. Ніяких електричних тенів — виключно відбірні дубові поліна, розпечений жадеїт та пахуча хвоя, що віддають тепло повільно та шляхетно.", "items": [{"icon": "flame", "title": "Чавунний чан просто неба", "isVisible": true, "text": "Масивний чавунний котел, підігрітий відкритим багаттям. Дно вистелене гладким річковим камінням, а вода насичена свіжою смерековою хвоєю та лісовими зборами."}, {"icon": "home", "title": "Дві окремі парні на вибір", "isVisible": true, "text": "Баня #1 з просторою заскленою терасою та басейном для компаній, або Баня #2 «Ніагара» з потужним душем-водоспадом для цінителів інтенсивного контрасту."}, {"icon": "leaf", "title": "Віники та карпатські трав'яні чаї", "isVisible": true, "text": "Свіжі дубові та березові вінички для пропарювання, натуральний мед із пасіки та запашні настої з м'яти, липи, чебрецю й материнки, заварені в самоварі."}]}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$$q$, $q$locations$q$::public.block_type, 3, $j${"eyebrow": "Автономні простори", "title": "Локації комплексу", "lead": "Кожна зона функціонує повністю автономно, має власну огороджену територію, кімнату відпочинку та санвузли. Місткість: від 2 до 10 персон."}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$$q$, $q$reviews$q$::public.block_type, 4, $j${"eyebrow": "Досвід гостей", "title": "Що кажуть ті, хто відвідав нас", "display": "slider", "ctaLabel": "Усі відгуки", "ctaHref": "/reviews"}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$locations$q$, $q$locations$q$::public.block_type, 1, $j${"eyebrow": "Автономні простори", "title": "Локації та Чан", "lead": "Кожна зона функціонує повністю автономно, має власну огороджену територію, кімнату відпочинку та санвузли. Місткість: від 2 до 10 персон."}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$pricing$q$, $q$locations$q$::public.block_type, 1, $j${"eyebrow": "Чесні та прозорі тарифи", "title": "Вартість відпочинку та комплексні сети", "showPrices": true, "lead": "Оренда будь-якої зони здійснюється від 2 годин. У вартість кожного відвідування вже включено трав'яний чай, мед та базове банне приладдя."}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$pricing$q$, $q$addons$q$::public.block_type, 2, $j${"eyebrow": "Опціонально", "title": "Додаткові послуги та банні аксесуари"}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$gallery$q$, $q$gallery$q$::public.block_type, 1, $j${"eyebrow": "Атмосфера та деталі", "title": "Фотогалерея простору «Стара Дорога»", "lead": "Більше фото в Instagram @staradoroga"}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$reviews$q$, $q$reviews$q$::public.block_type, 1, $j${"eyebrow": "Досвід гостей", "title": "Відгуки про «Стару Дорогу»", "display": "slider", "summaryScore": "4.9", "summaryOutOf": "5.0", "summaryNote": "На основі понад 120 відгуків у Google Maps та Instagram"}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$contacts$q$, $q$contacts$q$::public.block_type, 1, $j${"eyebrow": "Як нас знайти", "title": "Завітайте на справжній карпатський пар", "lead": "Комплекс розташований у затишному лісовому урочищі, всього за 25 хвилин їзди від межі Києва. Зручний заасфальтований під'їзд та закрита парковка під відеонаглядом."}$j$::jsonb);
insert into public.page_blocks (page_slug, block_type, sort_order, content) values ($q$booking$q$, $q$booking_cta$q$::public.block_type, 1, $j${"eyebrow": "Бронювання", "title": "Оберіть локацію, дату та час", "lead": "Календар показує, які години вільні, а які вже зайняті. Саме бронювання підтверджує адміністратор у телефонній розмові — так ми встигаємо узгодити деталі відпочинку.", "note": "Поки що зателефонуйте адміністратору — він підкаже вільні години та забронює зручний для вас сеанс."}$j$::jsonb);

commit;
