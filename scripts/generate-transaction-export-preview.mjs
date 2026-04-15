import ExcelJS from 'exceljs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const INPUT_PATH = resolve(ROOT, 'data', 'app-state.json');
const yearArg = process.argv[2] || '';
const monthArg = process.argv[3] || '';
const hasPeriodFilter = /^\d{4}$/.test(yearArg) && /^(0?[1-9]|1[0-2])$/.test(monthArg);
const targetPeriod = hasPeriodFilter ? `${yearArg}-${String(monthArg).padStart(2, '0')}` : '';
const outputBaseName = hasPeriodFilter
  ? `BIDV-export-preview-${targetPeriod}.xlsx`
  : 'BIDV-export-preview-2-row-header.xlsx';
const fallbackBaseName = hasPeriodFilter
  ? `BIDV-export-preview-${targetPeriod}-alt.xlsx`
  : 'BIDV-export-preview-2-row-header-auto-height.xlsx';
const OUT_PATH = resolve(ROOT, outputBaseName);
const FALLBACK_OUT_PATH = resolve(ROOT, fallbackBaseName);

function readEnvMap() {
  const envPath = resolve(ROOT, '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  return Object.fromEntries(
    lines
      .filter((line) => line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1)];
      })
  );
}

async function loadState() {
  const env = readEnvMap();
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (url && key) {
    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    async function fetchAll(table, builder) {
      const rows = [];
      for (let offset = 0; ; offset += 1000) {
        const query = builder(
          supabase.from(table).select('*').range(offset, offset + 999)
        );
        const { data, error } = await query;
        if (error) return { data: null, error };
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < 1000) break;
      }
      return { data: rows, error: null };
    }

    const [{ data: categories, error: categoryError }, { data: transactions, error: transactionError }] =
      await Promise.all([
        fetchAll('categories', (query) => query),
        fetchAll(
          'transactions',
          (query) =>
            query
              .eq('bank_code', 'BIDV')
              .eq('type', 'credit')
              .order('normalized_date', { ascending: true })
              .order('raw_date', { ascending: true })
        ),
      ]);

    if (!categoryError && !transactionError) {
      return {
        categories: (categories || []).map((category) => ({
          id: category.id,
          code: category.code,
          name: category.name,
          group: category.group_name || undefined,
          ledger_account: category.ledger_account || undefined,
        })),
        bidvTransactions: transactions || [],
      };
    }
  }

  const state = JSON.parse(readFileSync(INPUT_PATH, 'utf8'));
  return {
    categories: Array.isArray(state.categories) ? state.categories : [],
    bidvTransactions: Array.isArray(state.bidvTransactions) ? state.bidvTransactions : [],
  };
}

const state = await loadState();
const categories = state.categories;
const bidvTransactions = state.bidvTransactions;

const categoriesByCode = new Map(categories.map((category) => [category.code, category]));

const creditTransactions = bidvTransactions.filter(
  (transaction) =>
    transaction?.type === 'credit' &&
    (!targetPeriod || String(transaction.normalized_date || '').startsWith(targetPeriod))
);

const transactionsForExport = (() => {
  if (hasPeriodFilter) {
    return [...creditTransactions].sort((a, b) => {
      const left = `${a.normalized_date || ''} ${a.raw_date || ''} ${a.raw_reference || ''}`;
      const right = `${b.normalized_date || ''} ${b.raw_date || ''} ${b.raw_reference || ''}`;
      return left.localeCompare(right);
    });
  }

  const transactionsWithAllocations = creditTransactions.filter(
    (transaction) => Array.isArray(transaction.allocations) && transaction.allocations.length > 0
  );
  const firstTransactionByCode = new Map();
  for (const transaction of transactionsWithAllocations) {
    for (const allocation of transaction.allocations) {
      const code = allocation.confirmed_category_code || allocation.suggested_category_code;
      if (!code || firstTransactionByCode.has(code)) continue;
      firstTransactionByCode.set(code, transaction);
    }
  }

  return [...firstTransactionByCode.values()]
    .sort((a, b) => {
      const left = `${a.normalized_date || ''} ${a.raw_date || ''}`;
      const right = `${b.normalized_date || ''} ${b.raw_date || ''}`;
      return left.localeCompare(right);
    })
    .slice(0, 18);
})();

