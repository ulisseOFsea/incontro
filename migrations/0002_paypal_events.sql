create table if not exists paypal_events (
  id serial primary key,
  txn_id text not null unique,
  invoice_id text not null default '',
  event_type text not null,
  status text not null,
  amount text not null default '',
  currency text not null default 'EUR',
  source text not null,
  created_at timestamptz not null default now()
);
create index if not exists paypal_events_invoice_idx on paypal_events (invoice_id);
