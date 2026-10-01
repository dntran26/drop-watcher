-- Walmart IDs contain letters; also keep link + image for the Pokemon tab.
alter table shop_snapshots alter column product_id type text;
alter table shop_snapshots add column if not exists url text;
alter table shop_snapshots add column if not exists image text;

-- Walmart can be watched too.
alter table watches drop constraint if exists watches_source_check;
alter table watches add constraint watches_source_check
  check (source in ('bestbuy', 'shopify', 'jsonld', 'walmart'));
