-- Rooms show a photograph on their card, so they need to point at one.
-- Missed in the first pass: the location cards were already rendering an
-- image from fixtures, but the table had nowhere to keep it.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rooms' and column_name = 'cover_media_id'
  ) then
    alter table public.rooms
      add column cover_media_id uuid references public.media (id) on delete set null;
    create index rooms_cover_media_id_idx on public.rooms (cover_media_id);
  end if;
end $$;

-- Same for the hero background and any other single image a block points at:
-- blocks reference media by storage path inside their jsonb, so no column is
-- needed there. Rooms get a real column because the reference is structural.
