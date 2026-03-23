import * as XLSX from 'xlsx';
import type { TransactionListItem, CategoryOption } from '@/components/features/transactions/types';

/**
 * Export transactions to Excel in the classified format:
 *   Columns 0-4: Số ID | Thời gian giao dịch | Số tiền giao dịch | Số dư cuối | Nội dung
 *   Columns 5+:  Each column header is a category_code, amounts placed in matching columns.
 */
export function exportTransactionsToExcel(
  transactions: TransactionListItem[],
  categories: CategoryOption[],
  bankCode: string,
) {
  // Collect all category codes that appear in any allocation
  const usedCodes = new Set<string>();
  for (const t of transactions) {
    for (const a of t.allocations) {
      const code = a.confirmed_category_code || a.suggested_category_code;
      if (code) usedCodes.add(code);
    }
  }

  // Order: categories in their original order, then any extra codes
  const orderedCodes: string[] = [];
  for (const cat of categories) {
    if (usedCodes.has(cat.code)) {
      orderedCodes.push(cat.code);
      usedCodes.delete(cat.code);
    }
  }
  for (const code of usedCodes) {
    orderedCodes.push(code);
  }

  const isBIDV = bankCode === 'BIDV';

  // Build header row
  const headerRow = isBIDV
    ? [
        'Số tham chiếu',
        'Thời gian giao dịch',
        'Tiền ra',
        'Tiền vào',
        'Số dư',
        'Nội dung giao dịch',
        ...orderedCodes,
      ]
    : [
        'Số ID',
        'Thời gian giao dịch',
        'Số tiền giao dịch',
        'Số dư cuối',
        'Nội dung',
        ...orderedCodes,
      ];

  // Build data rows
  const dataRows: any[][] = [];
  for (const t of transactions) {
    let row: any[];

    if (isBIDV) {
      row = [
        t.raw_reference || t.id,
        t.raw_date,
        t.debit_amount > 0 ? t.debit_amount : null,
        t.credit_amount > 0 ? t.credit_amount : null,
        t.balance_after != null ? t.balance_after : '',
        t.raw_desc,
      ];
    } else {
      const amountStr = t.type === 'credit'
        ? `'+${formatNumber(t.normalized_amount)}`
        : `'-${formatNumber(t.normalized_amount)}`;

      row = [
        t.raw_reference || t.id,
        t.raw_date,
        amountStr,
        t.balance_after != null ? formatNumber(t.balance_after) : '',
        t.raw_desc,
      ];
    }

    // Fill category columns
    const allocationMap = new Map<string, number>();
    for (const a of t.allocations) {
      const code = a.confirmed_category_code || a.suggested_category_code;
      if (code) {
        allocationMap.set(code, (allocationMap.get(code) || 0) + a.amount);
      }
    }

    for (const code of orderedCodes) {
      const val = allocationMap.get(code);
      row.push(val && val > 0 ? val : null);
    }

    dataRows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

  // Column widths
  ws['!cols'] = isBIDV
    ? [
        { wch: 20 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 60 },
        ...orderedCodes.map(() => ({ wch: 14 })),
      ]
    : [
        { wch: 16 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 60 },
        ...orderedCodes.map(() => ({ wch: 14 })),
      ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `${bankCode}-export-${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
