alter table public.app_settings enable row level security;
alter table public.batches enable row level security;
alter table public.categories enable row level security;
alter table public.rules enable row level security;
alter table public.students enable row level security;
alter table public.transactions enable row level security;
alter table public.tuition_records enable row level security;

drop policy if exists "runtime_app_settings_select" on public.app_settings;
create policy "runtime_app_settings_select"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "runtime_app_settings_insert" on public.app_settings;
create policy "runtime_app_settings_insert"
on public.app_settings
for insert
to anon, authenticated
with check (true);

drop policy if exists "runtime_app_settings_update" on public.app_settings;
create policy "runtime_app_settings_update"
on public.app_settings
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "runtime_app_settings_delete" on public.app_settings;
create policy "runtime_app_settings_delete"
on public.app_settings
for delete
to anon, authenticated
using (true);

drop policy if exists "runtime_batches_select" on public.batches;
create policy "runtime_batches_select"
on public.batches
for select
to anon, authenticated
using (true);

drop policy if exists "runtime_batches_insert" on public.batches;
create policy "runtime_batches_insert"
on public.batches
for insert
to anon, authenticated
with check (true);

drop policy if exists "runtime_batches_update" on public.batches;
create policy "runtime_batches_update"
on public.batches
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "runtime_batches_delete" on public.batches;
create policy "runtime_batches_delete"
on public.batches
for delete
to anon, authenticated
using (true);

drop policy if exists "runtime_categories_select" on public.categories;
create policy "runtime_categories_select"
on public.categories
for select
to anon, authenticated
using (true);

drop policy if exists "runtime_categories_insert" on public.categories;
create policy "runtime_categories_insert"
on public.categories
for insert
to anon, authenticated
with check (true);

drop policy if exists "runtime_categories_update" on public.categories;
create policy "runtime_categories_update"
on public.categories
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "runtime_categories_delete" on public.categories;
create policy "runtime_categories_delete"
on public.categories
for delete
to anon, authenticated
using (true);

drop policy if exists "runtime_rules_select" on public.rules;
create policy "runtime_rules_select"
on public.rules
for select
to anon, authenticated
using (true);

drop policy if exists "runtime_rules_insert" on public.rules;
create policy "runtime_rules_insert"
on public.rules
for insert
to anon, authenticated
with check (true);

drop policy if exists "runtime_rules_update" on public.rules;
create policy "runtime_rules_update"
on public.rules
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "runtime_rules_delete" on public.rules;
create policy "runtime_rules_delete"
on public.rules
for delete
to anon, authenticated
using (true);

drop policy if exists "runtime_students_select" on public.students;
create policy "runtime_students_select"
on public.students
for select
to anon, authenticated
using (true);

drop policy if exists "runtime_students_insert" on public.students;
create policy "runtime_students_insert"
on public.students
for insert
to anon, authenticated
with check (true);

drop policy if exists "runtime_students_update" on public.students;
create policy "runtime_students_update"
on public.students
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "runtime_students_delete" on public.students;
create policy "runtime_students_delete"
on public.students
for delete
to anon, authenticated
using (true);

drop policy if exists "runtime_transactions_select" on public.transactions;
create policy "runtime_transactions_select"
on public.transactions
for select
to anon, authenticated
using (true);

drop policy if exists "runtime_transactions_insert" on public.transactions;
create policy "runtime_transactions_insert"
on public.transactions
for insert
to anon, authenticated
with check (true);

drop policy if exists "runtime_transactions_update" on public.transactions;
create policy "runtime_transactions_update"
on public.transactions
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "runtime_transactions_delete" on public.transactions;
create policy "runtime_transactions_delete"
on public.transactions
for delete
to anon, authenticated
using (true);

drop policy if exists "runtime_tuition_records_select" on public.tuition_records;
create policy "runtime_tuition_records_select"
on public.tuition_records
for select
to anon, authenticated
using (true);

drop policy if exists "runtime_tuition_records_insert" on public.tuition_records;
create policy "runtime_tuition_records_insert"
on public.tuition_records
for insert
to anon, authenticated
with check (true);

drop policy if exists "runtime_tuition_records_update" on public.tuition_records;
create policy "runtime_tuition_records_update"
on public.tuition_records
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "runtime_tuition_records_delete" on public.tuition_records;
create policy "runtime_tuition_records_delete"
on public.tuition_records
for delete
to anon, authenticated
using (true);
