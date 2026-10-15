-- Add support for up to two public product video URLs.
-- Run this migration in Supabase SQL Editor before deploying the product media UI.
alter table public.products
  add column if not exists videos text[] not null default '{}'::text[];

update public.products
set videos = '{}'::text[]
where videos is null;
