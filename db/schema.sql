-- drop-watcher schema. Run once in Supabase > SQL Editor.
-- RLS is on with no policies: only the server-side secret key can read or write.

create table if not exists watches (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  source        text not null check (source in ('bestbuy', 'shopify', 'jsonld', 'page')),
  url           text not null unique,
  sku           text,
  store         text,
  status        text not null default 'unknown' check (status in ('in', 'out', 'unknown', 'error')),
  price         numeric,
  fail_count    int not null default 0,
  active        boolean not null default true,
  last_checked  timestamptz,
  last_changed  timestamptz,
  created_at    timestamptz not null default now()
);

-- One row per product per Edmonton shop, so each run can spot new listings and restocks.
create table if not exists shop_snapshots (
  shop          text not null,
  product_id    bigint not null,
  title         text not null,
  handle        text not null,
  available     boolean not null,
  price         numeric,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  primary key (shop, product_id)
);

-- Everything shown on the Pokemon Drops and Buzz tabs.
create table if not exists feed_items (
  id            bigint generated always as identity primary key,
  tab           text not null check (tab in ('pokemon', 'buzz')),
  kind          text not null,              -- new_listing, restock, news, deal, discussion
  source        text not null,
  title         text not null,
  url           text not null unique,
  price         numeric,
  image         text,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists feed_items_tab_created on feed_items (tab, created_at desc);

-- Editable keyword lists (hype filter for Buzz, match list for Pokemon).
create table if not exists keywords (
  tab           text not null check (tab in ('pokemon', 'buzz')),
  word          text not null,
  primary key (tab, word)
);

alter table watches        enable row level security;
alter table shop_snapshots enable row level security;
alter table feed_items     enable row level security;
alter table keywords       enable row level security;
