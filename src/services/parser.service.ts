import * as XLSX from 'xlsx';
import type { BankTransaction, SplitMode, TransactionType } from '@/domain/types';

export interface ClassifiedAllocation {
  category_code: string;
  amount: number;
}

export interface ClassifiedTransaction {
  raw_date: string;
  raw_desc: string;
  raw_reference: string;
  normalized_date: string;
  normalized_amount: number;
  type: TransactionType;
  split_mode: SplitMode;
  sender_name: string | null;
  allocations: ClassifiedAllocation[];
  status: string;
  notes: string | null;
}

/**
 * Column mapping for each bank format.
 * All banks are normalized to 5 fields:
 *   Thời gian giao dịch | Tiền ra | Tiền vào | Số dư | Nội dung giao dịch
 */
interface BankColumnConfig {
  headerRowIndex: number;   // 0-based index of the header row
  dataStartIndex: number;   // 0-based index where data begins
  dateCol: number;          // column index for transaction date
  debitCol: number | null;  // column index for money out (Tiền ra)
  creditCol: number | null; // column index for money in (Tiền vào)
  amountCol: number | null; // single amount column (positive=credit, negative=debit)
  balanceCol: number;       // column index for balance
  descCol: number;          // column index for description
  referenceCol: number;     // column index for reference number
}

const BANK_CONFIGS: Record<string, BankColumnConfig> = {
  // BIDV: header row 14 (0-based: 13), data from row 15 (0-based: 14)
  // Columns: Số tham chiếu(0) | Thời gian giao dịch(1) | Tiền ra(2) | Tiền vào(3) | Số dư(4) | Nội dung giao dịch(5)
  BIDV: {
    headerRowIndex: 13,
    dataStartIndex: 14,
    dateCol: 1,
    debitCol: 2,    // Tiền ra
    creditCol: 3,   // Tiền vào
    amountCol: null,
    balanceCol: 4,
    descCol: 5,
    referenceCol: 0,
  },
  // AGRIBANK sổ phụ gốc: header row 1 (0-based: 0), data from row 2 (0-based: 1)
  // Columns: No.(0) | STT(1) | Thời gian GD(2) | Ngày hạch toán(3) | Số ID(4) | Số TK(5) | Số dư trước(6) | Số tiền GD(7) | Loại tiền(8) | Số dư cuối(9) | TK đối ứng(10) | Nội dung(11) | Tính chất lệnh(12)
  AGRIBANK: {
    headerRowIndex: 0,
    dataStartIndex: 1,
    dateCol: 2,       // Thời gian giao dịch
    debitCol: null,
    creditCol: null,
    amountCol: 7,     // Số tiền giao dịch ('+200,000 or '-55,000)
    balanceCol: 9,    // Số dư cuối
    descCol: 11,      // Nội dung
    referenceCol: 4,  // Số ID — primary key for dedup
  },
};

export class ParserService {
  /**
   * Preview the first 20 rows of a file buffer and detect columns.
   */
  async previewFileBuffer(buffer: ArrayBuffer, bankCode: string = 'BIDV'): Promise<{ detectedColumns: string[], previewRows: any[], totalRows: number }> {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (!rawData || rawData.length === 0) {
      throw new Error("File Excel rỗng hoặc không đúng định dạng.");
    }

    const config = BANK_CONFIGS[bankCode];
    if (!config) {
      throw new Error(`Ngân hàng "${bankCode}" chưa được hỗ trợ. Chỉ hỗ trợ BIDV và AGRIBANK.`);
    }

    if (rawData.length <= config.headerRowIndex) {
      throw new Error("File không đủ dòng dữ liệu cho định dạng ngân hàng đã chọn.");
    }

    // Use the 5 normalized column names
    const detectedColumns = ['Thời gian giao dịch', 'Tiền ra', 'Tiền vào', 'Số dư', 'Nội dung giao dịch'];
    const dataStartIndex = config.dataStartIndex;

    const dataSubset = rawData.slice(dataStartIndex, dataStartIndex + 20);

    const previewRows = dataSubset
      .filter(r => r && r.length > 0)
      .map(rowArray => {
        const mapped = this.mapRowToNormalized(rowArray, config);
        if (!mapped) return null;
        return {
          'Thời gian giao dịch': mapped.date,
          'Tiền ra': mapped.debit,
          'Tiền vào': mapped.credit,
          'Số dư': mapped.balance,
          'Nội dung giao dịch': mapped.description,
        };
      })
      .filter(Boolean);

    return {
      detectedColumns,
      previewRows,
      totalRows: rawData.length - dataStartIndex,
    };
  }