if (transactionsForExport.length === 0) {
  throw new Error(hasPeriodFilter ? `Khong tim thay giao dich BIDV tien vao cho ${targetPeriod}.` : 'Khong tim thay giao dich mau de xuat.');
}

const usedCodes = new Set();
for (const transaction of transactionsForExport) {
  for (const allocation of transaction.allocations || []) {
    const code = allocation.confirmed_category_code;
    if (code && categoriesByCode.has(code)) usedCodes.add(code);
  }
}

const orderedCodes = [];
for (const category of categories) {
  if (usedCodes.has(category.code)) {
    orderedCodes.push(category.code);
    usedCodes.delete(category.code);
  }
}

const fixedHeaders = [
  'Số tham chiếu',
  'Thời gian giao dịch',
  'Tiền ra',
  'Tiền vào',
  'Số dư',
  'Nội dung giao dịch',
  'Miêu tả',
];

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Giao dịch', {
  views: [{ state: 'frozen', ySplit: 2 }],
});

worksheet.properties.defaultRowHeight = 20;
const BASE_FONT = { name: 'Times New Roman', size: 12 };

function estimateWrappedLines(value, charsPerLine) {
  if (!value) return 1;

  const text = String(value);
  const segments = text.split(/\r?\n/);
  let totalLines = 0;

  for (const segment of segments) {
    const normalized = segment.trim();
    if (!normalized) {
      totalLines += 1;
      continue;
    }

    totalLines += Math.max(1, Math.ceil(normalized.length / charsPerLine));
  }

  return totalLines;
}

function estimateRowHeight(contentText, descriptionText) {
  const contentLines = estimateWrappedLines(contentText, 52);
  const descriptionLines = estimateWrappedLines(descriptionText, 20);
  const lines = Math.max(contentLines, descriptionLines, 1);

  return Math.min(Math.max(lines * 15, 24), 180);
}

const headerRow1 = [...fixedHeaders];
const headerRow2 = new Array(fixedHeaders.length).fill('');

for (const code of orderedCodes) {
  const category = categoriesByCode.get(code);
  headerRow1.push(category?.name || code);
  headerRow2.push(category?.ledger_account || '');
}

worksheet.addRow(headerRow1);
worksheet.addRow(headerRow2);

const totals = {
  debit: 0,
  credit: 0,
  categoryAmounts: new Map(),
};

for (const transaction of transactionsForExport) {
  const allocationMap = new Map();
  const allocationNames = [];

  for (const allocation of transaction.allocations || []) {
    const code = allocation.confirmed_category_code;
    if (!code) continue;

    const nextAmount = (allocationMap.get(code) || 0) + Number(allocation.amount || 0);
    allocationMap.set(code, nextAmount);

    const category = categoriesByCode.get(code);
    const categoryLabel =
      category?.name ||
      allocation.confirmed_category_name ||
      code;

    if (!allocationNames.includes(categoryLabel)) {
      allocationNames.push(categoryLabel);
    }
  }

  const debitAmount = Number(transaction.debit_amount || 0);
  const creditAmount = Number(transaction.credit_amount || 0);
  totals.debit += debitAmount;
  totals.credit += creditAmount;

  const rowValues = [
    transaction.raw_reference || transaction.id || '',
    transaction.raw_date || '',
    debitAmount > 0 ? debitAmount : null,
    creditAmount > 0 ? creditAmount : null,
    transaction.balance_after != null ? Number(transaction.balance_after) : null,
    transaction.raw_desc || '',
    allocationNames.join(' + '),
  ];

  for (const code of orderedCodes) {
    const amount = allocationMap.get(code) || 0;
    if (amount !== 0) {
      totals.categoryAmounts.set(code, (totals.categoryAmounts.get(code) || 0) + amount);
      rowValues.push(amount);
    } else {
      rowValues.push(null);
    }
  }

  worksheet.addRow(rowValues);
}

const totalRowValues = ['Tổng', '', totals.debit || null, totals.credit || null, null, '', ''];
for (const code of orderedCodes) {
  totalRowValues.push(totals.categoryAmounts.get(code) || null);
}
worksheet.addRow(totalRowValues);

