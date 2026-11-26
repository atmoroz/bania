-- Opening hours for a span of dates in one round trip.
--
-- The calendar needs to know which days are already full before the visitor
-- clicks them, which means resolving the schedule for every day on screen.
-- Thirty separate calls to room_schedule_for_date would do it, and thirty
-- round trips is the wrong way to answer one question.
--
-- It calls the per-date function rather than repeating its logic. The rules it
-- holds -- room override or venue default, closures, DST-correct instants --
-- are intricate enough that a second copy would drift from the first.
create or replace function public.room_schedule_for_range(
  p_room_id uuid,
  p_from    date,
  p_to      date
)
returns table (
  day                  date,
  is_open              boolean,
  opens_at             timestamptz,
  closes_at            timestamptz,
  min_duration_minutes integer,
  buffer_minutes       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
begin
  if p_to < p_from then
    raise exception 'range ends before it starts';
  end if;

  -- A calendar shows a month; this allows two. Without a ceiling a single
  -- request could ask for a decade and spend the database's time on it.
  if p_to - p_from > 62 then
    raise exception 'range is too long';
  end if;

  return query
    select d::date,
           s.is_open,
           s.opens_at,
           s.closes_at,
           s.min_duration_minutes,
           s.buffer_minutes
      from generate_series(p_from, p_to, interval '1 day') d
      cross join lateral public.room_schedule_for_date(p_room_id, d::date) s;
end;
$fn$;

revoke execute on function public.room_schedule_for_range(uuid, date, date) from public;
grant  execute on function public.room_schedule_for_range(uuid, date, date) to anon, authenticated;
