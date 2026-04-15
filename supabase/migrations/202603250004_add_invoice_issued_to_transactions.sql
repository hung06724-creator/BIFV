alter table public.transactions
add column if not exists invoice_issued boolean not null default false;

create index if not exists idx_transactions_invoice_issued
  on public.transactions(invoice_issued);
