import Database from 'better-sqlite3';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SQLITE_PATH = 'D:\\Data Sá»• phá»¥\\app.db';
const ENV_PATH = '.env.local';
const BATCH_SIZE = 250;
const WRITE_DELAY_MS = 250;
const SYNTHETIC_BATCH_ID = '__tuition_orphans__';
const SYNTHETIC_BATCH_FILENAME = 'Synthetic tuition orphan transactions';

function parseEnvFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    map.set(trimmed.slice(0, idx), trimmed.slice(idx + 1));
  }
  return map;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(items, size) {
  const groups = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

async function upsertTable(supabase, table, rows, onConflict) {
  if (rows.length === 0) {
    console.log(`Skipping ${table}: no rows`);
    return;
  }

  let written = 0;
  for (const group of chunk(rows, BATCH_SIZE)) {
    const { error } = await supabase.from(table).upsert(group, { onConflict });
    if (error) {
      throw new Error(`Upsert failed for ${table}: ${error.message}`);
    }
    written += group.length;
    console.log(`Uploaded ${written}/${rows.length} rows into ${table}`);
    await sleep(WRITE_DELAY_MS);
  }
}

if (!fs.existsSync(ENV_PATH)) {
  console.error('Missing .env.local');
  process.exit(1);
}

if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`Missing source DB: ${SQLITE_PATH}`);
  process.exit(1);
}

