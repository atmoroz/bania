-- A visitor can let go of their own hold.
--
-- Until now a hold could only lapse. Somebody who clicks six hours and
-- then changes their mind blocks those hours for everyone for the full
-- ten minutes, and the person who made the hold has no way to say "sorry,
-- not that". The hold's ids are returned only to the browser that made
-- it, and a uuid is not guessable, so possession of the ids is the proof
-- of ownership — the same argument that lets an unauthenticated page
-- create the hold in the first place.
--
-- Only a live PENDING hold can be released: a confirmed booking is the
-- administrator's to cancel, and an expired one is already gone.

create or replace function public.release_hold(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;
  if array_length(p_ids, 1) > 12 then
    raise exception 'too many bookings in one request';
  end if;

  update public.bookings
     set status = 'CANCELLED'
   where id = any(p_ids)
     and status = 'PENDING'
     and hold_expires_at > now();

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.release_hold(uuid[]) from public;
grant execute on function public.release_hold(uuid[]) to anon, authenticated;
