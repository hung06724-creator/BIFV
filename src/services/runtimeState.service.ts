import type { BatchOption, CategoryOption, TransactionListItem } from '@/components/features/transactions/types';
import type { RuleListItem } from '@/components/features/rules/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type BankTab = 'BIDV' | 'AGRIBANK';

export interface PersistedRuntimeState {
  bidvTransactions: TransactionListItem[];
  agribankTransactions: TransactionListItem[];
  rules: RuleListItem[];
  batches: BatchOption[];
  categories: CategoryOption[];
  activeBank: BankTab;
  students: any[];
  tuitionRecords: any[];
}

interface TransactionRow extends Omit<TransactionListItem, 'notes'> {
  bank_code: BankTab;
  invoice_issued: boolean;
  notes: string | null;
}

interface CategoryRow {
  id: string;
  code: string;
  name: string;
  group_name: string | null;
  ledger_account: string | null;
}

interface StudentRow {
  ma_ho_so: string;
  ho_ten: string;
  ngay_sinh: string;
  nganh: string;
  lop: string;
}

interface TuitionRow {
  transaction_id: string;
  date: string;
  normalized_date: string;
  amount: number;
  description: string;
  extracted_name: string;
  status: string;
  category_code: string;
  bank_code: string;
  raw_reference: string;
  confirmed_student_ma_ho_so: string | null;
  matched_students: any[];
}

interface AppSettingRow {
  key: string;
  value: unknown;
}

const TABLES = {
  transactions: 'transactions',
  rules: 'rules',
  categories: 'categories',
  batches: 'batches',
  students: 'students',
  tuitionRecords: 'tuition_records',
  settings: 'app_settings',
} as const;

const WRITE_BATCH_SIZE = 250;
const WRITE_DEBOUNCE_MS = 700;
const REALTIME_TABLES = Object.values(TABLES);
const SYNTHETIC_BATCH_ID = '__tuition_orphans__';
const SYNTHETIC_BATCH_FILENAME = 'Synthetic tuition orphan transactions';
const SYNTHETIC_TUITION_ORPHAN_NOTE = 'Synthetic transaction generated to preserve orphan tuition record during sync.';
const DEV_DATA_ENDPOINT = '/api/dev-data';

const EMPTY_STATE: PersistedRuntimeState = {
  bidvTransactions: [],
  agribankTransactions: [],
  rules: [],
  batches: [],
  categories: [],
  activeBank: 'BIDV',
  students: [],
  tuitionRecords: [],
};

let lastSyncedState: PersistedRuntimeState | null = null;
let pendingState: PersistedRuntimeState | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInProgress = false;
let lastLocalMutationAt = 0;

export function hasPendingRuntimeStatePersist(): boolean {
  return Boolean(pendingState || flushInProgress);
}

export function markRuntimeStateDirty(): void {
  lastLocalMutationAt = Date.now();
}

export function getLastRuntimeStateMutationAt(): number {
  return lastLocalMutationAt;
}

function cloneState(state: PersistedRuntimeState): PersistedRuntimeState {
  return {
    ...state,
    bidvTransactions: [...state.bidvTransactions],
    agribankTransactions: [...state.agribankTransactions],
    rules: [...state.rules],
    batches: [...state.batches],
    categories: [...state.categories],
    students: [...state.students],
    tuitionRecords: [...state.tuitionRecords],
  };
}