const env = parseEnvFile(ENV_PATH);
const supabaseUrl = env.get('VITE_SUPABASE_URL');
const supabaseKey = env.get('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env values in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const db = new Database(SQLITE_PATH, { readonly: true });

function readJsonRows(query, mapper) {
  return db.prepare(query).all().map((row) => mapper(JSON.parse(row.data)));
}

const batches = readJsonRows('SELECT data FROM batches', (payload) => ({
  id: payload.id,
  filename: payload.filename,
}));

const categories = readJsonRows('SELECT data FROM categories', (payload) => ({
  id: payload.id,
  code: payload.code,
  name: payload.name,
  group_name: payload.group ?? null,
  ledger_account: payload.ledger_account ?? null,
}));

const rules = readJsonRows('SELECT data FROM rules', (payload) => ({
  id: payload.id,
  category_id: payload.category_id,
  category_code: payload.category_code,
  category_name: payload.category_name,
  keyword: payload.keyword,
  type: payload.type,
  priority: payload.priority,
  amount_min: payload.amount_min ?? null,
  amount_max: payload.amount_max ?? null,
  conditions: payload.conditions ?? null,
  stop_on_match: payload.stop_on_match === true,
  is_active: payload.is_active !== false,
  match_count: payload.match_count ?? 0,
  created_at: payload.created_at ?? '',
  updated_at: payload.updated_at ?? '',
}));

const students = readJsonRows('SELECT data FROM students', (payload) => ({
  ma_ho_so: payload.maHoSo,
  ho_ten: payload.hoTen,
  ngay_sinh: payload.ngaySinh,
  nganh: payload.nganh,
  lop: payload.lop,
}));

const bidvTransactions = readJsonRows(
  "SELECT data FROM transactions WHERE bank_code='BIDV'",
  (payload) => ({
    id: payload.id,
    batch_id: payload.batch_id,
    bank_code: 'BIDV',
    raw_date: payload.raw_date,
    raw_desc: payload.raw_desc,
    raw_reference: payload.raw_reference ?? null,
    normalized_date: payload.normalized_date,
    normalized_amount: payload.normalized_amount,
    debit_amount: payload.debit_amount,
    credit_amount: payload.credit_amount,
    balance_after: payload.balance_after ?? null,
    type: payload.type,
    split_mode: payload.split_mode,
    status: payload.status,
    sender_name: payload.sender_name ?? null,
    notes: payload.notes ?? null,
    allocations: Array.isArray(payload.allocations) ? payload.allocations : [],
    match: payload.match ?? null,
  }),
);

const agribankTransactions = readJsonRows(
  "SELECT data FROM transactions WHERE bank_code='AGRIBANK'",
  (payload) => ({
    id: payload.id,
    batch_id: payload.batch_id,
    bank_code: 'AGRIBANK',
    raw_date: payload.raw_date,
    raw_desc: payload.raw_desc,
    raw_reference: payload.raw_reference ?? null,
    normalized_date: payload.normalized_date,
    normalized_amount: payload.normalized_amount,
    debit_amount: payload.debit_amount,
    credit_amount: payload.credit_amount,
    balance_after: payload.balance_after ?? null,
    type: payload.type,
    split_mode: payload.split_mode,
    status: payload.status,
    sender_name: payload.sender_name ?? null,
    notes: payload.notes ?? null,
    allocations: Array.isArray(payload.allocations) ? payload.allocations : [],
    match: payload.match ?? null,
  }),
);

const tuitionRecords = readJsonRows('SELECT data FROM tuition_records', (payload) => ({
  transaction_id: payload.transactionId,
  date: payload.date,
  normalized_date: payload.normalizedDate,
  amount: payload.amount,
  description: payload.description,
  extracted_name: payload.extractedName,
  status: payload.status,
  category_code: payload.categoryCode,
  bank_code: payload.bankCode,
  raw_reference: payload.rawReference,
  confirmed_student_ma_ho_so: payload.confirmedStudent?.maHoSo ?? null,
  matched_students: Array.isArray(payload.matchedStudents) ? payload.matchedStudents : [],
}));

const activeBankRow = db.prepare("SELECT value FROM settings WHERE key='activeBank'").get();
const activeBank = activeBankRow?.value || 'BIDV';

const categoryIds = new Set(categories.map((category) => category.id));
for (const rule of rules) {
  if (!rule.category_id || categoryIds.has(rule.category_id)) continue;
  categories.push({
    id: rule.category_id,
    code: rule.category_code || rule.category_id,
    name: rule.category_name || rule.category_id,
    group_name: null,
    ledger_account: null,
  });
  categoryIds.add(rule.category_id);
}

const transactions = [...bidvTransactions, ...agribankTransactions];
const transactionIds = new Set(transactions.map((transaction) => transaction.id));
for (const record of tuitionRecords) {
  if (transactionIds.has(record.transaction_id)) continue;
  transactions.push({
    id: record.transaction_id,
    batch_id: SYNTHETIC_BATCH_ID,
    bank_code: record.bank_code === 'AGRIBANK' ? 'AGRIBANK' : 'BIDV',
    raw_date: record.date,
    raw_desc: record.description,
    raw_reference: record.raw_reference || null,
    normalized_date: record.normalized_date || record.date,
    normalized_amount: record.amount,
    debit_amount: 0,
    credit_amount: record.amount,
    balance_after: null,
    type: 'credit',
    split_mode: 'direct',
    status: 'matched',
    sender_name: null,
    notes: 'Synthetic transaction generated to preserve orphan tuition record during migration.',
    allocations: [],
    match: null,
  });
  transactionIds.add(record.transaction_id);
}

if (tuitionRecords.length > 0 && !batches.some((batch) => batch.id === SYNTHETIC_BATCH_ID)) {
  batches.push({
    id: SYNTHETIC_BATCH_ID,
    filename: SYNTHETIC_BATCH_FILENAME,
  });
}

db.close();

await upsertTable(supabase, 'batches', batches, 'id');
await upsertTable(supabase, 'categories', categories, 'id');
await upsertTable(supabase, 'students', students, 'ma_ho_so');
await upsertTable(supabase, 'rules', rules, 'id');
await upsertTable(supabase, 'transactions', transactions, 'id');
await upsertTable(supabase, 'tuition_records', tuitionRecords, 'transaction_id');
await upsertTable(supabase, 'app_settings', [{ key: 'activeBank', value: { activeBank } }], 'key');

console.log('Migration complete from D-drive SQLite to relational Supabase tables.');
console.log(
  JSON.stringify(
    {
      batches: batches.length,
      categories: categories.length,
      rules: rules.length,
      students: students.length,
      transactions: transactions.length,
      tuitionRecords: tuitionRecords.length,
      activeBank,
    },
    null,
    2,
  ),
);
