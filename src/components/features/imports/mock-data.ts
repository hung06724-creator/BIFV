import type { UploadResult, ParseResult, ClassifyResult } from './types';

export const MOCK_UPLOAD_RESULT: UploadResult = {
  batch_id: 'batch-mock-001',
  filename: 'VCB_032026.xlsx',
  file_hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  bank_code: 'VCB',
  status: 'processing',
  detected_columns: ['STT', 'Ngày hiệu lực', 'Ghi nợ', 'Ghi có', 'Số dư', 'Mô tả'],
  preview_rows: [
    {
      'STT': '08312td0-87Xs',
      'Ngày hiệu lực': '12/03/2026 13:28:56',
      'Ghi nợ': 0,
      'Ghi có': 200000,
      'Số dư': 3128672564,
      'Mô tả': 'TKThe :19021015184017, tai Techcombank. PHAM THI NGOC BICH chuyen tien FT26071809742974',
    },
    {
      'STT': '09412ab1-99Yt',
      'Ngày hiệu lực': '12/03/2026 14:05:12',
      'Ghi nợ': 0,
      'Ghi có': 1500000,
      'Số dư': 3130172564,
      'Mô tả': 'Thanh toan don hang Shopee #SP260312001 NGUYEN VAN AN chuyen tien',
    },
    {
      'STT': '07201cd2-45Kz',
      'Ngày hiệu lực': '11/03/2026 09:15:30',
      'Ghi nợ': 45000000,
      'Ghi có': 0,
      'Số dư': 3083172564,
      'Mô tả': 'Chuyen tien luong thang 3 nhan vien - CONG TY TNHH ABC',
    },
    {
      'STT': '08503ef3-12Lm',
      'Ngày hiệu lực': '11/03/2026 10:42:18',
      'Ghi nợ': 0,
      'Ghi có': 3200000,
      'Số dư': 3086372564,
      'Mô tả': 'TRAN THI MAI chuyen tien thanh toan hoa don dich vu thang 3',
    },
    {
      'STT': '06702gh4-78Np',
      'Ngày hiệu lực': '10/03/2026 16:55:03',
      'Ghi nợ': 0,
      'Ghi có': 50000,
      'Số dư': 3086422564,
      'Mô tả': 'LE VAN HUNG gui tien mat FT26069123456789',
    },
    {
      'STT': '06101ij5-34Qr',
      'Ngày hiệu lực': '10/03/2026 08:30:00',
      'Ghi nợ': 8500000,
      'Ghi có': 0,
      'Số dư': 3077922564,
      'Mô tả': 'Thanh toan tien dien thang 2/2026 - Ma KH: PD260210001',
    },
  ],
  total_rows: 342,
  created_at: '2026-03-13T10:30:00Z',
};

export const MOCK_PARSE_RESULT: ParseResult = {
  batch_id: 'batch-mock-001',
  status: 'reviewing',
  total_parsed: 338,
  total_skipped: 4,
  skipped_reasons: [
    { row_index: 15, reason: 'Số tiền bằng 0, bỏ qua.' },
    { row_index: 99, reason: 'Thiếu mô tả giao dịch.' },
    { row_index: 201, reason: 'Dòng trống.' },
    { row_index: 340, reason: 'Dòng tổng cộng (summary row).' },
  ],
  sample_transactions: [
    {
      raw_date: '12/03/2026 13:28:56',
      raw_desc: 'TKThe :19021015184017, tai Techcombank. PHAM THI NGOC BICH chuyen tien FT26071809742974',
      normalized_date: '2026-03-12',
      normalized_amount: 200000,
      type: 'credit',
    },
    {
      raw_date: '12/03/2026 14:05:12',
      raw_desc: 'Thanh toan don hang Shopee #SP260312001',
      normalized_date: '2026-03-12',
      normalized_amount: 1500000,
      type: 'credit',
    },
    {
      raw_date: '11/03/2026 09:15:30',
      raw_desc: 'Chuyen tien luong thang 3 nhan vien',
      normalized_date: '2026-03-11',
      normalized_amount: 45000000,
      type: 'debit',
    },
  ],
};

export const MOCK_CLASSIFY_RESULT: ClassifyResult = {
  batch_id: 'batch-mock-001',
  total_transactions: 338,
  classification_summary: {
    classified: 310,
    unclassified: 28,
    high_confidence: 245,
    low_confidence: 65,
    already_confirmed: 0,
  },
  top_categories: [
    { category_id: 'cat-001', category_code: 'REV-01', category_name: 'Doanh thu bán hàng', count: 120 },
    { category_id: 'cat-002', category_code: 'REV-02', category_name: 'Tiền chuyển khoản cá nhân', count: 85 },
    { category_id: 'cat-007', category_code: 'REV-05', category_name: 'Doanh thu TMĐT (Shopee/Lazada)', count: 55 },
    { category_id: 'cat-005', category_code: 'EXP-01', category_name: 'Chi phí vận hành', count: 30 },
    { category_id: 'cat-006', category_code: 'EXP-02', category_name: 'Chi phí nhân sự', count: 20 },
  ],
};
