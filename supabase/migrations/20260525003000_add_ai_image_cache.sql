-- Cache Gemini-generated ad images so future batches can reuse them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ai-ad-images',
  'ai-ad-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.ai_image_cache (
  id uuid primary key default gen_random_uuid(),
  service_key text not null,
  theme text,
  prompt_hash text not null unique,
  prompt text not null,
  storage_bucket text not null default 'ai-ad-images',
  storage_path text not null,
  public_url text not null,
  used_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_image_cache_service_theme_idx
  on public.ai_image_cache (service_key, theme, created_at desc);

create index if not exists ai_image_cache_last_used_idx
  on public.ai_image_cache (last_used_at asc nulls first);

alter table public.ai_image_cache enable row level security;
