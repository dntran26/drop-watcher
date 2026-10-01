-- One row per source (shop, feed) so repeated failures raise a single alert.
create table if not exists source_health (
  key         text primary key,
  fail_count  int not null default 0,
  last_ok     timestamptz,
  last_error  text
);
alter table source_health enable row level security;
