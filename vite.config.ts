import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import type { IncomingMessage, ServerResponse } from 'http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DB_DIR = 'D:\\Data Sổ phụ';
const DB_PATH = path.join(DB_DIR, 'app.db');

interface DevTransactionAllocation {
  amount?: number;
  suggested_category_id?: string | null;
  suggested_category_code?: string | null;
  suggested_category_name?: string | null;
  confirmed_category_id?: string | null;
  confirmed_category_code?: string | null;
  confirmed_category_name?: string | null;
}

interface DevTransactionMatch {
  suggested_category_id?: string | null;
  suggested_category_code?: string | null;
  suggested_category_name?: string | null;
  confirmed_category_id?: string | null;
  confirmed_category_code?: string | null;
  confirmed_category_name?: string | null;
}

interface DevTransaction {
  id: string;
  batch_id: string;
  raw_date?: string;
  raw_desc?: string;
  raw_reference?: string | null;
  normalized_date: string;
  normalized_amount: number;
  debit_amount?: number;
  credit_amount?: number;
  balance_after?: number | null;
  status?: string;
  sender_name?: string | null;
  allocations?: DevTransactionAllocation[];
  match?: DevTransactionMatch | null;
  invoice_issued?: boolean | null;
  notes?: string | null;
}

interface DevTuitionRecord {
  transactionId: string;
  date?: string;
  normalizedDate?: string;
  amount?: number;
  description?: string;
  extractedName?: string;
  status?: string;
  matchedStudents?: unknown[];
  confirmedStudent?: unknown | null;
  categoryCode?: string;
  bankCode?: string;
  rawReference?: string;
}

interface DevState {
  bidvTransactions: DevTransaction[];
  agribankTransactions: DevTransaction[];
  rules: Record<string, unknown>[];
  categories: DevCategory[];
  batches: Record<string, unknown>[];
  students: Record<string, unknown>[];
  tuitionRecords: DevTuitionRecord[];
  activeBank: string;
}

interface DevCategory {
  id?: string;
  code?: string;
  name?: string;
}

interface SupabaseTransactionRow extends DevTransaction {
  bank_code: 'BIDV' | 'AGRIBANK';
}

interface SupabaseTuitionRow {
  transaction_id: string;
  date?: string;
  normalized_date?: string;
  amount?: number;
  description?: string;
  extracted_name?: string;
  status?: string;
  category_code?: string;
  bank_code?: string;
  raw_reference?: string;
  confirmed_student_ma_ho_so?: string | null;
  matched_students?: unknown[];
}

function getDb(): Database.Database {
  mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      bank_code TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      maHoSo TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tuition_records (
      transactionId TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);

  return db;
}

function loadState(db: Database.Database): DevState {
  const bidvRows = db.prepare('SELECT data FROM transactions WHERE bank_code = ?').all('BIDV') as { data: string }[];
  const agriRows = db.prepare('SELECT data FROM transactions WHERE bank_code = ?').all('AGRIBANK') as { data: string }[];
  const ruleRows = db.prepare('SELECT data FROM rules').all() as { data: string }[];
  const catRows = db.prepare('SELECT data FROM categories').all() as { data: string }[];
  const batchRows = db.prepare('SELECT data FROM batches').all() as { data: string }[];
  const studentRows = db.prepare('SELECT data FROM students').all() as { data: string }[];
  const tuitionRows = db.prepare('SELECT data FROM tuition_records').all() as { data: string }[];
  const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('activeBank') as { value: string } | undefined;

  return {
    bidvTransactions: bidvRows.map((row) => JSON.parse(row.data)),
    agribankTransactions: agriRows.map((row) => JSON.parse(row.data)),
    rules: ruleRows.map((row) => JSON.parse(row.data)),
    categories: catRows.map((row) => JSON.parse(row.data)),
    batches: batchRows.map((row) => JSON.parse(row.data)),
    students: studentRows.map((row) => JSON.parse(row.data)),
    tuitionRecords: tuitionRows.map((row) => JSON.parse(row.data)),
    activeBank: settingRow?.value || 'BIDV',
  };
}

