-- Track client feedback on whether AI images match ad copy, and score cache entries.

alter table public.ai_image_cache
  add column if not exists upvotes integer not null default 0,
  add column if not exists downvotes integer not null default 0;

create table if not exists public.ad_image_feedback (
  id uuid primary key default gen_random_uuid(),
  cache_id uuid references public.ai_image_cache (id) on delete set null,
  image_url text,
  service_key text not null,
  vote text not null check (vote in ('up', 'down')),
  headline text,
  body text,
  author_email text not null,
  created_at timestamptz not null default now()
);

create index if not exists ad_image_feedback_cache_idx
  on public.ad_image_feedback (cache_id, created_at desc);

create index if not exists ad_image_feedback_service_idx
  on public.ad_image_feedback (service_key, created_at desc);

alter table public.ad_image_feedback enable row level security;
