-- Tighten read access on the user-ad-images bucket.
-- The bucket stays public (so object URLs keep working in <img src>), but
-- listing objects via the Storage API now requires an authenticated session
-- instead of anyone holding the anon key.

-- Drop the broad SELECT policy created via the Supabase dashboard.
-- Common names are listed; missing ones are no-ops thanks to "if exists".
drop policy if exists "Public read user-ad-images" on storage.objects;
drop policy if exists "Public bucket listing" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Public read access" on storage.objects;
drop policy if exists "Allow public read access" on storage.objects;

-- Replace with a tight SELECT policy: authenticated users can list/select
-- objects in this bucket only. Anonymous (anon) requests can no longer list.
drop policy if exists "Authenticated read user-ad-images" on storage.objects;
create policy "Authenticated read user-ad-images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'user-ad-images');