function normalizeRuntimeState(payload: Partial<PersistedRuntimeState> | null | undefined): PersistedRuntimeState {
  return {
    ...EMPTY_STATE,
    ...payload,
    bidvTransactions: Array.isArray(payload?.bidvTransactions) ? payload.bidvTransactions : [],
    agribankTransactions: Array.isArray(payload?.agribankTransactions) ? payload.agribankTransactions : [],
    rules: Array.isArray(payload?.rules) ? payload.rules : [],
    batches: Array.isArray(payload?.batches) ? payload.batches : [],
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
    students: Array.isArray(payload?.students) ? payload.students : [],
    tuitionRecords: Array.isArray(payload?.tuitionRecords) ? payload.tuitionRecords : [],
    activeBank: payload?.activeBank === 'AGRIBANK' ? 'AGRIBANK' : 'BIDV',
  };
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchAllRows<T>(table: string): Promise<T[]> {
  const supabase = getSupabaseClient();
  const rows: T[] = [];

  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
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

function toCategoryOption(row: CategoryRow): CategoryOption {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    group: row.group_name ?? undefined,
    ledger_account: row.ledger_account ?? undefined,
  };
}

function toStudentInfo(row: StudentRow) {
  return {
    maHoSo: row.ma_ho_so,
    hoTen: row.ho_ten,
    ngaySinh: row.ngay_sinh,
    nganh: row.nganh,
    lop: row.lop,
  };
}

function toTuitionRecord(row: TuitionRow, studentsById: Map<string, any>) {
  return {
    transactionId: row.transaction_id,
    date: row.date,
    normalizedDate: row.normalized_date,
    amount: row.amount,
    description: row.description,
    extractedName: row.extracted_name,
    status: row.status,
    matchedStudents: Array.isArray(row.matched_students) ? row.matched_students : [],
    confirmedStudent: row.confirmed_student_ma_ho_so ? studentsById.get(row.confirmed_student_ma_ho_so) ?? null : null,
    categoryCode: row.category_code,
    bankCode: row.bank_code,
    rawReference: row.raw_reference,
  };
}

function toTransactionRow(item: TransactionListItem, bankCode: BankTab): TransactionRow {
  return {
    ...item,
    bank_code: bankCode,
    invoice_issued: item.invoice_issued === true,
    notes: item.notes ?? null,
  };
}

function toStudentRow(student: any): StudentRow {
  return {
    ma_ho_so: String(student.maHoSo ?? ''),
    ho_ten: String(student.hoTen ?? ''),
    ngay_sinh: String(student.ngaySinh ?? ''),
    nganh: String(student.nganh ?? ''),
    lop: String(student.lop ?? ''),
  };
}

function toTuitionRow(record: any): TuitionRow {
  return {
    transaction_id: String(record.transactionId ?? ''),
    date: String(record.date ?? ''),
    normalized_date: String(record.normalizedDate ?? ''),
    amount: Number(record.amount ?? 0),
    description: String(record.description ?? ''),
    extracted_name: String(record.extractedName ?? ''),
    status: String(record.status ?? 'chua_trich_xuat'),
    category_code: String(record.categoryCode ?? ''),
    bank_code: String(record.bankCode ?? ''),
    raw_reference: String(record.rawReference ?? ''),
    confirmed_student_ma_ho_so: record.confirmedStudent?.maHoSo ? String(record.confirmedStudent.maHoSo) : null,
    matched_students: Array.isArray(record.matchedStudents) ? record.matchedStudents : [],
  };
}

function isSyntheticTuitionOrphanTransaction(row: Pick<TransactionRow, 'batch_id' | 'notes'>): boolean {
  return row.batch_id === SYNTHETIC_BATCH_ID || row.notes === SYNTHETIC_TUITION_ORPHAN_NOTE;
}

function buildRelationalState(state: PersistedRuntimeState) {
  const batches = [...state.batches];
  const batchIds = new Set(batches.map((batch) => batch.id));
  const transactions = [
    ...state.bidvTransactions.map((item) => toTransactionRow(item, 'BIDV')),
    ...state.agribankTransactions.map((item) => toTransactionRow(item, 'AGRIBANK')),
  ];
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));

  const categories = state.categories.map((category) => ({
    id: category.id,
    code: category.code,
    name: category.name,
    group_name: category.group ?? null,
    ledger_account: category.ledger_account ?? null,
  }));
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const rule of state.rules) {
    if (!rule.category_id || categoryIds.has(rule.category_id)) continue;
    categories.push({
      id: rule.category_id,
      code: rule.category_code,
      name: rule.category_name,
      group_name: null,
      ledger_account: null,
    });
    categoryIds.add(rule.category_id);
  }

  for (const record of state.tuitionRecords) {
    const transactionId = String(record.transactionId ?? '');
    if (!transactionId || transactionIds.has(transactionId)) continue;
    if (!batchIds.has(SYNTHETIC_BATCH_ID)) {
      batches.push({ id: SYNTHETIC_BATCH_ID, filename: SYNTHETIC_BATCH_FILENAME });
      batchIds.add(SYNTHETIC_BATCH_ID);
    }
    transactions.push({
      id: transactionId,
      batch_id: SYNTHETIC_BATCH_ID,
      bank_code: record.bankCode === 'AGRIBANK' ? 'AGRIBANK' : 'BIDV',
      raw_date: String(record.date ?? ''),
      raw_desc: String(record.description ?? ''),
      raw_reference: record.rawReference ? String(record.rawReference) : null,
      normalized_date: String(record.normalizedDate ?? record.date ?? ''),
      normalized_amount: Number(record.amount ?? 0),
      debit_amount: 0,
      credit_amount: Number(record.amount ?? 0),
      balance_after: null,
      type: 'credit',
      split_mode: 'direct',
      status: 'matched',
      sender_name: record.confirmedStudent?.hoTen ? String(record.confirmedStudent.hoTen) : null,
      allocations: [],
      match: null,
      invoice_issued: false,
      notes: SYNTHETIC_TUITION_ORPHAN_NOTE,
    });
    transactionIds.add(transactionId);
  }

  return {
    transactions,
    rules: [...state.rules],
    categories,
    batches,
    students: state.students.map((student) => toStudentRow(student)),
    tuitionRecords: state.tuitionRecords.map((record) => toTuitionRow(record)),
    settings: [{ key: 'activeBank', value: { activeBank: state.activeBank } }],
  };
}

