-- The venue's own settings, saved as a whole.
--
-- Contacts, the booking rules every card inherits, the weekly hours and the
-- dated closures are four tables' worth of one screen. Saving them
-- separately would let the hours change while the buffer failed, which is
-- exactly the sort of half-change that makes a calendar lie.
--
-- Only the venue-level rows are touched here: opening_hours and closures
-- both allow a room_id, and a row carrying one belongs to that card. The
-- card editor does not offer those yet; when it does, it must not be this
-- function that writes them.

create or replace function public.save_settings(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  s jsonb := payload->'settings';
begin
  if not (select public.is_admin()) then
    raise exception 'Only an administrator may change the settings' using errcode = '42501';
  end if;

  if jsonb_typeof(s) is distinct from 'object' then
    raise exception 'payload.settings must be a JSON object';
  end if;

  update public.settings
     set site_title           = coalesce(s->>'site_title', ''),
         wordmark             = coalesce(s->>'wordmark', ''),
         phone_display        = coalesce(s->>'phone_display', ''),
         phone_e164           = coalesce(s->>'phone_e164', ''),
         extra_phone_display  = nullif(btrim(coalesce(s->>'extra_phone_display', '')), ''),
         email                = nullif(btrim(coalesce(s->>'email', '')), ''),
         address              = nullif(btrim(coalesce(s->>'address', '')), ''),
         map_url              = nullif(btrim(coalesce(s->>'map_url', '')), ''),
         instagram_handle     = nullif(btrim(coalesce(s->>'instagram_handle', '')), ''),
         instagram_url        = nullif(btrim(coalesce(s->>'instagram_url', '')), ''),
         opening_hours_note   = coalesce(s->>'opening_hours_note', ''),
         min_duration_minutes = coalesce((s->>'min_duration_minutes')::integer, 60),
         buffer_minutes       = coalesce((s->>'buffer_minutes')::integer, 0),
         slot_step_minutes    = coalesce((s->>'slot_step_minutes')::integer, 60)
   where id;

  if not found then
    raise exception 'The settings row is missing' using errcode = 'no_data_found';
  end if;

  -- Weekly hours. Replaced wholesale: there are seven of them, nothing
  -- references them by id, and upserting onto a partial unique index to
  -- save six deletes would be cleverness with no reader.
  if jsonb_typeof(payload->'hours') = 'array' then
    delete from public.opening_hours where room_id is null;

    insert into public.opening_hours (room_id, weekday, opens_at, closes_at, is_closed)
    select null,
           (e.value->>'weekday')::smallint,
           case when coalesce((e.value->>'is_closed')::boolean, false)
                then null else (e.value->>'opens_at')::time end,
           case when coalesce((e.value->>'is_closed')::boolean, false)
                then null else (e.value->>'closes_at')::time end,
           coalesce((e.value->>'is_closed')::boolean, false)
      from jsonb_array_elements(payload->'hours') as e(value);
  end if;

  -- Dated closures. These do have ids worth keeping: one may be referred to
  -- in conversation ("the repair in March"), and churning the ids would
  -- make the created_at meaningless.
  if jsonb_typeof(payload->'closures') = 'array' then
    delete from public.closures c
     where c.room_id is null
       and not exists (
         select 1
           from jsonb_array_elements(payload->'closures') as e(value)
          where (e.value->>'id')::uuid = c.id
       );

    update public.closures c
       set starts_on = (e.value->>'starts_on')::date,
           ends_on   = (e.value->>'ends_on')::date,
           reason    = nullif(btrim(coalesce(e.value->>'reason', '')), '')
      from jsonb_array_elements(payload->'closures') as e(value)
     where c.id = (e.value->>'id')::uuid;

    insert into public.closures (room_id, starts_on, ends_on, reason)
    select null,
           (e.value->>'starts_on')::date,
           (e.value->>'ends_on')::date,
           nullif(btrim(coalesce(e.value->>'reason', '')), '')
      from jsonb_array_elements(payload->'closures') as e(value)
     where e.value->>'id' is null;
  end if;
end;
$$;

revoke execute on function public.save_settings(jsonb) from public, anon;
grant execute on function public.save_settings(jsonb) to authenticated;