  /**
   * Parse full file buffer and return normalized transactions.
   */
  async parseFileBuffer(buffer: ArrayBuffer, bankCode: string = 'BIDV'): Promise<Partial<BankTransaction>[]> {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const config = BANK_CONFIGS[bankCode];
    if (!config) {
      throw new Error(`Ngân hàng "${bankCode}" chưa được hỗ trợ. Chỉ hỗ trợ BIDV và AGRIBANK.`);
    }

    const transactions: Partial<BankTransaction>[] = [];

    for (let i = config.dataStartIndex; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const mapped = this.mapRowToNormalized(row, config);
      if (!mapped || !mapped.date) continue;

      const debitAmount = mapped.debit || 0;
      const creditAmount = mapped.credit || 0;

      const isCredit = creditAmount > 0;
      const normalizedAmount = isCredit ? creditAmount : debitAmount;
      if (normalizedAmount === 0) continue;

      // Parse date: DD/MM/YYYY (serial numbers already converted in mapRowToNormalized)
      let normalizedDate = new Date().toISOString().split('T')[0];
      const dateOnly = mapped.date.split(' ')[0];
      const dateParts = dateOnly.split('/');
      if (dateParts.length === 3) {
        normalizedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
      } else if (!isNaN(Date.parse(mapped.date))) {
        normalizedDate = new Date(mapped.date).toISOString().split('T')[0];
      }

      transactions.push({
        raw_date: mapped.date,
        raw_desc: mapped.description || '',
        raw_amount: String(normalizedAmount),
        raw_reference: mapped.reference,
        normalized_date: normalizedDate,
        normalized_amount: normalizedAmount,
        type: isCredit ? 'credit' : 'debit',
        status: 'pending_classification',
      });
    }

    return transactions;
  }

  /**
   * Map a raw row array to the 5 normalized fields based on bank config.
   */
  private excelSerialToDateString(serial: number): string {
    // Excel serial number → DD/MM/YYYY HH:MM:SS
    // Excel epoch: 1900-01-01 = serial 1, with the leap-year bug (serial 60 = 29/02/1900)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + serial * 86400000;
    const d = new Date(ms);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mi = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  private mapRowToNormalized(row: any[], config: BankColumnConfig) {
    const rawDate = row[config.dateCol];
    const date = typeof rawDate === 'number'
      ? this.excelSerialToDateString(rawDate)
      : String(rawDate || '').trim();
    const balance = this.parseNumber(row[config.balanceCol]);
    const description = String(row[config.descCol] || '').trim();

    let debit = 0;
    let credit = 0;

    if (config.amountCol !== null) {
      // Single amount column (AGRIBANK): negative = debit, positive = credit
      const amount = this.parseNumber(row[config.amountCol]);
      if (amount < 0) {
        debit = Math.abs(amount);
      } else {
        credit = amount;
      }
    } else {
      // Separate debit/credit columns (BIDV)
      if (config.debitCol !== null) debit = this.parseNumber(row[config.debitCol]);
      if (config.creditCol !== null) credit = this.parseNumber(row[config.creditCol]);
    }

    const reference = String(row[config.referenceCol] || '').trim();

    if (!date && !description) return null;

    return { date, debit, credit, balance, description, reference };
  }

  /**
   * Parse a classified Excel file.
   *
   * Format: Row 0 is headers.
   *   Columns 0-4: Số ID | Thời gian giao dịch | Số tiền giao dịch | Số dư cuối | Nội dung
   *   Columns 5+:  Each header is a category_code (e.g. HOC_PHI, BAO_HIEM_YT, ...).
   *                Data rows have the allocated amount placed directly in the matching category column(s).
   *
   * A transaction with 1 filled category column → direct.
   * A transaction with 2+ filled category columns → horizontal.
   */
  async parseClassifiedBuffer(buffer: ArrayBuffer, bankCode: string = 'AGRIBANK'): Promise<ClassifiedTransaction[]> {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) {
      throw new Error('File Excel rỗng.');
    }

    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!rawData || rawData.length < 2) {
      throw new Error('File Excel rỗng hoặc không đúng định dạng.');
    }

