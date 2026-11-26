-- Supabase no longer lets SQL delete from storage.objects:
--
--   Direct deletion from storage tables is not allowed. Use the Storage API
--   instead.
--
-- The trigger added in 20261126120300_storage.sql did exactly that, so it was
-- not a safety net at all -- it made deleting any media row fail outright.
-- Nothing had ever deleted one until the media library was built, which is
-- why it went unnoticed, and why the throwaway container missed it: the test
-- harness stubs storage.objects as a plain table with no such rule.
--
-- The bytes are now removed through the Storage API by the server action,
-- after the row is gone. The row is the authority: an object left in the
-- bucket is invisible waste, while a row pointing at a missing object is a
-- broken image on the site.

drop trigger if exists media_delete_object on public.media;
drop function if exists private.delete_media_object();
