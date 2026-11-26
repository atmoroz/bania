-- Unpublished edits, so the owner can look before the site changes.
--
-- A separate table rather than a `draft` column on page_blocks. The column
-- looked simpler until the permissions were worked out: anonymous visitors
-- hold a select grant on page_blocks, so a draft column would be readable by
-- anyone who asked for it by name. Revoking one column is possible, but
-- `authenticated` covers the administrator too, so the revoke would have
-- blocked the one person who needs it.
--
-- A table carries its own grants. Anonymous roles are given nothing at all,
-- which is a stronger statement than remembering never to select a column.
create table if not exists public.page_block_drafts (
  block_id   uuid primary key references public.page_blocks (id) on delete cascade,
  content    jsonb not null,
  is_visible boolean not null,
  updated_at timestamptz not null default now(),

  constraint page_block_drafts_content_is_object check (jsonb_typeof(content) = 'object')
);

alter table public.page_block_drafts enable row level security;

drop policy if exists page_block_drafts_admin_all on public.page_block_drafts;
create policy page_block_drafts_admin_all on public.page_block_drafts
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

revoke all on public.page_block_drafts from public, anon;
grant select, insert, update, delete on public.page_block_drafts to authenticated;

drop trigger if exists page_block_drafts_touch on public.page_block_drafts;
create trigger page_block_drafts_touch
  before update on public.page_block_drafts
  for each row execute function private.touch_updated_at();
