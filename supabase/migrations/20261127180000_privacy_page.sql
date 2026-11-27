-- A privacy page, reachable from the footer and not from the menu.
--
-- Written from what the site actually does, checked rather than
-- assumed: no analytics, no advertising pixels, no third-party embeds,
-- fonts served from our own domain, and the only outbound links are the
-- owner's social profiles. What is collected is the review form (a
-- rating, and optionally a name and text), the hours a visitor holds in
-- the calendar — times only, no name — and the technical logs any host
-- and database keep.
--
-- `show_in_nav = false` keeps it out of the header while leaving it
-- reachable by URL, which is the arrangement the column exists for.

insert into public.pages (slug, nav_label, title, seo_title, seo_description, sort_order, is_visible, show_in_nav)
values (
  'privacy',
  'Політика конфіденційності',
  'Політика конфіденційності',
  'Політика конфіденційності',
  'Які дані збирає сайт «Стара Дорога» і які не збирає: без трекерів, без реклами, без передачі третім особам.',
  90, true, false
)
on conflict (slug) do update
  set nav_label = excluded.nav_label,
      title = excluded.title,
      seo_description = excluded.seo_description,
      show_in_nav = false,
      is_visible = true;

delete from public.page_blocks where page_slug = 'privacy';

insert into public.page_blocks (page_slug, block_type, sort_order, is_visible, content)
values
('privacy', 'rich_text', 1, true, jsonb_build_object(
  'eyebrow', 'Коротко',
  'title', 'Політика конфіденційності',
  'lead', 'Ми не ведемо рекламних трекерів, не маємо лічильників відвідувань і нікому не передаємо ваші дані. Нижче — усе, що сайт справді зберігає.',
  'body', 'Що ми не робимо

Сайт не містить рекламних пікселів, систем аналітики та кнопок соцмереж, які стежать за вами. Шрифти завантажуються з нашого ж домену, тож навіть вони нікуди не повідомляють про ваш візит. Ми не продаємо, не передаємо й не обмінюємо дані.'
)),
('privacy', 'rich_text', 2, true, jsonb_build_object(
  'title', 'Що ви залишаєте самі',
  'body', 'Відгук. Оцінка обов’язкова, текст і підпис — ні. Усе, що ви напишете, бачить адміністратор і, після його схвалення, усі відвідувачі. Не пишіть у відгуку телефон чи адресу — ми їх не питаємо.

Бронювання годин. Коли ви обираєте час у календарі, ми зберігаємо лише самі години та локацію — без імені й телефону. Якщо бронь не підтверджена дзвінком, вона зникає сама. Ім’я та номер з’являються в базі, тільки коли адміністратор записує вас після телефонної розмови, і потрібні вони для однієї речі: зателефонувати вам, якщо щось зміниться.'
)),
('privacy', 'rich_text', 3, true, jsonb_build_object(
  'title', 'Що зберігається у вашому браузері',
  'body', 'Обрана тема оформлення та ваша незавершена бронь — щоб сторінка не забула їх після перезавантаження. Це локальні записи у вашому пристрої, вони нікуди не надсилаються, і ви можете стерти їх у налаштуваннях браузера.

Якщо ви встановили сайт як застосунок, він зберігає на пристрої шрифти, стилі та фотографії, щоб відкриватися швидше. Сторінки з вільними годинами ніколи не кешуються: їх видно тільки наживо.'
)),
('privacy', 'rich_text', 4, true, jsonb_build_object(
  'title', 'Технічні записи',
  'body', 'Хостинг і база даних, як і будь-який сервер в інтернеті, ведуть службові журнали звернень: IP-адреса, браузер, час і адреса сторінки. Це потрібно, щоб сайт працював і щоб ми бачили збої та атаки. Ми не використовуємо ці записи для реклами й не звіряємо їх з вашими відгуками чи бронюваннями.'
)),
('privacy', 'rich_text', 5, true, jsonb_build_object(
  'title', 'Ваші права',
  'body', 'Напишіть або зателефонуйте нам — і ми видалимо ваш відгук чи бронювання на першу вимогу, без пояснень. Контакти на сторінці «Контакти».'
));