function saveState(db: Database.Database, state: Record<string, any>): void {
  const runInTransaction = db.transaction(() => {
    db.prepare('DELETE FROM transactions').run();
    const insertTxn = db.prepare('INSERT INTO transactions (id, bank_code, data) VALUES (?, ?, ?)');
    for (const transaction of state.bidvTransactions || []) {
      insertTxn.run(transaction.id, 'BIDV', JSON.stringify(transaction));
    }
    for (const transaction of state.agribankTransactions || []) {
      insertTxn.run(transaction.id, 'AGRIBANK', JSON.stringify(transaction));
    }

    db.prepare('DELETE FROM rules').run();
    const insertRule = db.prepare('INSERT INTO rules (id, data) VALUES (?, ?)');
    for (const rule of state.rules || []) {
      insertRule.run(rule.id, JSON.stringify(rule));
    }

    db.prepare('DELETE FROM categories').run();
    const insertCategory = db.prepare('INSERT INTO categories (id, data) VALUES (?, ?)');
    for (const category of state.categories || []) {
      insertCategory.run(category.id, JSON.stringify(category));
    }

    db.prepare('DELETE FROM batches').run();
    const insertBatch = db.prepare('INSERT INTO batches (id, data) VALUES (?, ?)');
    for (const batch of state.batches || []) {
      insertBatch.run(batch.id, JSON.stringify(batch));
    }

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      'activeBank',
      state.activeBank || 'BIDV',
    );

    db.prepare('DELETE FROM students').run();
    const insertStudent = db.prepare('INSERT INTO students (maHoSo, data) VALUES (?, ?)');
    for (const student of state.students || []) {
      insertStudent.run(student.maHoSo, JSON.stringify(student));
    }

    db.prepare('DELETE FROM tuition_records').run();
    const insertTuition = db.prepare('INSERT INTO tuition_records (transactionId, data) VALUES (?, ?)');
    for (const record of state.tuitionRecords || []) {
      insertTuition.run(record.transactionId, JSON.stringify(record));
    }
  });

  runInTransaction();
}

function createSupabaseRuntimeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function fetchAllSupabaseRows<T>(client: SupabaseClient, table: string): Promise<T[]> {
  const rows: T[] = [];

  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(offset, offset + 999);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as T[]));
    if (data.length < 1000) break;
  }

  return rows;
}

async function loadStateFromSupabase(client: SupabaseClient): Promise<DevState> {
  const [transactionRows, categoryRows, tuitionRows] = await Promise.all([
    fetchAllSupabaseRows<SupabaseTransactionRow>(client, 'transactions'),
    fetchAllSupabaseRows<DevCategory>(client, 'categories'),
    fetchAllSupabaseRows<SupabaseTuitionRow>(client, 'tuition_records'),
  ]);

  const bidvTransactions: DevTransaction[] = [];
  const agribankTransactions: DevTransaction[] = [];

  for (const row of transactionRows) {
    const transaction: DevTransaction = {
      id: row.id,
      batch_id: row.batch_id,
      raw_date: row.raw_date,
      raw_desc: row.raw_desc,
      raw_reference: row.raw_reference ?? null,
      normalized_date: row.normalized_date,
      normalized_amount: Number(row.normalized_amount ?? 0),
      debit_amount: Number(row.debit_amount ?? 0),
      credit_amount: Number(row.credit_amount ?? 0),
      balance_after: row.balance_after == null ? null : Number(row.balance_after),
      status: row.status,
      sender_name: row.sender_name ?? null,
      allocations: Array.isArray(row.allocations) ? row.allocations : [],
      match: row.match ?? null,
      invoice_issued: row.invoice_issued ?? null,
      notes: row.notes ?? null,
    };

    if (row.bank_code === 'AGRIBANK') {
      agribankTransactions.push(transaction);
    } else {
      bidvTransactions.push(transaction);
    }
  }

  const tuitionRecords: DevTuitionRecord[] = tuitionRows.map((row) => ({
    transactionId: row.transaction_id,
    date: row.date,
    normalizedDate: row.normalized_date,
    amount: Number(row.amount ?? 0),
    description: row.description,
    extractedName: row.extracted_name,
    status: row.status,
    matchedStudents: Array.isArray(row.matched_students) ? row.matched_students : [],
    confirmedStudent: null,
    categoryCode: row.category_code,
    bankCode: row.bank_code,
    rawReference: row.raw_reference,
  }));

  return {
    bidvTransactions,
    agribankTransactions,
    rules: [],
    categories: categoryRows,
    batches: [],
    students: [],
    tuitionRecords,
    activeBank: 'BIDV',
  };
}

