/**
 * Chẩn đoán file import BIDV — tìm giao dịch bị mất
 * Chạy: node scripts/diagnose-import.mjs "đường_dẫn_file.xlsx"
 */
import XLSX from 'xlsx';
import { resolve } from 'path';

const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ Cần truyền đường dẫn file Excel.\n   Ví dụ: node scripts/diagnose-import.mjs "BIDV-T9.xlsx"');
  process.exit(1);
}

const workbook = XLSX.readFile(resolve(filePath));
const ws = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

// BIDV config
const HEADER_ROW = 13;
const DATA_START = 14;

console.log(`📄 File: ${filePath}`);
console.log(`📊 Tổng số dòng trong sheet: ${rawData.length}`);
console.log(`📊 Dòng dữ liệu (từ row ${DATA_START + 1}): ${rawData.length - DATA_START}\n`);

const skippedEmpty = [];
const skippedNoDate = [];
const skippedZeroAmount = [];
const duplicateRefs = [];
const validTransactions = [];

const refMap = new Map(); // reference → [row indices]

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  let str = String(value).trim().replace(/'/g, '').replace(/,/g, '');
  return parseFloat(str) || 0;
}

for (let i = DATA_START; i < rawData.length; i++) {
  const row = rawData[i];
  const rowNum = i + 1; // 1-based for display

  // Check 1: empty row
  if (!row || row.length === 0) {
    skippedEmpty.push(rowNum);
    continue;
  }

  // Check 2: no date
  const rawDate = row[1];
  const date = rawDate != null ? String(rawDate).trim() : '';
  if (!date) {
    skippedNoDate.push({ rowNum, row: row.slice(0, 6) });
    continue;
  }

  // Check 3: zero amount
  const debit = parseNumber(row[2]);
  const credit = parseNumber(row[3]);
  const amount = credit > 0 ? credit : debit;
  if (amount === 0) {
    skippedZeroAmount.push({ rowNum, date, desc: String(row[5] || '').substring(0, 80), debit: row[2], credit: row[3] });
    continue;
  }

  // Check 4: duplicate reference
  const ref = String(row[0] || '').trim();
  if (ref) {
    if (!refMap.has(ref)) {
      refMap.set(ref, []);
    }
    refMap.get(ref).push({ rowNum, date, amount, desc: String(row[5] || '').substring(0, 80) });
  }

  validTransactions.push({ rowNum, ref, date, amount });
}

// Find duplicate refs
for (const [ref, entries] of refMap) {
  if (entries.length > 1) {
    duplicateRefs.push({ ref, entries });
  }
}

// Count unique refs (dedup simulation)
const uniqueRefCount = refMap.size;
const noRefCount = validTransactions.filter(t => !t.ref).length;
const afterDedupCount = uniqueRefCount + noRefCount;

console.log('=== KẾT QUẢ CHẨN ĐOÁN ===\n');
console.log(`✅ Giao dịch hợp lệ (sau parse): ${validTransactions.length}`);
console.log(`✅ Sau dedup (giữ unique ref):    ${afterDedupCount}`);
console.log(`❌ Bị mất do dedup trùng ref:     ${validTransactions.length - afterDedupCount}`);
console.log();

if (skippedEmpty.length > 0) {
  console.log(`⚠️  Dòng rỗng bị bỏ: ${skippedEmpty.length} dòng`);
  console.log(`   Rows: ${skippedEmpty.join(', ')}\n`);
}

if (skippedNoDate.length > 0) {
  console.log(`⚠️  Dòng không có ngày bị bỏ: ${skippedNoDate.length}`);
  for (const s of skippedNoDate) {
    console.log(`   Row ${s.rowNum}: ${JSON.stringify(s.row)}`);
  }
  console.log();
}

if (skippedZeroAmount.length > 0) {
  console.log(`⚠️  Dòng tiền = 0 bị bỏ: ${skippedZeroAmount.length}`);
  for (const s of skippedZeroAmount) {
    console.log(`   Row ${s.rowNum}: ${s.date} | debit=${s.debit} | credit=${s.credit} | ${s.desc}`);
  }
  console.log();
}

if (duplicateRefs.length > 0) {
  console.log(`🔴 SỐ THAM CHIẾU TRÙNG: ${duplicateRefs.length} ref, mất ${validTransactions.length - afterDedupCount} giao dịch`);
  for (const { ref, entries } of duplicateRefs) {
    console.log(`\n   Ref: "${ref}" — ${entries.length} giao dịch (chỉ giữ 1, mất ${entries.length - 1})`);
    for (const e of entries) {
      console.log(`     Row ${e.rowNum}: ${e.date} | ${e.amount} | ${e.desc}`);
    }
  }
} else {
  console.log('✅ Không có số tham chiếu trùng.');
}
