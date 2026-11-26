-- Where the venue is found, as rows rather than columns.
--
-- `settings` carried instagram_handle and instagram_url, from the days
-- when Instagram was the only one. A bathhouse here is also on Telegram,
-- Viber and TikTok, and a column per network means a migration every time
-- the owner joins one -- while the footer would still have to know which
-- columns exist.
--
-- The kind is an enum rather than free text so the footer can show the
-- right mark: a logo is a trademark, and guessing it from a URL is how you
-- end up drawing Facebook's letter on a Telegram link. 'other' exists for
-- everything else and shows a plain link.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'social_kind') then
    create type public.social_kind as enum (
      'instagram', 'telegram', 'tiktok', 'facebook', 'viber', 'whatsapp', 'youtube', 'other'
    );
  end if;
end $$;

create table if not exists public.social_links (
  id         uuid primary key default gen_random_uuid(),
  kind       public.social_kind not null,
  url        text not null,
  -- Shown instead of the network's name: a handle, or what an 'other' link
  -- actually is.
  label      text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint social_links_url_not_blank check (btrim(url) <> '')
);

create index if not exists social_links_visible_sort_idx
  on public.social_links (sort_order) where is_visible;

drop trigger if exists social_links_touch_updated_at on public.social_links;
create trigger social_links_touch_updated_at before update on public.social_links
  for each row execute function private.touch_updated_at();

alter table public.social_links enable row level security;
alter table public.social_links force row level security;

drop policy if exists social_links_public_read on public.social_links;
create policy social_links_public_read on public.social_links
  for select to anon, authenticated using (is_visible);

drop policy if exists social_links_admin_all on public.social_links;
create policy social_links_admin_all on public.social_links
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select on public.social_links to anon, authenticated;
grant insert, update, delete on public.social_links to authenticated;

-- Carry over what the settings row already holds, so nothing disappears
-- from the footer between this migration and the next deploy.
insert into public.social_links (kind, url, label, sort_order)
select 'instagram', s.instagram_url, nullif(btrim(coalesce(s.instagram_handle, '')), ''), 1
  from public.settings s
 where coalesce(btrim(s.instagram_url), '') <> ''
   and not exists (select 1 from public.social_links where kind = 'instagram');

-- The columns go, rather than lingering as a second answer to the same
-- question. That mistake has been made once on this project already --
-- see 20261126190000_one_minimum.sql.
alter table public.settings
  drop column if exists instagram_handle,
  drop column if exists instagram_url;
