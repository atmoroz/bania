-- Two placeholders I guessed the slugs of wrongly in the previous
-- migration, so they survived it and sat among the owner's real list:
--
--   `venik` — a generic broom, now replaced by the four real ones;
--   `grill` — renting a grill, which contradicts what the booking
--             already includes ("мангал та приладдя для нього").

delete from public.addons where slug in ('venik', 'grill');
