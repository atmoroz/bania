-- What became of the hold this browser made.
--
-- The visitor's page kept its hold in localStorage and never asked the
-- database about it again, so an administrator who cancelled the hold —
-- or confirmed it — left the guest looking at «Ваша бронь … ще не
-- підтверджена» and a running countdown for something that no longer
-- existed. Reported by the owner, who cancelled his own test hold in the
-- panel and watched it go on hanging in the browser.
--
-- The ids are the proof of ownership, as in release_hold: they were
-- returned to that browser alone and a uuid cannot be guessed. The
-- function says only what happened to them, never who booked or any
-- other detail.

create or replace function public.hold_state(p_ids uuid[])
returns table (state text, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    state := 'gone';
    expires_at := null;
    return next;
    return;
  end if;

  -- Confirmed wins: once the administrator has taken the call, that is
  -- the whole news, whatever happened to the other rows of the run.
  if exists (
    select 1 from public.bookings
     where id = any(p_ids) and status = 'CONFIRMED'
  ) then
    state := 'confirmed';
    select max(b.ends_at) into expires_at from public.bookings b where b.id = any(p_ids);
    return next;
    return;
  end if;

  -- The aggregate always returns a row, so the verdict comes from the
  -- value and not from whether a row came back: selecting the literal
  -- 'live' alongside it answered "live" for ids that never existed.
  select max(b.hold_expires_at)
    into expires_at
    from public.bookings b
   where b.id = any(p_ids)
     and b.status = 'PENDING'
     and b.hold_expires_at > now();

  state := case when expires_at is null then 'gone' else 'live' end;

  return next;
end;
$$;

revoke execute on function public.hold_state(uuid[]) from public;
grant execute on function public.hold_state(uuid[]) to anon, authenticated;
