import ExcelJS from 'exceljs';
import type { ExportType } from '@/domain/types';

export interface ExportFilters {
  date_from?: string;
  date_to?: string;
}

export interface ExportableTransaction {
  id: string;
  raw_date: string;
  raw_desc: string;
  normalized_date: string;
  normalized_amount: number;
  debit_amount: number;
  credit_amount: number;
  balance_after: number | null;
  type: 'credit' | 'debit';
  confirmed_category_code: string | null;
  confirmed_category_name: string | null;
}

export interface CategorySummary {
  category_code: string;
  category_name: string;
  transaction_count: number;
  total_amount: number;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
  name: 'Arial',
};

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
};

const BODY_FONT: Partial<ExcelJS.Font> = { size: 10, name: 'Arial' };
const VN_NUMBER_FORMAT = '#,##0';

export class ExportService {
  async generateBuffer(
    exportType: ExportType,
    transactions: ExportableTransaction[],
    filters: ExportFilters = {}
  ): Promise<{ buffer: Buffer; filename: string; totalRecords: number }> {
    if (transactions.length === 0) {
      throw new Error('Không có giao dịch nào để xuất.');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bank Reconcile App';
    workbook.created = new Date();

    switch (exportType) {
      case 'reconciliation':
        this.buildReconciliationSheet(workbook, transactions, filters);
        break;
      case 'summary':
        this.buildSummarySheet(workbook, transactions, filters);
        break;
      default:
        this.buildReconciliationSheet(workbook, transactions, filters);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `export_${exportType}_${timestamp}.xlsx`;

    return { buffer, filename, totalRecords: transactions.length };
  }

  private buildReconciliationSheet(
    workbook: ExcelJS.Workbook,
    transactions: ExportableTransaction[],
    filters: ExportFilters
  ): void {
    const ws = workbook.addWorksheet('Đối soát', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });

    this.addTitleRow(ws, 'BÁO CÁO ĐỐI SOÁT SỔ PHỤ NGÂN HÀNG', 7, filters);

    const columns = [
      { header: 'Thời gian GD', key: 'raw_date', width: 18 },
      { header: 'Tiền ra', key: 'debit_amount', width: 16 },
      { header: 'Tiền vào', key: 'credit_amount', width: 16 },
      { header: 'Số dư', key: 'balance_after', width: 18 },
      { header: 'Nội dung GD', key: 'raw_desc', width: 45 },
      { header: 'Danh mục', key: 'confirmed_category_name', width: 22 },
      { header: 'Số tiền', key: 'normalized_amount', width: 16 },
    ];

    ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));

    const headerRow = ws.addRow(columns.map((c) => c.header));
    this.styleHeaderRow(headerRow);

    for (const t of transactions) {
      const row = ws.addRow([
        t.raw_date,
        t.debit_amount || null,
        t.credit_amount || null,
        t.balance_after,
        t.raw_desc,
        t.confirmed_category_name || '',
        t.normalized_amount,
      ]);
      this.styleBodyRow(row);

      const debitCell = row.getCell(2);
      if (t.debit_amount > 0) debitCell.font = { ...BODY_FONT, color: { argb: 'FFDC2626' } };
      debitCell.numFmt = VN_NUMBER_FORMAT;

      const creditCell = row.getCell(3);
      if (t.credit_amount > 0) creditCell.font = { ...BODY_FONT, color: { argb: 'FF16A34A' } };
      creditCell.numFmt = VN_NUMBER_FORMAT;

      row.getCell(4).numFmt = VN_NUMBER_FORMAT;
      row.getCell(7).numFmt = VN_NUMBER_FORMAT;
    }

    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + transactions.length, column: columns.length },
    };
  }

  private buildSummarySheet(
    workbook: ExcelJS.Workbook,
    transactions: ExportableTransaction[],
    filters: ExportFilters
  ): void {
    const ws = workbook.addWorksheet('Tổng hợp', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });

    this.addTitleRow(ws, 'BÁO CÁO TỔNG HỢP THEO DANH MỤC', 3, filters);

    const columns = [
      { header: 'Danh mục', width: 40 },
      { header: 'Số GD', width: 12 },
      { header: 'Tổng tiền', width: 20 },
    ];

    ws.columns = columns.map((c) => ({ width: c.width }));

    const headerRow = ws.addRow(columns.map((c) => c.header));
    this.styleHeaderRow(headerRow);

    const summaryMap = new Map<string, CategorySummary>();
    for (const t of transactions) {
      const key = t.confirmed_category_code || 'UNKNOWN';
      const existing = summaryMap.get(key);
      if (existing) {
        existing.transaction_count += 1;
        existing.total_amount += t.normalized_amount;
      } else {
        summaryMap.set(key, {
          category_code: t.confirmed_category_code || 'N/A',
          category_name: t.confirmed_category_name || 'Chưa xác định',
          transaction_count: 1,
          total_amount: t.normalized_amount,
        });
      }
    }

    const summaries = [...summaryMap.values()].sort((a, b) => b.total_amount - a.total_amount);

    for (const s of summaries) {
      const row = ws.addRow([
        `${s.category_code} – ${s.category_name}`,
        s.transaction_count,
        s.total_amount,
      ]);
      this.styleBodyRow(row);
      row.getCell(2).numFmt = VN_NUMBER_FORMAT;
      row.getCell(3).numFmt = VN_NUMBER_FORMAT;
    }

    const totalRow = ws.addRow([
      'TỔNG CỘNG',
      summaries.reduce((s, c) => s + c.transaction_count, 0),
      summaries.reduce((s, c) => s + c.total_amount, 0),
    ]);
    totalRow.font = { ...BODY_FONT, bold: true };
    totalRow.getCell(2).numFmt = VN_NUMBER_FORMAT;
    totalRow.getCell(3).numFmt = VN_NUMBER_FORMAT;
    totalRow.eachCell((cell) => {
      cell.border = { top: { style: 'double', color: { argb: 'FF1E3A5F' } } };
    });
  }

  private addTitleRow(
    ws: ExcelJS.Worksheet,
    title: string,
    colSpan: number,
    filters: ExportFilters
  ): void {
    const titleRow = ws.addRow([title]);
    ws.mergeCells(1, 1, 1, colSpan);
    titleRow.getCell(1).font = { bold: true, size: 14, name: 'Arial', color: { argb: 'FF1E3A5F' } };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    titleRow.height = 28;

    const parts: string[] = [];
    if (filters.date_from) parts.push(`Từ: ${filters.date_from}`);
    if (filters.date_to) parts.push(`Đến: ${filters.date_to}`);
    parts.push(`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`);

    const metaRow = ws.addRow([parts.join('  •  ')]);
    ws.mergeCells(2, 1, 2, colSpan);
    metaRow.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF6B7280' }, name: 'Arial' };
    metaRow.getCell(1).alignment = { horizontal: 'center' };
    metaRow.height = 18;
  }

  private styleHeaderRow(row: ExcelJS.Row): void {
    row.height = 24;
    row.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.border = HEADER_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
  }

  private styleBodyRow(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.font = BODY_FONT;
      cell.alignment = { vertical: 'middle', wrapText: false };
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };
    });
  }
}
