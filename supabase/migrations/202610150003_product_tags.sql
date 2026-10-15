-- Staff-managed merchandising labels displayed on product cards.
alter table public.products
  add column if not exists tags text[] not null default '{}'::text[];

update public.products
set tags = '{}'::text[]
where tags is null;

comment on column public.products.tags is
  'Optional staff-managed product labels, e.g. Best Seller, Sale, New Arrival, Trending, Limited Edition.';