worksheet.columns = [
  { width: 20 },
  { width: 22 },
  { width: 14 },
  { width: 14 },
  { width: 16 },
  { width: 60 },
  { width: 24 },
  ...orderedCodes.map(() => ({ width: 16 })),
];

for (let column = 1; column <= fixedHeaders.length; column += 1) {
  worksheet.mergeCells(1, column, 2, column);
}

const border = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const headerFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'D9EAF7' },
};

const totalFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2CC' },
};

const lastRow = worksheet.rowCount;
const lastColumn = fixedHeaders.length + orderedCodes.length;

for (let rowNumber = 1; rowNumber <= lastRow; rowNumber += 1) {
  const row = worksheet.getRow(rowNumber);
  for (let columnNumber = 1; columnNumber <= lastColumn; columnNumber += 1) {
    const cell = row.getCell(columnNumber);
    cell.border = border;

    if (rowNumber === 1) {
      cell.font = { ...BASE_FONT, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.fill = headerFill;
    } else if (rowNumber === 2) {
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      if (columnNumber > fixedHeaders.length) {
        cell.font = { ...BASE_FONT, italic: true, color: { argb: '666666' } };
      } else {
        cell.font = { ...BASE_FONT };
      }
      cell.fill = headerFill;
    } else if (rowNumber === lastRow) {
      cell.font = { ...BASE_FONT, bold: true };
      cell.fill = totalFill;
      cell.alignment = { vertical: 'middle', horizontal: columnNumber >= 3 ? 'right' : 'left', wrapText: true };
    } else {
      cell.font = { ...BASE_FONT };
      cell.alignment = {
        vertical: 'top',
        horizontal: [3, 4, 5].includes(columnNumber) || columnNumber > fixedHeaders.length ? 'right' : 'left',
        wrapText: columnNumber === 6 || columnNumber === 7,
      };
    }
  }
  row.commit();
}

worksheet.getRow(1).height = 24;
worksheet.getRow(2).height = 22;
for (let rowNumber = 3; rowNumber < lastRow; rowNumber += 1) {
  const row = worksheet.getRow(rowNumber);
  row.height = estimateRowHeight(row.getCell(6).value, row.getCell(7).value);
}

for (let rowNumber = 3; rowNumber <= lastRow; rowNumber += 1) {
  for (const columnNumber of [3, 4, 5]) {
    worksheet.getRow(rowNumber).getCell(columnNumber).numFmt = '#,##0';
  }
  for (let columnNumber = 8; columnNumber <= lastColumn; columnNumber += 1) {
    worksheet.getRow(rowNumber).getCell(columnNumber).numFmt = '#,##0';
  }
}

worksheet.autoFilter = {
  from: { row: 2, column: 1 },
  to: { row: lastRow, column: lastColumn },
};

const notesSheet = workbook.addWorksheet('Ghi chú');
notesSheet.columns = [{ width: 100 }];
[
  'File mẫu đề xuất cho tab Giao dịch',
  'Chưa thay đổi chức năng export trong code.',
  'Bố cục đề xuất:',
  '- Giữ A-G là các cột cố định.',
  '- Cột E là Số dư.',
  '- Cột F là Nội dung giao dịch, rộng 60 và wrap text.',
  '- Cột G là Miêu tả, hiển thị category của giao dịch.',
  '- Từ cột H trở đi: dòng 1 là tên danh mục, dòng 2 là số tài khoản.',
  '- Có kẻ bảng toàn vùng dữ liệu, tiêu đề in đậm, dòng tài khoản danh mục in nghiêng, và có dòng Tổng cuối bảng.',
].forEach((line) => notesSheet.addRow([line]));

let writtenPath = OUT_PATH;
try {
  await workbook.xlsx.writeFile(OUT_PATH);
} catch (error) {
  if (error && error.code === 'EBUSY') {
    writtenPath = FALLBACK_OUT_PATH;
    await workbook.xlsx.writeFile(FALLBACK_OUT_PATH);
  } else {
    throw error;
  }
}

console.log(`Created preview workbook: ${writtenPath}`);
console.log(`Export rows: ${transactionsForExport.length}`);
console.log(`Category columns: ${orderedCodes.length}`);
console.log(`Total row index: ${lastRow}`);
if (targetPeriod) {
  console.log(`Period: ${targetPeriod}`);
}