async function upsertRows<Row extends object>(table: string, rows: Row[], onConflict: string): Promise<void> {
  if (rows.length === 0) return;
  const supabase = getSupabaseClient();

  for (const chunk of chunkArray(rows, WRITE_BATCH_SIZE)) {
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw error;
  }
}

async function deleteRows(table: string, column: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getSupabaseClient();

  for (const chunk of chunkArray(ids, WRITE_BATCH_SIZE)) {
    const { error } = await supabase.from(table).delete().in(column, chunk);
    if (error) throw error;
  }
}

async function syncTable<Row extends object>(
  table: string,
  keyField: keyof Row & string,
  previousRows: Row[],
  nextRows: Row[],
): Promise<void> {
  const previousByKey = new Map<string, Row>();
  for (const row of previousRows) {
    previousByKey.set(String(row[keyField]), row);
  }

  const nextByKey = new Map<string, Row>();
  for (const row of nextRows) {
    nextByKey.set(String(row[keyField]), row);
  }

  const upserts: Row[] = [];
  for (const [key, row] of nextByKey.entries()) {
    const previous = previousByKey.get(key);
    if (!previous || stableStringify(previous) !== stableStringify(row)) {
      upserts.push(row);
    }
  }

  const deletions: string[] = [];
  for (const key of previousByKey.keys()) {
    if (!nextByKey.has(key)) {
      deletions.push(key);
    }
  }

  await upsertRows(table, upserts, keyField);
  await deleteRows(table, keyField, deletions);
}

export function isSupabaseRuntimeReady(): boolean {
  return isSupabaseConfigured();
}

export function subscribeRuntimeStateChanges(onChange: () => void): () => void {
  if (!isSupabaseRuntimeReady()) {
    return () => {
      // no-op
    };
  }

  const supabase = getSupabaseClient();
  let notifyTimer: ReturnType<typeof setTimeout> | null = null;

  let channel = supabase.channel('runtime-relational-changes');
  for (const table of REALTIME_TABLES) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      if (notifyTimer) clearTimeout(notifyTimer);
      notifyTimer = setTimeout(() => {
        onChange();
      }, 500);
    });
  }

  channel = channel.subscribe();

  return () => {
    if (notifyTimer) clearTimeout(notifyTimer);
    supabase.removeChannel(channel as RealtimeChannel);
  };
}

export async function loadRuntimeStateFromDevApi(): Promise<PersistedRuntimeState | null> {
  if (typeof window === 'undefined') return null;

  const response = await fetch(DEV_DATA_ENDPOINT);
  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return normalizeRuntimeState(payload as Partial<PersistedRuntimeState>);
}

