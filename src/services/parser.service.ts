import * as XLSX from 'xlsx';
import { BankTransaction } from '@/domain/types';

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
  // AGRIBANK: header row 1 (0-based: 0), data from row 2 (0-based: 1)
  // Columns: No.(0) | STT(1) | Thời gian GD(2) | Ngày hạch toán(3) | Số ID(4) | Số TK(5) |
  //          Số dư trước(6) | Số tiền GD(7) | Loại tiền(8) | Số dư cuối(9) | TK đối ứng(10) | Nội dung(11) | Tính chất lệnh(12)
  // Số tiền GD has format: '+200,000 (credit) or '-55,000 (debit)
  AGRIBANK: {
    headerRowIndex: 0,
    dataStartIndex: 1,
    dateCol: 2,
    debitCol: null,
    creditCol: null,
    amountCol: 7,   // Số tiền giao dịch: '+xxx = credit, '-xxx = debit
    balanceCol: 9,   // Số dư cuối
    descCol: 11,
    referenceCol: 4,
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
      if (!mapped || !mapped.date || !mapped.description) continue;

      const debitAmount = mapped.debit || 0;
      const creditAmount = mapped.credit || 0;

      const isCredit = creditAmount > 0;
      const normalizedAmount = isCredit ? creditAmount : debitAmount;
      if (normalizedAmount === 0) continue;

      // Parse date DD/MM/YYYY to YYYY-MM-DD
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
        raw_desc: mapped.description,
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
  private mapRowToNormalized(row: any[], config: BankColumnConfig) {
    const date = String(row[config.dateCol] || '').trim();
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
