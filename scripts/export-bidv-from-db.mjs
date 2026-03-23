import Database from 'better-sqlite3';
import XLSX from 'xlsx';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..');

const db = new Database('D:\\Data Sổ phụ\\app.db');

// Get all BIDV transactions
const rows = db.prepare("SELECT data FROM transactions WHERE bank_code = 'BIDV'").all();
console.log(`📊 Tổng số giao dịch BIDV trong DB: ${rows.length}`);

const transactions = rows.map(r => JSON.parse(r.data));

// Sort by date
transactions.sort((a, b) => {
  // Sort by normalized_date, then raw_date
  const cmp = a.normalized_date.localeCompare(b.normalized_date);
  if (cmp !== 0) return cmp;
  return a.raw_date.localeCompare(b.raw_date);
});

// Summary by month
const monthSummary = {};
for (const t of transactions) {
  const m = t.normalized_date.substring(0, 7); // YYYY-MM
  if (!monthSummary[m]) monthSummary[m] = { credit: 0, debit: 0, total: 0 };
  monthSummary[m].total++;
  if (t.type === 'credit') monthSummary[m].credit++;
  else monthSummary[m].debit++;
}

console.log('\n📅 Phân bổ theo tháng:');
for (const [m, s] of Object.entries(monthSummary).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`   ${m}: ${s.total} GD (${s.credit} credit, ${s.debit} debit)`);
}

// Build BIDV Excel format:
// 13 padding rows (0-12), header at row 13, data from row 14
const padding = Array.from({ length: 13 }, () => []);

const headerRow = [
  'Số tham chiếu',
  'Thời gian giao dịch',
  'Tiền ra',
  'Tiền vào',
  'Số dư',
  'Nội dung giao dịch',
];

const dataRows = transactions.map(t => [
  t.raw_reference || t.id,
  t.raw_date,
  t.debit_amount > 0 ? t.debit_amount : '',
  t.credit_amount > 0 ? t.credit_amount : '',
  t.balance_after != null ? t.balance_after : '',
  t.raw_desc,
]);

const wsData = [...padding, headerRow, ...dataRows];
const ws = XLSX.utils.aoa_to_sheet(wsData);

ws['!cols'] = [
  { wch: 24 },  // Số tham chiếu
  { wch: 22 },  // Thời gian giao dịch
  { wch: 18 },  // Tiền ra
  { wch: 18 },  // Tiền vào
  { wch: 18 },  // Số dư
  { wch: 80 },  // Nội dung giao dịch
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const outPath = resolve(OUT_DIR, 'BIDV-data-T4-T12.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`\n✅ File created: ${outPath}`);

db.close();
