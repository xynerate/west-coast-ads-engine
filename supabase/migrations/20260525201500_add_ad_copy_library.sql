-- Store client-approved copy edits so future generations can learn the preferred wording.

create table if not exists public.ad_copy_library (
  id uuid primary key default gen_random_uuid(),
  service_key text not null,
  theme text,
  headline text not null,
  body text not null,
  cta text,
  hashtags text,
  original_headline text,
  original_body text,
  original_cta text,
  original_hashtags text,
  author_email text,
  created_at timestamptz not null default now()
);

create index if not exists ad_copy_library_service_created_idx
  on public.ad_copy_library (service_key, created_at desc);

create index if not exists ad_copy_library_created_idx
  on public.ad_copy_library (created_at desc);

alter table public.ad_copy_library enable row level security;