function setCorsHeaders(res: ServerResponse, origin: string | null = '*'): void {
  res.setHeader('Access-Control-Allow-Origin', origin ?? 'null');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
}

function handleOptions(req: IncomingMessage, res: ServerResponse, origin: string | null = '*'): boolean {
  if (req.method !== 'OPTIONS') return false;

  setCorsHeaders(res, origin);
  res.statusCode = 204;
  res.end();
  return true;
}

function parseBooleanParam(value: string | null): boolean {
  return value === '1' || value === 'true' || value === 'yes';
}

function getApiKeyFromRequest(req: IncomingMessage): string {
  const headerValue = req.headers['x-api-key'];
  if (Array.isArray(headerValue)) return headerValue[0] ?? '';
  return typeof headerValue === 'string' ? headerValue : '';
}

function getOriginFromRequest(req: IncomingMessage): string {
  const headerValue = req.headers.origin;
  if (Array.isArray(headerValue)) return headerValue[0] ?? '';
  return typeof headerValue === 'string' ? headerValue.trim() : '';
}

function isOriginAllowed(req: IncomingMessage, allowedOrigins: Set<string>): boolean {
  const origin = getOriginFromRequest(req);
  if (!origin) return false;
  return allowedOrigins.has(origin);
}

function requireAllowedOrigin(req: IncomingMessage, res: ServerResponse, allowedOrigins: Set<string>): string | null {
  if (allowedOrigins.size === 0) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'EXPORT_ALLOWED_ORIGINS is not configured.' }));
    return null;
  }

  const origin = getOriginFromRequest(req);
  if (!origin) {
    return '*';
  }

  if (origin && allowedOrigins.has(origin)) {
    return origin;
  }

  res.statusCode = 403;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'Forbidden origin.' }));
  return null;
}

function requireApiKey(req: IncomingMessage, res: ServerResponse, expectedApiKey: string): boolean {
  if (!expectedApiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'EXPORT_API_KEY is not configured.' }));
    return false;
  }

  const receivedApiKey = getApiKeyFromRequest(req).trim();
  if (receivedApiKey && receivedApiKey === expectedApiKey) {
    return true;
  }

  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'Unauthorized. Invalid or missing API key.' }));
  return false;
}

function matchesCategoryValue(value: string | null | undefined, targets: Set<string>): boolean {
  if (!value) return false;
  return targets.has(value.trim().toLowerCase());
}

function getTransactionCategoryHit(transaction: DevTransaction, categoryTargets: Set<string>) {
  const allocations = Array.isArray(transaction.allocations) ? transaction.allocations : [];
  const matchedAllocation = allocations.find((allocation) => (
    matchesCategoryValue(allocation.confirmed_category_code, categoryTargets) ||
    matchesCategoryValue(allocation.suggested_category_code, categoryTargets) ||
    matchesCategoryValue(allocation.confirmed_category_name, categoryTargets) ||
    matchesCategoryValue(allocation.suggested_category_name, categoryTargets) ||
    matchesCategoryValue(allocation.confirmed_category_id, categoryTargets) ||
    matchesCategoryValue(allocation.suggested_category_id, categoryTargets)
  ));

  if (matchedAllocation) {
    return {
      source: 'allocation',
      categoryId: matchedAllocation.confirmed_category_id ?? matchedAllocation.suggested_category_id ?? null,
      categoryCode: matchedAllocation.confirmed_category_code ?? matchedAllocation.suggested_category_code ?? null,
      categoryName: matchedAllocation.confirmed_category_name ?? matchedAllocation.suggested_category_name ?? null,
      amount: typeof matchedAllocation.amount === 'number' ? matchedAllocation.amount : transaction.normalized_amount,
    };
  }

  const match = transaction.match;
  if (!match) return null;

  const matchedTransaction = [
    match.confirmed_category_code,
    match.suggested_category_code,
    match.confirmed_category_name,
    match.suggested_category_name,
    match.confirmed_category_id,
    match.suggested_category_id,
  ].some((value) => matchesCategoryValue(value, categoryTargets));

  if (!matchedTransaction) return null;

  return {
    source: 'match',
    categoryId: match.confirmed_category_id ?? match.suggested_category_id ?? null,
    categoryCode: match.confirmed_category_code ?? match.suggested_category_code ?? null,
    categoryName: match.confirmed_category_name ?? match.suggested_category_name ?? null,
    amount: transaction.normalized_amount,
  };
}

