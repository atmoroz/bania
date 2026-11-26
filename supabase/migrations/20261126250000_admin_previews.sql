-- Somewhere to put unsaved work so the real page can draw it.
--
-- The pages tab already has `page_block_drafts`: a block is jsonb in the
-- first place, so its draft is the same jsonb and the preview overlays it on
-- the published rows. The catalogue and the gallery are not like that. They
-- come from normalised tables, and re-resolving ids into photographs and
-- prices inside the preview would be a second copy of the card query, free
-- to drift from the first.
--
-- So what is staged here is the shape the page renders, prepared by the
-- panel that already holds it: one row per editor, an opaque payload, read
-- back by the preview route and by nothing else. Nothing public ever reads
-- this table, which is why it carries no anon grant at all.

create table if not exists public.admin_previews (
  scope      text primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default now(),

  constraint admin_previews_scope_known check (scope in ('catalogue', 'gallery'))
);

alter table public.admin_previews enable row level security;
alter table public.admin_previews force row level security;

drop policy if exists admin_previews_admin_all on public.admin_previews;
create policy admin_previews_admin_all on public.admin_previews
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

revoke all on public.admin_previews from public, anon;
grant select, insert, update, delete on public.admin_previews to authenticated;

drop trigger if exists admin_previews_touch on public.admin_previews;
create trigger admin_previews_touch
  before update on public.admin_previews
  for each row execute function private.touch_updated_at();
