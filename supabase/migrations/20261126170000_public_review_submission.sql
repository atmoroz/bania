-- Visitors may leave a rating, with or without a review to go with it.
--
-- Two changes to the shape, and one to how a review gets in.
--
-- Shape: body and author_name become optional. A rating on its own is the
-- common case -- most people will tap five stars and leave -- and demanding a
-- name buys nothing when nothing verifies it.
--
-- Route: submission moves from a direct insert behind an RLS policy to a
-- function. The policy could not hold the one check that matters, a ceiling on
-- how much unmoderated material a stranger can pile up, because a policy on
-- reviews cannot count reviews it is not allowed to read. Same reasoning as
-- place_hold: anonymous writes are bounded rather than prevented.

alter table public.reviews alter column body        drop not null;
alter table public.reviews alter column author_name drop not null;

alter table public.reviews drop constraint if exists reviews_body_present;
alter table public.reviews drop constraint if exists reviews_author_present;

alter table public.reviews add constraint reviews_body_length
  check (body is null or length(btrim(body)) between 1 and 4000);
alter table public.reviews add constraint reviews_author_length
  check (author_name is null or length(btrim(author_name)) between 1 and 120);

-- Blank strings are not a third state: either there is text or there is not.
alter table public.reviews add constraint reviews_body_not_blank
  check (body is null or btrim(body) = body);

-- The direct insert is withdrawn; submit_review is the only public way in.
drop policy if exists reviews_public_insert on public.reviews;

create or replace function public.submit_review(
  p_rating smallint,
  p_body   text default null,
  p_author text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_pending     integer;
  v_max_pending constant integer := 200;
  v_body        text := nullif(btrim(coalesce(p_body, '')), '');
  v_author      text := nullif(btrim(coalesce(p_author, '')), '');
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  if length(v_body) > 4000 then
    raise exception 'review is too long';
  end if;

  if length(v_author) > 120 then
    raise exception 'name is too long';
  end if;

  -- A crude ceiling, like the one on holds. It does not stop a determined
  -- flood; it stops an unattended one from growing without limit while the
  -- owner is not looking.
  select count(*) into v_pending from public.reviews where not is_approved;
  if v_pending >= v_max_pending then
    raise exception 'too many reviews are awaiting moderation';
  end if;

  insert into public.reviews (author_name, body, rating, is_approved)
  values (v_author, v_body, p_rating, false);
end;
$fn$;

revoke execute on function public.submit_review(smallint, text, text) from public;
grant execute on function public.submit_review(smallint, text, text) to anon, authenticated;