function getConfirmedCategorySummary(transaction: DevTransaction, categoriesByCode: Map<string, string>): string {
  const names: string[] = [];
  const allocations = Array.isArray(transaction.allocations) ? transaction.allocations : [];

  for (const allocation of allocations) {
    const code = allocation.confirmed_category_code;
    if (!code) continue;

    const name =
      categoriesByCode.get(code) ||
      allocation.confirmed_category_name ||
      code;

    if (!names.includes(name)) {
      names.push(name);
    }
  }

  if (names.length > 0) {
    return names.join(' + ');
  }

  const directName =
    transaction.match?.confirmed_category_name ||
    transaction.match?.suggested_category_name ||
    '';

  return directName;
}

function getTransactionsByCategory(state: DevState, requestUrl: string) {
  const url = new URL(requestUrl, 'http://localhost');
  const categoryTargets = new Set(
    (url.searchParams.get('category') || 'HOC_PHI,HP')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  const bankCode = url.searchParams.get('bank_code')?.trim().toUpperCase() || '';
  const status = url.searchParams.get('status')?.trim().toLowerCase() || '';
  const yearValue = url.searchParams.get('year');
  const monthValue = url.searchParams.get('month');
  const year = yearValue ? Number(yearValue) : null;
  const month = monthValue ? Number(monthValue) : null;
  const savedOnly = parseBooleanParam(url.searchParams.get('saved_only'));
  const includeTuition = url.searchParams.get('include_tuition') !== 'false';

  const tuitionByTransactionId = new Map<string, DevTuitionRecord>();
  for (const record of state.tuitionRecords) {
    tuitionByTransactionId.set(record.transactionId, record);
  }

  const categoriesByCode = new Map<string, string>();
  for (const category of state.categories) {
    if (category.code) {
      categoriesByCode.set(category.code, category.name || category.code);
    }
  }

  const allTransactions = [
    ...state.bidvTransactions.map((transaction) => ({ ...transaction, bank_code: 'BIDV' as const })),
    ...state.agribankTransactions.map((transaction) => ({ ...transaction, bank_code: 'AGRIBANK' as const })),
  ];

  const matchedItems = allTransactions
    .map((transaction) => {
      const category = getTransactionCategoryHit(transaction, categoryTargets);
      if (!category) return null;

      const tuitionRecord = tuitionByTransactionId.get(transaction.id) ?? null;
      return {
        id: transaction.id,
        bank_code: transaction.bank_code,
        batch_id: transaction.batch_id,
        status: transaction.status ?? null,
        raw_date: transaction.raw_date ?? null,
        raw_desc: transaction.raw_desc ?? null,
        raw_reference: transaction.raw_reference ?? null,
        normalized_date: transaction.normalized_date,
        normalized_amount: transaction.normalized_amount,
        debit_amount: transaction.debit_amount ?? 0,
        credit_amount: transaction.credit_amount ?? 0,
        balance_after: transaction.balance_after ?? null,
        sender_name: transaction.sender_name ?? null,
        invoice_issued: transaction.invoice_issued ?? null,
        notes: transaction.notes ?? null,
        allocations: Array.isArray(transaction.allocations) ? transaction.allocations : [],
        match: transaction.match ?? null,
        hp_category: {
          source: category.source,
          id: category.categoryId,
          code: category.categoryCode,
          name: category.categoryName,
          amount: category.amount,
        },
        tuition_record: includeTuition ? tuitionRecord : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter((item) => {
      if (bankCode && item.bank_code !== bankCode) return false;
      if (status && (item.status || '').toLowerCase() !== status) return false;

      if (year && !Number.isNaN(year)) {
        if (Number(item.normalized_date.slice(0, 4)) !== year) return false;
      }

      if (month && !Number.isNaN(month)) {
        if (Number(item.normalized_date.slice(5, 7)) !== month) return false;
      }

      if (savedOnly && !item.tuition_record) return false;
      return true;
    })
    .sort((left, right) => {
      const dateCompare = left.normalized_date.localeCompare(right.normalized_date);
      if (dateCompare !== 0) return dateCompare;
      return left.id.localeCompare(right.id);
    });

  const items = matchedItems.map((item, index) => {
    const transactionTime = item.raw_date || item.normalized_date || '';
    const incomingAmount = item.credit_amount > 0
      ? item.credit_amount
      : item.normalized_amount;
    const outgoingAmount = item.debit_amount > 0 ? item.debit_amount : 0;
    const referenceCode = item.raw_reference || item.id;
    const categoryLabel = getConfirmedCategorySummary(item, categoriesByCode);

    return {
      ...item,
      export_row: {
        dong: index + 1,
        so_tham_chieu: referenceCode,
        thoi_gian_gd: transactionTime,
        tien_vao: incomingAmount,
        tien_ra: outgoingAmount,
        so_du: 0,
        noi_dung_giao_dich: item.raw_desc || '',
        mo_ta: categoryLabel,
        trang_thai: 'READY',
      },
    };
  });

  return {
    ok: true,
    filters: {
      category: Array.from(categoryTargets),
      bank_code: bankCode || null,
      status: status || null,
      year: year && !Number.isNaN(year) ? year : null,
      month: month && !Number.isNaN(month) ? month : null,
      saved_only: savedOnly,
      include_tuition: includeTuition,
    },
    total: items.length,
    items,
  };
}

const sqliteDataPlugin = (
  exportApiKey: string,
  allowedOrigins: Set<string>,
  supabaseUrl: string,
  supabaseKey: string,
): Plugin => ({
  name: 'sqlite-data-api',
  configureServer(server) {
    server.middlewares.use('/api/dev-data', async (req, res) => {
      if (handleOptions(req, res)) return;
      setCorsHeaders(res);

      if (req.method === 'GET') {
        try {
          const db = getDb();
          const state = loadState(db);
          db.close();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(state));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      if (req.method === 'PUT') {
        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => resolve());
            req.on('error', reject);
          });

          const body = Buffer.concat(chunks).toString('utf8');
          const parsed = JSON.parse(body);
          const db = getDb();
          saveState(db, parsed);
          db.close();

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: true }));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Method not allowed.' }));
    });

    server.middlewares.use('/api/transactions/by-category', async (req, res) => {
      const optionOrigin = isOriginAllowed(req, allowedOrigins) ? getOriginFromRequest(req) : null;
      if (handleOptions(req, res, optionOrigin)) return;

      const allowedOrigin = requireAllowedOrigin(req, res, allowedOrigins);
      if (!allowedOrigin) {
        return;
      }
      setCorsHeaders(res, allowedOrigin);

      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Method not allowed.' }));
        return;
      }

      if (!requireApiKey(req, res, exportApiKey)) {
        return;
      }

      try {
        const state = supabaseUrl && supabaseKey
          ? await loadStateFromSupabase(createSupabaseRuntimeClient(supabaseUrl, supabaseKey))
          : (() => {
              const db = getDb();
              const sqliteState = loadState(db);
              db.close();
              return sqliteState;
            })();

        const payload = getTransactionsByCategory(state, req.url || '/api/transactions/by-category');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
      } catch (error: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message }));
      }
    });

    server.middlewares.use('/api/transactions/hp', async (req, res) => {
      const optionOrigin = isOriginAllowed(req, allowedOrigins) ? getOriginFromRequest(req) : null;
      if (handleOptions(req, res, optionOrigin)) return;

      const allowedOrigin = requireAllowedOrigin(req, res, allowedOrigins);
      if (!allowedOrigin) {
        return;
      }
      setCorsHeaders(res, allowedOrigin);

      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Method not allowed.' }));
        return;
      }

      if (!requireApiKey(req, res, exportApiKey)) {
        return;
      }

      try {
        const state = supabaseUrl && supabaseKey
          ? await loadStateFromSupabase(createSupabaseRuntimeClient(supabaseUrl, supabaseKey))
          : (() => {
              const db = getDb();
              const sqliteState = loadState(db);
              db.close();
              return sqliteState;
            })();

        const fallbackUrl = '/api/transactions/hp?category=HOC_PHI,HP';
        const payload = getTransactionsByCategory(state, req.url || fallbackUrl);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
      } catch (error: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const exportApiKey = env.EXPORT_API_KEY?.trim() || '';
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || '';
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
  const allowedOrigins = new Set(
    (env.EXPORT_ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  return {
    plugins: [react(), tailwindcss(), sqliteDataPlugin(exportApiKey, allowedOrigins, supabaseUrl, supabaseKey)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      open: true,
    },
  };
});