    const headerRow = rawData[0];
    const isBIDV = bankCode === 'BIDV';

    // BIDV: 6 fixed columns (Số tham chiếu | Thời gian | Tiền ra | Tiền vào | Số dư | Nội dung)
    // AGRIBANK: 5 fixed columns (Số ID | Thời gian | Số tiền | Số dư cuối | Nội dung)
    const CATEGORY_START = isBIDV ? 6 : 5;
    const categoryColumns: Array<{ col: number; code: string }> = [];
    for (let c = CATEGORY_START; c < headerRow.length; c++) {
      const code = String(headerRow[c] || '').trim();
      if (code) {
        categoryColumns.push({ col: c, code });
      }
    }

    if (categoryColumns.length === 0) {
      throw new Error(`Không tìm thấy cột danh mục nào từ cột thứ ${CATEGORY_START + 1} trở đi.`);
    }

    const transactions: ClassifiedTransaction[] = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const rawReference = String(row[0] || '').trim();
      const rawDateVal = row[1];
      const rawDate = typeof rawDateVal === 'number'
        ? this.excelSerialToDateString(rawDateVal)
        : String(rawDateVal || '').trim();

      if (!rawDate) continue;

      let isCredit: boolean;
      let normalizedAmount: number;
      let rawDesc: string;

      if (isBIDV) {
        const debit = this.parseNumber(row[2]);
        const credit = this.parseNumber(row[3]);
        isCredit = credit > 0;
        normalizedAmount = isCredit ? credit : debit;
        rawDesc = String(row[5] || '').trim();
      } else {
        const amount = this.parseNumber(row[2]);
        if (amount === 0) continue;
        isCredit = amount > 0;
        normalizedAmount = Math.abs(amount);
        rawDesc = String(row[4] || '').trim();
      }

      if (normalizedAmount === 0) continue;

      // Parse date DD/MM/YYYY HH:MM:SS → YYYY-MM-DD
      let normalizedDate = new Date().toISOString().split('T')[0];
      const dateOnly = rawDate.split(' ')[0];
      const dateParts = dateOnly.split('/');
      if (dateParts.length === 3) {
        normalizedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
      }

      // Scan category columns for allocations
      const allocations: ClassifiedAllocation[] = [];
      for (const { col, code } of categoryColumns) {
        const val = this.parseNumber(row[col]);
        if (val !== 0) {
          allocations.push({ category_code: code, amount: val });
        }
      }

      // Skip rows with no allocations (unclassified)
      if (allocations.length === 0) continue;

      const splitMode: SplitMode = allocations.length > 1 ? 'horizontal' : 'direct';

      transactions.push({
        raw_date: rawDate,
        raw_desc: rawDesc || '',
        raw_reference: rawReference,
        normalized_date: normalizedDate,
        normalized_amount: normalizedAmount,
        type: isCredit ? 'credit' : 'debit',
        split_mode: splitMode,
        sender_name: null,
        allocations,
        status: 'confirmed',
        notes: null,
      });
    }

    return transactions;
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    // Handle AGRIBANK format: '+200,000 or '-55,000
    let str = String(value).trim();
    str = str.replace(/'/g, '');  // remove single quotes
    str = str.replace(/,/g, '');  // remove comma separators
    return parseFloat(str) || 0;
  }
}
