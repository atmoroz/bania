-- How long a hold lives is the owner's decision, not a constant.
--
-- It was five minutes, chosen when nobody had tried it. The answer from
-- the people who take the calls is ten: a guest needs time to find the
-- number and get through. That is the kind of number that changes again,
-- so it moves to the settings row beside the other booking rules
-- (decision 0005) instead of waiting for a deployment.

alter table public.settings
  add column if not exists hold_minutes integer not null default 10;

alter table public.settings
  drop constraint if exists settings_hold_minutes_sane;
alter table public.settings
  add constraint settings_hold_minutes_sane
    check (hold_minutes between 1 and 120);

-- Existing row: the value the owner asked for.
update public.settings set hold_minutes = 10 where hold_minutes = 5;

create or replace function public.place_hold(
  p_room_slug    text,
  p_slot_starts  timestamptz[],
  p_slot_minutes integer default 120
)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room          public.rooms%rowtype;
  v_hold_minutes  integer;
  v_max_holds     constant integer := 30;
  v_live_holds    integer;
  v_sorted        timestamptz[];
  v_run_start     timestamptz;
  v_run_end       timestamptz;
  v_slot          timestamptz;
  v_booking_id    uuid;
begin
  if p_slot_minutes <= 0 then
    raise exception 'slot length must be positive';
  end if;
  if p_slot_starts is null or array_length(p_slot_starts, 1) is null then
    raise exception 'no slots selected';
  end if;
  if array_length(p_slot_starts, 1) > 12 then
    raise exception 'too many slots in one request';
  end if;

  -- Read here, not passed in: the caller is a public page, and a hold
  -- length the browser could choose is not a rule.
  select coalesce(s.hold_minutes, 10) into v_hold_minutes from public.settings s limit 1;
  v_hold_minutes := coalesce(v_hold_minutes, 10);

  perform public.expire_stale_holds();

  select * into v_room from public.rooms
   where slug = p_room_slug and is_visible and accepts_bookings;
  if not found then
    raise exception 'room % is not bookable', p_room_slug;
  end if;

  -- A crude cap, but the only one available without an identity to rate-limit.
  -- Holds are anonymous, so nothing stops somebody placing them repeatedly; a
  -- short life and this ceiling keep the damage bounded rather than prevent it.
  select count(*) into v_live_holds from public.bookings where status = 'PENDING';
  if v_live_holds >= v_max_holds then
    raise exception 'too many unconfirmed holds right now, try again shortly';
  end if;

  select array_agg(s order by s) into v_sorted
    from unnest(p_slot_starts) s;

  v_run_start := null;
  foreach v_slot in array v_sorted loop
    if v_run_start is null then
      v_run_start := v_slot;
      v_run_end := v_slot + make_interval(mins => p_slot_minutes);
    elsif v_slot = v_run_end then
      v_run_end := v_slot + make_interval(mins => p_slot_minutes);
    else
      v_booking_id := private.insert_hold(v_room.id, v_run_start, v_run_end, v_hold_minutes);
      return next v_booking_id;
      v_run_start := v_slot;
      v_run_end := v_slot + make_interval(mins => p_slot_minutes);
    end if;
  end loop;

  if v_run_start is not null then
    v_booking_id := private.insert_hold(v_room.id, v_run_start, v_run_end, v_hold_minutes);
    return next v_booking_id;
  end if;
end;
$$;

revoke execute on function public.place_hold(text, timestamptz[], integer) from public;
grant execute on function public.place_hold(text, timestamptz[], integer) to anon, authenticated;

-- save_settings keeps up with the settings again: the hold length is now a
-- column, so the panel has to be able to write it.
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
         opening_hours_note   = coalesce(s->>'opening_hours_note', ''),
         min_duration_minutes = coalesce((s->>'min_duration_minutes')::integer, 60),
         buffer_minutes       = coalesce((s->>'buffer_minutes')::integer, 0),
         slot_step_minutes    = coalesce((s->>'slot_step_minutes')::integer, 60),
         hold_minutes         = coalesce((s->>'hold_minutes')::integer, 10)
   where id;

  if not found then
    raise exception 'The settings row is missing' using errcode = 'no_data_found';
  end if;

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

  if jsonb_typeof(payload->'social') = 'array' then
    delete from public.social_links l
     where not exists (
       select 1
         from jsonb_array_elements(payload->'social') as e(value)
        where (e.value->>'id')::uuid = l.id
     );

    update public.social_links l
       set kind       = (e.value->>'kind')::public.social_kind,
           url        = btrim(e.value->>'url'),
           label      = nullif(btrim(coalesce(e.value->>'label', '')), ''),
           is_visible = coalesce((e.value->>'is_visible')::boolean, true),
           sort_order = e.ordinality::integer
      from jsonb_array_elements(payload->'social') with ordinality as e(value, ordinality)
     where l.id = (e.value->>'id')::uuid;

    insert into public.social_links (kind, url, label, is_visible, sort_order)
    select (e.value->>'kind')::public.social_kind,
           btrim(e.value->>'url'),
           nullif(btrim(coalesce(e.value->>'label', '')), ''),
           coalesce((e.value->>'is_visible')::boolean, true),
           e.ordinality::integer
      from jsonb_array_elements(payload->'social') with ordinality as e(value, ordinality)
     where e.value->>'id' is null;
  end if;
end;
$$;

revoke execute on function public.save_settings(jsonb) from public, anon;
grant execute on function public.save_settings(jsonb) to authenticated;