export async function persistRuntimeStateToDevApi(state: PersistedRuntimeState): Promise<void> {
  if (typeof window === 'undefined') return;

  await fetch(DEV_DATA_ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
}

export async function loadRuntimeStateFromSupabase(): Promise<PersistedRuntimeState> {
  const [transactionRows, ruleRows, categoryRows, batchRows, studentRows, tuitionRows, settingsRes] = await Promise.all([
    fetchAllRows<TransactionRow>(TABLES.transactions),
    fetchAllRows<RuleListItem>(TABLES.rules),
    fetchAllRows<CategoryRow>(TABLES.categories),
    fetchAllRows<BatchOption>(TABLES.batches),
    fetchAllRows<StudentRow>(TABLES.students),
    fetchAllRows<TuitionRow>(TABLES.tuitionRecords),
    getSupabaseClient().from(TABLES.settings).select('value').eq('key', 'activeBank').maybeSingle(),
  ]);

  if (settingsRes.error) {
    throw settingsRes.error;
  }

  const hydratedTransactionRows = transactionRows.filter((row) => !isSyntheticTuitionOrphanTransaction(row));
  const hydratedBatchRows = batchRows.filter((row) => row.id !== SYNTHETIC_BATCH_ID);
  const students = studentRows.map((row) => toStudentInfo(row));
  const studentsById = new Map(students.map((student) => [student.maHoSo, student]));

  const bidvTransactions: TransactionListItem[] = [];
  const agribankTransactions: TransactionListItem[] = [];
  for (const row of hydratedTransactionRows) {
    const item: TransactionListItem = {
      id: row.id,
      batch_id: row.batch_id,
      raw_date: row.raw_date,
      raw_desc: row.raw_desc,
      raw_reference: row.raw_reference,
      normalized_date: row.normalized_date,
      normalized_amount: row.normalized_amount,
      debit_amount: row.debit_amount,
      credit_amount: row.credit_amount,
      balance_after: row.balance_after,
      type: row.type,
      split_mode: row.split_mode,
      status: row.status,
      sender_name: row.sender_name,
      allocations: Array.isArray(row.allocations) ? row.allocations : [],
      match: row.match ?? null,
      invoice_issued: row.invoice_issued === true,
      notes: row.notes,
    };

    if (row.bank_code === 'AGRIBANK') {
      agribankTransactions.push(item);
    } else {
      bidvTransactions.push(item);
    }
  }

  const activeBankRaw = (settingsRes.data?.value as { activeBank?: string } | null | undefined)?.activeBank;
  const activeBank: BankTab = activeBankRaw === 'AGRIBANK' ? 'AGRIBANK' : 'BIDV';

  const state: PersistedRuntimeState = {
    ...EMPTY_STATE,
    bidvTransactions,
    agribankTransactions,
    rules: ruleRows,
    categories: categoryRows.map((row) => toCategoryOption(row)),
    batches: hydratedBatchRows,
    students,
    tuitionRecords: tuitionRows.map((row) => toTuitionRecord(row, studentsById)),
    activeBank,
  };

  lastSyncedState = cloneState(normalizeRuntimeState(state));
  return state;
}

async function persistDiffToSupabase(state: PersistedRuntimeState): Promise<void> {
  const previous = buildRelationalState(lastSyncedState ?? EMPTY_STATE);
  const next = buildRelationalState(state);

  await syncTable(TABLES.batches, 'id', previous.batches, next.batches);
  await syncTable(TABLES.categories, 'id', previous.categories, next.categories);
  await syncTable(TABLES.students, 'ma_ho_so', previous.students, next.students);
  await syncTable(TABLES.rules, 'id', previous.rules, next.rules);
  await syncTable(TABLES.transactions, 'id', previous.transactions, next.transactions);
  await syncTable(TABLES.tuitionRecords, 'transaction_id', previous.tuitionRecords, next.tuitionRecords);
  await syncTable(TABLES.settings, 'key', previous.settings, next.settings);

  lastSyncedState = cloneState(state);
}

async function flushPendingState(): Promise<void> {
  if (flushInProgress || !pendingState) return;
  flushInProgress = true;
  let failedState: PersistedRuntimeState | null = null;

  try {
    while (pendingState) {
      const nextState = pendingState;
      pendingState = null;
      failedState = nextState;
      await persistDiffToSupabase(nextState);
      failedState = null;
    }
  } catch (error) {
    console.error('Supabase runtime persist failed.', error);
    if (!pendingState && failedState) {
      pendingState = cloneState(failedState);
    }
  } finally {
    flushInProgress = false;
    if (pendingState) {
      flushTimer = setTimeout(() => {
        void flushPendingState();
      }, WRITE_DEBOUNCE_MS);
    }
  }
}

export function queueRuntimeStatePersist(state: PersistedRuntimeState): void {
  if (!isSupabaseRuntimeReady()) return;

  markRuntimeStateDirty();
  pendingState = cloneState(state);

  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    void flushPendingState();
  }, WRITE_DEBOUNCE_MS);
}
