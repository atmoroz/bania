-- Superseded by public.save_gallery, which writes the order along with
-- everything else the editor changed. Nothing calls this any more, and a
-- second way to reorder the gallery is a second thing to keep correct.

drop function if exists public.set_gallery_order(uuid[]);
