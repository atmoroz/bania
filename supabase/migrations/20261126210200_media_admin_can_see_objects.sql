-- Deleting an object through the Storage API needs permission to SELECT it.
--
-- 20261126120300_storage.sql deliberately created no select policy on
-- storage.objects, reasoning that a public bucket serves its files without
-- consulting RLS, so a select policy would only add the ability to LIST the
-- bucket -- handing anyone the full inventory. That reasoning still holds for
-- anonymous visitors.
--
-- It went one step too far: Storage resolves a delete by first finding the
-- row, so with no select policy the administrator's delete matched nothing
-- and removed nothing. Worse, it did so WITHOUT an error -- the API reports
-- an empty list of removed files, which reads like success.
--
-- This grants the sight only to an administrator. Anonymous listing is still
-- impossible, which was the point of the original decision.

drop policy if exists "media_admin_select" on storage.objects;
create policy "media_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select private.is_admin()));
