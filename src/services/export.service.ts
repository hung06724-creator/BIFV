import type { TransactionListItem, CategoryOption } from '@/components/features/transactions/types';
import { loadExcelJS } from '@/lib/lazyVendors';

const BASE_FONT = { name: 'Times New Roman', size: 12 };
const NUMBER_FORMAT = '#,##0;[Red]-#,##0';

function getConfirmedCategorySummary(transaction: TransactionListItem, categoriesByCode: Map<string, CategoryOption>): string {
  const names: string[] = [];

  for (const allocation of transaction.allocations) {
    const code = allocation.confirmed_category_code;
    if (!code) continue;

    const name =
      categoriesByCode.get(code)?.name ||
      allocation.confirmed_category_name ||
      code;

    if (!names.includes(name)) {
      names.push(name);
    }
  }

  return names.join(' + ');
}

function estimateWrappedLines(value: unknown, charsPerLine: number): number {
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

function estimateRowHeight(contentText: unknown, descriptionText: unknown): number {
  const contentLines = estimateWrappedLines(contentText, 52);
  const descriptionLines = estimateWrappedLines(descriptionText, 20);
  const lines = Math.max(contentLines, descriptionLines, 1);

  return Math.min(Math.max(lines * 15, 24), 180);
}

function triggerBrowserDownload(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildExportFilename(transactions: TransactionListItem[], bankCode: string): string {
  const monthKeys = new Set<string>();
  const yearKeys = new Set<string>();

  for (const transaction of transactions) {
    const normalizedDate = transaction.normalized_date || '';
    const yearKey = normalizedDate.slice(0, 4);
    const monthKey = normalizedDate.slice(0, 7);

    if (yearKey.length === 4) {
      yearKeys.add(yearKey);
    }

    if (monthKey.length === 7) {
      monthKeys.add(monthKey);
    }
  }

  if (monthKeys.size === 1) {
    const [monthKey] = [...monthKeys];
    const [year, month] = monthKey.split('-');
    return `${bankCode} T${Number(month)} ${year}.xlsx`;
  }

  if (yearKeys.size === 1) {
    const [year] = [...yearKeys];
    return `${bankCode} ${year}.xlsx`;
  }

  return `${bankCode} export.xlsx`;
}

export async function exportTransactionsToExcel(
  transactions: TransactionListItem[],
  categories: CategoryOption[],
  bankCode: string,
): Promise<string> {
  const ExcelJS = await loadExcelJS();
  const categoriesByCode = new Map(categories.map((category) => [category.code, category]));

  const usedCodes = new Set<string>();
  for (const transaction of transactions) {
    for (const allocation of transaction.allocations) {
      const code = allocation.confirmed_category_code;
      if (code && categoriesByCode.has(code)) {
        usedCodes.add(code);
      }
    }
  }

  const orderedCodes: string[] = [];
  for (const category of categories) {
    if (usedCodes.has(category.code)) {
      orderedCodes.push(category.code);
      usedCodes.delete(category.code);
    }
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Giao dịch', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  worksheet.properties.defaultRowHeight = 20;

  const fixedHeaders = [
    bankCode === 'AGRIBANK' ? 'Số ID' : 'Số tham chiếu',
    'Thời gian giao dịch',
    'Tiền ra',
    'Tiền vào',
    'Số dư',
    'Nội dung giao dịch',
    'Miêu tả',
  ];

  const headerRow1 = [...fixedHeaders];
  const headerRow2 = new Array(fixedHeaders.length).fill('');

  for (const code of orderedCodes) {
    const category = categoriesByCode.get(code);
    headerRow1.push(category?.name || code);
    headerRow2.push(category?.ledger_account || '');
  }

  worksheet.addRow(headerRow1);
  worksheet.addRow(headerRow2);

  const sortedTransactions = [...transactions].sort((a, b) => {
    const left = `${a.normalized_date || ''} ${a.raw_date || ''} ${a.raw_reference || ''}`;
    const right = `${b.normalized_date || ''} ${b.raw_date || ''} ${b.raw_reference || ''}`;
    return left.localeCompare(right);
  });

  const totals = {
    debit: 0,
    credit: 0,
    categoryAmounts: new Map<string, number>(),
  };

  for (const transaction of sortedTransactions) {
    const allocationMap = new Map<string, number>();

    for (const allocation of transaction.allocations) {
      const code = allocation.confirmed_category_code;
      if (!code || !categoriesByCode.has(code)) continue;

      const nextAmount = (allocationMap.get(code) || 0) + Number(allocation.amount || 0);
      allocationMap.set(code, nextAmount);
    }

    const debitAmount = Number(transaction.debit_amount || 0);
    const creditAmount = Number(transaction.credit_amount || 0);
    totals.debit += debitAmount;
    totals.credit += creditAmount;

    const rowValues: Array<string | number | null> = [
      transaction.raw_reference || transaction.id || '',
      transaction.raw_date || '',
      debitAmount > 0 ? debitAmount : null,
      creditAmount > 0 ? creditAmount : null,
      transaction.balance_after != null ? Number(transaction.balance_after) : null,
      transaction.raw_desc || '',
      getConfirmedCategorySummary(transaction, categoriesByCode),
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

  const totalRowValues: Array<string | number | null> = ['Tổng', '', totals.debit || null, totals.credit || null, null, '', ''];
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
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const },
  };

  const headerFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'D9EAF7' },
  };

  const totalFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
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
  }

  worksheet.getRow(1).height = 49;
  worksheet.getRow(2).height = 22;
  for (let rowNumber = 3; rowNumber < lastRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.height = estimateRowHeight(row.getCell(6).value, row.getCell(7).value);
  }

  for (let rowNumber = 3; rowNumber <= lastRow; rowNumber += 1) {
    for (const columnNumber of [3, 4, 5]) {
      worksheet.getRow(rowNumber).getCell(columnNumber).numFmt = NUMBER_FORMAT;
    }
    for (let columnNumber = 8; columnNumber <= lastColumn; columnNumber += 1) {
      worksheet.getRow(rowNumber).getCell(columnNumber).numFmt = NUMBER_FORMAT;
    }
  }

  worksheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: lastRow, column: lastColumn },
  };

  const filename = buildExportFilename(sortedTransactions, bankCode);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerBrowserDownload(buffer as ArrayBuffer, filename);

  return filename;
}
