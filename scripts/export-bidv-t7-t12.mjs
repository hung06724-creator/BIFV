import Database from 'better-sqlite3';
import XLSX from 'xlsx';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..');

const db = new Database('D:\\Data Sổ phụ\\app.db');

// Get all BIDV transactions
const rows = db.prepare("SELECT data FROM transactions WHERE bank_code = 'BIDV'").all();
const allTransactions = rows.map(r => JSON.parse(r.data));

// Get categories for column headers
const catRows = db.prepare('SELECT data FROM categories').all();
const categories = catRows.map(r => JSON.parse(r.data));

// Filter: T7-T12/2025 (normalized_date 2025-07-01 to 2025-12-31)
const DATE_FROM = '2025-07-01';
const DATE_TO = '2025-12-31';

const transactions = allTransactions.filter(t => {
  return t.normalized_date >= DATE_FROM && t.normalized_date <= DATE_TO;
});

// Sort ascending by date (1/7 → 31/12)
transactions.sort((a, b) => {
  const cmp = a.normalized_date.localeCompare(b.normalized_date);
  if (cmp !== 0) return cmp;
  return a.raw_date.localeCompare(b.raw_date);
});

console.log(`📊 Tổng BIDV trong DB: ${allTransactions.length}`);
console.log(`📅 Lọc T7-T12/2025: ${transactions.length} giao dịch`);

// Collect used category codes
const usedCodes = new Set();
for (const t of transactions) {
  for (const a of t.allocations || []) {
    const code = a.confirmed_category_code || a.suggested_category_code;
    if (code) usedCodes.add(code);
  }
}

// Order category codes by category list order
const orderedCodes = [];
for (const cat of categories) {
  if (usedCodes.has(cat.code)) {
    orderedCodes.push(cat.code);
    usedCodes.delete(cat.code);
  }
}
for (const code of usedCodes) {
  orderedCodes.push(code);
}

// Summary by month
const monthSummary = {};
for (const t of transactions) {
  const m = t.normalized_date.substring(0, 7);
  if (!monthSummary[m]) monthSummary[m] = { credit: 0, debit: 0, total: 0 };
  monthSummary[m].total++;
  if (t.type === 'credit') monthSummary[m].credit++;
  else monthSummary[m].debit++;
}

console.log('\n📅 Phân bổ theo tháng:');
for (const [m, s] of Object.entries(monthSummary).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`   ${m}: ${s.total} GD (${s.credit} credit, ${s.debit} debit)`);
}

// Build header
const headerRow = [
  'Số tham chiếu',
  'Thời gian giao dịch',
  'Tiền ra',
  'Tiền vào',
  'Số dư',
  'Nội dung giao dịch',
  ...orderedCodes,
];

// Build data rows
const dataRows = transactions.map(t => {
  const row = [
    t.raw_reference || t.id,
    t.raw_date,
    t.debit_amount > 0 ? t.debit_amount : '',
    t.credit_amount > 0 ? t.credit_amount : '',
    t.balance_after != null ? t.balance_after : '',
    t.raw_desc,
  ];

  // Category columns
  const allocationMap = new Map();
  for (const a of t.allocations || []) {
    const code = a.confirmed_category_code || a.suggested_category_code;
    if (code) {
      allocationMap.set(code, (allocationMap.get(code) || 0) + a.amount);
    }
  }

  for (const code of orderedCodes) {
    const val = allocationMap.get(code);
    row.push(val && val > 0 ? val : '');
  }

  return row;
});

const wsData = [headerRow, ...dataRows];
const ws = XLSX.utils.aoa_to_sheet(wsData);

ws['!cols'] = [
  { wch: 24 },  // Số tham chiếu
  { wch: 22 },  // Thời gian giao dịch
  { wch: 18 },  // Tiền ra
  { wch: 18 },  // Tiền vào
  { wch: 18 },  // Số dư
  { wch: 80 },  // Nội dung giao dịch
  ...orderedCodes.map(() => ({ wch: 16 })),
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const now = new Date();
const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
const outPath = resolve(OUT_DIR, `BIDV-data-T7-T12-${stamp}.xlsx`);
XLSX.writeFile(wb, outPath);
console.log(`\n✅ File created: ${outPath}`);

db.close();
