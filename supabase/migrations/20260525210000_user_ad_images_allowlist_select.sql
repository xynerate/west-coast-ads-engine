-- Narrow the SELECT policy on user-ad-images so only the 3 approved emails
-- (the same allow-list enforced in the edge functions) can list objects.
-- The bucket remains public so object URLs continue to work in <img src>.
--
-- This replaces the earlier "Authenticated read user-ad-images" policy that
-- allowed any authenticated user to enumerate the bucket. With Google OAuth
-- as the only enabled auth method that group was already effectively the 3
-- allow-listed accounts, but this policy makes the restriction explicit at
-- the database layer in case another auth method is enabled later.

drop policy if exists "Authenticated read user-ad-images" on storage.objects;

create policy "Allowlisted read user-ad-images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-ad-images'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'emmanuelledaniel1@gmail.com',
      'richard.bridgstock@gmail.com',
      'dugdan1979molteno@gmail.com'
    )
  );
