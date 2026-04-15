create table if not exists public.batches (
  id text primary key,
  filename text not null
);

create table if not exists public.categories (
  id text primary key,
  code text not null,
  name text not null,
  group_name text null,
  ledger_account text null
);

create table if not exists public.rules (
  id text primary key,
  category_id text not null references public.categories(id),
  category_code text not null,
  category_name text not null,
  keyword text not null,
  type text not null check (type in ('exact', 'keyword', 'regex', 'amount', 'composite', 'fallback')),
  priority integer not null,
  amount_min numeric null,
  amount_max numeric null,
  conditions jsonb null,
  stop_on_match boolean not null,
  is_active boolean not null,
  match_count integer not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.students (
  ma_ho_so text primary key,
  ho_ten text not null,
  ngay_sinh text not null,
  nganh text not null,
  lop text not null
);

create table if not exists public.transactions (
  id text primary key,
  batch_id text not null references public.batches(id),
  bank_code text not null check (bank_code in ('BIDV', 'AGRIBANK')),
  raw_date text not null,
  raw_desc text not null,
  raw_reference text null,
  normalized_date text not null,
  normalized_amount numeric not null,
  debit_amount numeric not null,
  credit_amount numeric not null,
  balance_after numeric null,
  type text not null check (type in ('credit', 'debit')),
  split_mode text not null check (split_mode in ('direct', 'horizontal', 'vertical')),
  status text not null check (status in ('pending_classification', 'classified', 'confirmed', 'exported', 'matched', 'mismatched')),
  sender_name text null,
  notes text null,
  allocations jsonb not null default '[]'::jsonb,
  match jsonb null
);

create table if not exists public.tuition_records (
  transaction_id text primary key references public.transactions(id) on delete cascade,
  date text not null,
  normalized_date text not null,
  amount numeric not null,
  description text not null,
  extracted_name text not null,
  status text not null check (
    status in (
      'chua_trich_xuat',
      'khong_trich_xuat_duoc',
      'da_trich_xuat_chua_xac_nhan',
      'da_trich_xuat_trung_thong_tin',
      'da_xac_nhan'
    )
  ),
  category_code text not null,
  bank_code text not null,
  raw_reference text not null,
  confirmed_student_ma_ho_so text null references public.students(ma_ho_so),
  matched_students jsonb not null default '[]'::jsonb
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);

create index if not exists idx_transactions_batch_id
  on public.transactions(batch_id);

create index if not exists idx_transactions_bank_code
  on public.transactions(bank_code);

create index if not exists idx_transactions_normalized_date
  on public.transactions(normalized_date);

create index if not exists idx_transactions_raw_reference
  on public.transactions(raw_reference);

create index if not exists idx_transactions_status
  on public.transactions(status);

create index if not exists idx_rules_category_id
  on public.rules(category_id);

create index if not exists idx_rules_type
  on public.rules(type);

create index if not exists idx_students_ho_ten
  on public.students(ho_ten);

create index if not exists idx_tuition_records_status
  on public.tuition_records(status);

create index if not exists idx_tuition_records_bank_code
  on public.tuition_records(bank_code);

create index if not exists idx_tuition_records_confirmed_student
  on public.tuition_records(confirmed_student_ma_ho_so);
