/**
 * Generate comprehensive sample Excel files for BIDV and AGRIBANK
 * with classification & allocation columns so the user can fill in
 * and re-import into the app.
 *
 * Usage: node scripts/generate-sample-excel.mjs
 */
import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..');

// ═══ All categories from the system ═══
const CATEGORIES = [
  { code: 'HOC_PHI', name: 'Học phí', ledger: '5311.01' },
  { code: 'LE_PHI_TUYEN_SINH', name: 'Lệ phí tuyển sinh', ledger: '5311.02' },
  { code: 'TIEN_HOC_LAI_THI_LAI', name: 'Tiền học lại, thi lại', ledger: '5311.03' },
  { code: 'THU_NGAN_HAN', name: 'Thu ngắn hạn', ledger: '5311.05' },
  { code: 'PHI_QUAN_LY_SV_THUC_TAP', name: 'Phí quản lý HSSV thực tập', ledger: '5311.07' },
  { code: 'TUYEN_SINH_LIEN_KET', name: 'Tuyển sinh liên kết đại học', ledger: '5311.09' },
  { code: 'DOANH_THU_DE_AN_LIEN_DOANH', name: 'Doanh thu đề án liên doanh', ledger: '5311.10' },
  { code: 'DOANH_THU_NSNN', name: 'Doanh thu từ NSNN', ledger: '511' },
  { code: 'LAI_TIEN_GUI_NGAN_HANG', name: 'Lãi tiền gửi ngân hàng', ledger: '515' },
  { code: 'THU_NHAP_KHAC', name: 'Thu nhập khác', ledger: '711' },
  { code: 'HOC_LIEU', name: 'Học liệu', ledger: '3388.01' },
  { code: 'VAN_THE', name: 'Văn thể', ledger: '3388.02' },
  { code: 'TAM_THU_GIAO_TRINH', name: 'Tạm thu giáo trình', ledger: '3388.03' },
  { code: 'CHUYEN_NHAM_NH_TRA_VE', name: 'Chuyển nhầm, NH trả về', ledger: '3388.04' },
  { code: 'BAO_HIEM_YT', name: 'Bảo hiểm y tế', ledger: '3388.06' },
  { code: 'BAO_HIEM_TT', name: 'Bảo hiểm thân thể', ledger: '3388.07' },
  { code: 'LE_PHI_KHAM_SUC_KHOE_DAU_KHOA', name: 'Lệ phí khám sức khỏe đầu khóa', ledger: '3388.08' },
  { code: 'QA_BAO_HO_LAO_DONG', name: 'Quần áo bảo hộ lao động', ledger: '3388.09' },
  { code: 'DONG_PHUC_TT', name: 'Đồng phục thể thao', ledger: '3388.10' },
  { code: 'DONG_PHUC_VAN_HOA', name: 'Đồng phục văn hóa', ledger: '3388.11' },
  { code: 'AO_KHOAC', name: 'Áo khoác', ledger: '3388.12' },
  { code: 'THE_SINH_VIEN', name: 'Thẻ sinh viên', ledger: '3388.13' },
  { code: 'CHAM_SOC_SUC_KHOE_BAN_DAU', name: 'Chăm sóc sức khỏe ban đầu', ledger: '3388.15' },
  { code: 'KHUYEN_HOC_KHUYEN_TAI', name: 'Quỹ khuyến học, khuyến tài', ledger: '3388.17' },
  { code: 'KP_CLC', name: 'Kinh phí CLC', ledger: '3388.19' },
  { code: 'TIEN_DIEN', name: 'Tiền điện', ledger: '3388.22' },
  { code: 'TIEN_NUOC', name: 'Tiền nước', ledger: '3388.23' },
  { code: 'THU_LAO_BHYT', name: 'Trích thù lao BHYT', ledger: '3388.26' },
  { code: 'THU_HO_DAI_HOC_BACH_KHOA', name: 'Thu hộ Đại học Bách Khoa', ledger: '3388.34' },
  { code: 'DAT_COC', name: 'Đặt cọc', ledger: '348' },
  { code: 'PHI_DICH_VU_NGAN_HANG', name: 'Phí dịch vụ ngân hàng', ledger: '615' },
  { code: 'PHI_CHUYEN_KHOAN', name: 'Phí chuyển khoản', ledger: '6428' },
  { code: 'CHI_PHI_DAO_TAO_NVSP', name: 'Chi phí đào tạo / tuyển sinh NVSP', ledger: '632.01' },
  { code: 'CHI_PHI_LIEN_KET_DHSP_HY', name: 'Chi phí tuyển sinh, QLĐT liên kết ĐHSP KT Hưng Yên', ledger: '632.09' },
  { code: 'HOP_DONG_TIEN_GUI', name: 'Hợp đồng tiền gửi', ledger: '1211' },
  { code: 'NOP_TIEN_MAT_VAO_NGAN_HANG', name: 'Nộp tiền mặt vào ngân hàng', ledger: '1111' },
  { code: 'CHUYEN_KHOAN_NOI_BO', name: 'Chuyển khoản nội bộ', ledger: '1121.05' },
  { code: 'OTHER', name: 'Khác / Chưa xác định', ledger: '' },
];

// ═══ Helper: build the "Danh mục" reference sheet ═══
function buildCategorySheet() {
  const header = ['Mã danh mục (category_code)', 'Tên danh mục', 'Tài khoản kế toán'];
  const rows = CATEGORIES.map(c => [c.code, c.name, c.ledger]);
  return [header, ...rows];
}

// ═══ Helper: build instruction sheet ═══
function buildInstructionSheet() {
  return [
    ['HƯỚNG DẪN SỬ DỤNG FILE SAMPLE'],
    [''],
    ['1. Sheet "Giao dịch" chứa danh sách giao dịch. Hãy điền đầy đủ các cột.'],
    ['2. Các cột GỐC (A-F cho BIDV, A-M cho AGRIBANK) giữ nguyên dữ liệu gốc từ sao kê.'],
    ['3. Các cột PHÂN LOẠI (bắt đầu từ cột có tiền tố "»") là cột bạn cần điền:'],
    ['   - » Loại giao dịch: credit hoặc debit'],
    ['   - » Kiểu phân bổ: direct | horizontal | vertical'],
    ['   - » Mã danh mục (allocation 1): Mã danh mục chính, lấy từ sheet "Danh mục"'],
    ['   - » Số tiền (allocation 1): Số tiền phân bổ cho danh mục 1'],
    ['   - » Mã danh mục (allocation 2-5): Dùng khi phân rã ngang, mỗi cột là 1 danh mục con'],
    ['   - » Số tiền (allocation 2-5): Số tiền tương ứng cho từng danh mục con'],
    ['   - » Trạng thái: pending_classification | classified | confirmed | matched | mismatched'],
    ['   - » Ghi chú: Ghi chú tùy ý'],
    [''],
    ['4. VÍ DỤ phân rã ngang (horizontal): 1 giao dịch 10,000,000 đ gồm:'],
    ['   - Allocation 1: HOC_PHI = 8,000,000'],
    ['   - Allocation 2: BAO_HIEM_YT = 800,000'],
    ['   - Allocation 3: VAN_THE = 700,000'],
    ['   - Allocation 4: DONG_PHUC_TT = 500,000'],
    [''],
    ['5. VÍ DỤ trực tiếp (direct): 1 giao dịch chỉ có 1 danh mục:'],
    ['   - Allocation 1: HOC_PHI = 9,250,000 (bằng đúng số tiền giao dịch)'],
    [''],
    ['6. Đối với giao dịch GHI NỢ (debit), vẫn điền bình thường.'],
    [''],
    ['7. Sheet "Danh mục" liệt kê tất cả mã danh mục hợp lệ.'],
  ];
}

// ═══ BIDV Sample ═══
function generateBIDV() {
  // BIDV format: 14 header rows (0-13), data from row 15 (index 14)
  // Columns: Số tham chiếu(0) | Thời gian giao dịch(1) | Tiền ra(2) | Tiền vào(3) | Số dư(4) | Nội dung giao dịch(5)
  const bankHeaders = [
    'Số tham chiếu',
    'Thời gian giao dịch',
    'Tiền ra',
    'Tiền vào',
    'Số dư',
    'Nội dung giao dịch',
  ];

  const classHeaders = [
    '» Loại GD (credit/debit)',
    '» Kiểu phân bổ (direct/horizontal/vertical)',
    '» Người chuyển',
    '» Mã danh mục (allocation 1)',
    '» Số tiền (allocation 1)',
    '» Mã danh mục (allocation 2)',
    '» Số tiền (allocation 2)',
    '» Mã danh mục (allocation 3)',
    '» Số tiền (allocation 3)',
    '» Mã danh mục (allocation 4)',
    '» Số tiền (allocation 4)',
    '» Mã danh mục (allocation 5)',
    '» Số tiền (allocation 5)',
    '» Trạng thái',
    '» Ghi chú',
  ];

  // Build 14 padding rows (BIDV has header at row 14, 0-based index 13)
  const padding = Array.from({ length: 13 }, () => []);

  const headerRow = [...bankHeaders, '', ...classHeaders];

  const sampleData = [
    // Credit - direct
    ['FT26001001', '02/01/2026 10:15:22', '', 9250000, 50000000, 'NGUYEN VAN A nop hp ky 1 K49 CD47',
      '', 'credit', 'direct', 'NGUYEN VAN A', 'HOC_PHI', 9250000, '', '', '', '', '', '', '', 'confirmed', ''],
    // Credit - direct
    ['FT26001002', '02/01/2026 11:30:00', '', 8800000, 58800000, 'TRAN THI B hoc phi ky 2 K49',
      '', 'credit', 'direct', 'TRAN THI B', 'HOC_PHI', 8800000, '', '', '', '', '', '', '', 'classified', ''],
    // Credit - horizontal (split into multiple fees)
    ['FT26001003', '03/01/2026 09:00:00', '', 10500000, 69300000, 'LE VAN C nop tien hoc phi bhyt dong phuc van the K49',
      '', 'credit', 'horizontal', 'LE VAN C', 'HOC_PHI', 8800000, 'BAO_HIEM_YT', 800000, 'DONG_PHUC_TT', 500000, 'VAN_THE', 400000, '', '', 'confirmed', ''],
    // Credit - direct (BHYT only)
    ['FT26001004', '03/01/2026 14:20:00', '', 563220, 69863220, 'PHAM VAN D ck tien bhyt',
      '', 'credit', 'direct', 'PHAM VAN D', 'BAO_HIEM_YT', 563220, '', '', '', '', '', '', '', 'classified', ''],
    // Credit - direct (học lại)
    ['FT26001005', '04/01/2026 08:45:00', '', 350000, 70213220, 'HOANG THI E nop tien hoc lai mon tieng anh K49',
      '', 'credit', 'direct', 'HOANG THI E', 'TIEN_HOC_LAI_THI_LAI', 350000, '', '', '', '', '', '', '', 'classified', ''],
    // Credit - direct (hợp đồng liên doanh)
    ['FT26001006', '05/01/2026 10:00:00', '', 15000000, 85213220, 'CTCP BEAUTY ASCS thanh toan HD so 01/2026',
      '', 'credit', 'direct', '', 'DOANH_THU_DE_AN_LIEN_DOANH', 15000000, '', '', '', '', '', '', '', 'confirmed', ''],
    // Debit - phí dịch vụ
    ['FT26001007', '05/01/2026 23:59:59', 11000, '', 85202220, 'Thu phi duy tri dich vu SMS BIDV',
      '', 'debit', 'direct', '', 'PHI_DICH_VU_NGAN_HANG', 11000, '', '', '', '', '', '', '', '', ''],
    // Debit - chuyển khoản nội bộ
    ['FT26001008', '06/01/2026 09:00:00', 200000000, '', -114797780, 'CK noi bo sang TK Agribank',
      '', 'debit', 'direct', '', 'CHUYEN_KHOAN_NOI_BO', 200000000, '', '', '', '', '', '', '', '', ''],
    // Credit - lãi tiền gửi
    ['FT26001009', '06/01/2026 12:00:00', '', 2500000, -112297780, 'Lai tien gui thang 12/2025 HDTG',
      '', 'credit', 'direct', '', 'LAI_TIEN_GUI_NGAN_HANG', 2500000, '', '', '', '', '', '', '', 'confirmed', ''],
    // Credit - đặt cọc
    ['FT26001010', '07/01/2026 08:30:00', '', 5000000, -107297780, 'NGUYEN VAN F dat coc hoc nghe K50',
      '', 'credit', 'direct', 'NGUYEN VAN F', 'DAT_COC', 5000000, '', '', '', '', '', '', '', 'classified', ''],
    // Credit - horizontal (nhập học)
    ['FT26001011', '08/01/2026 10:00:00', '', 12450000, -94847780, 'TRAN VAN G nop tien nhap hoc hoc phi bhyt dong phuc the sv ao khoac van the K49',
      '', 'credit', 'horizontal', 'TRAN VAN G', 'HOC_PHI', 9250000, 'BAO_HIEM_YT', 563220, 'DONG_PHUC_TT', 500000, 'AO_KHOAC', 350000, 'VAN_THE', 400000, 'confirmed', 'Phân rã 5 khoản'],
    // Credit - chuyển nhầm
    ['FT26001012', '09/01/2026 15:00:00', '', 1000000, -93847780, 'NGUYEN THI H chuyen nham xin tra lai',
      '', 'credit', 'direct', 'NGUYEN THI H', 'CHUYEN_NHAM_NH_TRA_VE', 1000000, '', '', '', '', '', '', '', 'confirmed', ''],
    // Debit - chuyển nhầm trả lại
    ['FT26001013', '10/01/2026 09:00:00', 1000000, '', -94847780, 'CK tra lai tien chuyen nham cho NGUYEN THI H',
      '', 'debit', 'direct', '', 'CHUYEN_NHAM_NH_TRA_VE', 1000000, '', '', '', '', '', '', '', '', ''],
    // Credit - NVSP
    ['FT26001014', '10/01/2026 14:00:00', '', 2500000, -92347780, 'DO VAN I nop hoc phi lop NVSP K49',
      '', 'credit', 'direct', 'DO VAN I', 'CHI_PHI_DAO_TAO_NVSP', 2500000, '', '', '', '', '', '', '', 'classified', ''],
    // Credit - horizontal
    ['FT26001015', '11/01/2026 09:30:00', '', 11200000, -81147780, 'BUI THI K nop hoc phi bhyt giao trinh dong phuc van hoa K49',
      '', 'credit', 'horizontal', 'BUI THI K', 'HOC_PHI', 9250000, 'BAO_HIEM_YT', 563220, 'TAM_THU_GIAO_TRINH', 450000, 'DONG_PHUC_VAN_HOA', 500000, '', '', 'confirmed', ''],
    // 5 empty rows for user to fill
    ...Array.from({ length: 5 }, () => ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']),
  ];

  const ws_data = [...padding, headerRow, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Số tham chiếu
    { wch: 22 }, // Thời gian
    { wch: 14 }, // Tiền ra
    { wch: 14 }, // Tiền vào
    { wch: 14 }, // Số dư
    { wch: 60 }, // Nội dung
    { wch: 2 },  // separator
    { wch: 20 }, // Loại GD
    { wch: 22 }, // Kiểu phân bổ
    { wch: 20 }, // Người chuyển
    { wch: 22 }, // Mã DM 1
    { wch: 16 }, // Số tiền 1
    { wch: 22 }, // Mã DM 2
    { wch: 16 }, // Số tiền 2
    { wch: 22 }, // Mã DM 3
    { wch: 16 }, // Số tiền 3
    { wch: 22 }, // Mã DM 4
    { wch: 16 }, // Số tiền 4
    { wch: 22 }, // Mã DM 5
    { wch: 16 }, // Số tiền 5
    { wch: 22 }, // Trạng thái
    { wch: 30 }, // Ghi chú
  ];

  // Category reference sheet
  const ws_cat = XLSX.utils.aoa_to_sheet(buildCategorySheet());
  ws_cat['!cols'] = [{ wch: 35 }, { wch: 45 }, { wch: 18 }];

  // Instructions sheet
  const ws_instr = XLSX.utils.aoa_to_sheet(buildInstructionSheet());
  ws_instr['!cols'] = [{ wch: 100 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws_instr, 'Hướng dẫn');
  XLSX.utils.book_append_sheet(wb, ws, 'Giao dịch');
  XLSX.utils.book_append_sheet(wb, ws_cat, 'Danh mục');

  const outPath = resolve(OUT_DIR, 'BIDV-sample-classified.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(`✅ BIDV sample: ${outPath}`);
}

// ═══ AGRIBANK Sample ═══
function generateAGRIBANK() {
  // AGRIBANK format: header row 1 (0-based: 0), data from row 2 (0-based: 1)
  // Columns: No.(0) | STT(1) | Thời gian GD(2) | Ngày hạch toán(3) | Số ID(4) | Số TK(5) |
  //          Số dư trước(6) | Số tiền GD(7) | Loại tiền(8) | Số dư cuối(9) | TK đối ứng(10) | Nội dung(11) | Tính chất lệnh(12)
  const bankHeaders = [
    'No.', 'STT', 'Thời gian GD', 'Ngày hạch toán', 'Số ID', 'Số TK',
    'Số dư trước', 'Số tiền GD', 'Loại tiền', 'Số dư cuối', 'TK đối ứng', 'Nội dung', 'Tính chất lệnh',
  ];

  const classHeaders = [
    '» Loại GD (credit/debit)',
    '» Kiểu phân bổ (direct/horizontal/vertical)',
    '» Người chuyển',
    '» Mã danh mục (allocation 1)',
    '» Số tiền (allocation 1)',
    '» Mã danh mục (allocation 2)',
    '» Số tiền (allocation 2)',
    '» Mã danh mục (allocation 3)',
    '» Số tiền (allocation 3)',
    '» Mã danh mục (allocation 4)',
    '» Số tiền (allocation 4)',
    '» Mã danh mục (allocation 5)',
    '» Số tiền (allocation 5)',
    '» Trạng thái',
    '» Ghi chú',
  ];

  const headerRow = [...bankHeaders, '', ...classHeaders];

  const sampleData = [
    // Credit - direct (học phí)
    [1, 1, '02/01/2026 08:30:00', '02/01/2026', 'AGR26001001', '4100201xxxxxx', 100000000, "'+9,250,000", 'VND', 109250000, '', 'NGUYEN VAN A nop hp ky 1 K49 CD47', 'Ghi co',
      '', 'credit', 'direct', 'NGUYEN VAN A', 'HOC_PHI', 9250000, '', '', '', '', '', '', '', '', 'confirmed', ''],
    // Credit - direct (BHYT)
    [2, 2, '02/01/2026 09:00:00', '02/01/2026', 'AGR26001002', '4100201xxxxxx', 109250000, "'+563,220", 'VND', 109813220, '', 'TRAN THI B ck tien bhyt hssv K49', 'Ghi co',
      '', 'credit', 'direct', 'TRAN THI B', 'BAO_HIEM_YT', 563220, '', '', '', '', '', '', '', '', 'classified', ''],
    // Credit - horizontal (nhập học)
    [3, 3, '03/01/2026 10:15:00', '03/01/2026', 'AGR26001003', '4100201xxxxxx', 109813220, "'+11,863,220", 'VND', 121676440, '', 'LE VAN C nop tien nhap hoc hoc phi bhyt dong phuc ao khoac van the K49', 'Ghi co',
      '', 'credit', 'horizontal', 'LE VAN C', 'HOC_PHI', 9250000, 'BAO_HIEM_YT', 563220, 'DONG_PHUC_TT', 500000, 'AO_KHOAC', 350000, 'VAN_THE', 400000, 'confirmed', 'Phân rã 5 khoản nhập học'],
    // Credit - direct (giáo trình)
    [4, 4, '04/01/2026 14:00:00', '04/01/2026', 'AGR26001004', '4100201xxxxxx', 121676440, "'+450,000", 'VND', 122126440, '', 'PHAM VAN D nop tien giao trinh bo sung K49', 'Ghi co',
      '', 'credit', 'direct', 'PHAM VAN D', 'TAM_THU_GIAO_TRINH', 450000, '', '', '', '', '', '', '', '', 'classified', ''],
    // Debit - phí dịch vụ
    [5, 5, '05/01/2026 23:59:59', '05/01/2026', 'AGR26001005', '4100201xxxxxx', 122126440, "'-11,000", 'VND', 122115440, '', 'Thu phi duy tri dich vu Agribank Plus', 'Ghi no',
      '', 'debit', 'direct', '', 'PHI_DICH_VU_NGAN_HANG', 11000, '', '', '', '', '', '', '', '', '', ''],
    // Credit - direct (thu hộ ĐH Bách Khoa)
    [6, 6, '06/01/2026 09:30:00', '06/01/2026', 'AGR26001006', '4100201xxxxxx', 122115440, "'+4,500,000", 'VND', 126615440, '', 'HOANG VAN E nop hp thu ho DH Bach Khoa HN', 'Ghi co',
      '', 'credit', 'direct', 'HOANG VAN E', 'THU_HO_DAI_HOC_BACH_KHOA', 4500000, '', '', '', '', '', '', '', '', 'confirmed', ''],
    // Credit - horizontal
    [7, 7, '07/01/2026 11:00:00', '07/01/2026', 'AGR26001007', '4100201xxxxxx', 126615440, "'+10,113,220", 'VND', 136728660, '', 'DO THI F nop hoc phi bhyt the sv dong phuc van hoa K49', 'Ghi co',
      '', 'credit', 'horizontal', 'DO THI F', 'HOC_PHI', 8800000, 'BAO_HIEM_YT', 563220, 'THE_SINH_VIEN', 50000, 'DONG_PHUC_VAN_HOA', 500000, 'VAN_THE', 200000, 'confirmed', ''],
    // Debit - chuyển khoản nội bộ
    [8, 8, '08/01/2026 08:00:00', '08/01/2026', 'AGR26001008', '4100201xxxxxx', 136728660, "'-50,000,000", 'VND', 86728660, '', '@@CK_NOI_BO@@_thuho_TK BIDV', 'Ghi no',
      '', 'debit', 'direct', '', 'CHUYEN_KHOAN_NOI_BO', 50000000, '', '', '', '', '', '', '', '', '', ''],
    // Credit - direct (ngắn hạn)
    [9, 9, '09/01/2026 10:00:00', '09/01/2026', 'AGR26001009', '4100201xxxxxx', 86728660, "'+3,500,000", 'VND', 90228660, '', 'BUI VAN G hoc phi ngan han lop nail K49', 'Ghi co',
      '', 'credit', 'direct', 'BUI VAN G', 'THU_NGAN_HAN', 3500000, '', '', '', '', '', '', '', '', 'classified', ''],
    // Credit - direct (nộp tiền mặt)
    [10, 10, '10/01/2026 09:00:00', '10/01/2026', 'AGR26001010', '4100201xxxxxx', 90228660, "'+20,000,000", 'VND', 110228660, '', 'Nop tien mat vao tai khoan', 'Ghi co',
      '', 'credit', 'direct', '', 'NOP_TIEN_MAT_VAO_NGAN_HANG', 20000000, '', '', '', '', '', '', '', '', 'confirmed', ''],
    // Credit - direct (khuyến học)
    [11, 11, '11/01/2026 13:00:00', '11/01/2026', 'AGR26001011', '4100201xxxxxx', 110228660, "'+200,000", 'VND', 110428660, '', 'NGUYEN THI H nop tien quy khuyen hoc khuyen tai K49', 'Ghi co',
      '', 'credit', 'direct', 'NGUYEN THI H', 'KHUYEN_HOC_KHUYEN_TAI', 200000, '', '', '', '', '', '', '', '', 'classified', ''],
    // Debit - phí chuyển khoản
    [12, 12, '12/01/2026 09:00:00', '12/01/2026', 'AGR26001012', '4100201xxxxxx', 110428660, "'-5,500", 'VND', 110423160, '', 'Phi chuyen khoan lien ngan hang', 'Ghi no',
      '', 'debit', 'direct', '', 'PHI_CHUYEN_KHOAN', 5500, '', '', '', '', '', '', '', '', '', ''],
    // 5 empty rows for user to fill
    ...Array.from({ length: 5 }, () => Array(28).fill('')),
  ];

  const ws_data = [headerRow, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // No.
    { wch: 5 },  // STT
    { wch: 22 }, // Thời gian GD
    { wch: 14 }, // Ngày hạch toán
    { wch: 16 }, // Số ID
    { wch: 18 }, // Số TK
    { wch: 14 }, // Số dư trước
    { wch: 16 }, // Số tiền GD
    { wch: 8 },  // Loại tiền
    { wch: 14 }, // Số dư cuối
    { wch: 14 }, // TK đối ứng
    { wch: 60 }, // Nội dung
    { wch: 14 }, // Tính chất lệnh
    { wch: 2 },  // separator
    { wch: 20 }, // Loại GD
    { wch: 22 }, // Kiểu phân bổ
    { wch: 20 }, // Người chuyển
    { wch: 22 }, // Mã DM 1
    { wch: 16 }, // Số tiền 1
    { wch: 22 }, // Mã DM 2
    { wch: 16 }, // Số tiền 2
    { wch: 22 }, // Mã DM 3
    { wch: 16 }, // Số tiền 3
    { wch: 22 }, // Mã DM 4
    { wch: 16 }, // Số tiền 4
    { wch: 22 }, // Mã DM 5
    { wch: 16 }, // Số tiền 5
    { wch: 22 }, // Trạng thái
    { wch: 30 }, // Ghi chú
  ];

  // Category reference sheet
  const ws_cat = XLSX.utils.aoa_to_sheet(buildCategorySheet());
  ws_cat['!cols'] = [{ wch: 35 }, { wch: 45 }, { wch: 18 }];

  // Instructions sheet
  const ws_instr = XLSX.utils.aoa_to_sheet(buildInstructionSheet());
  ws_instr['!cols'] = [{ wch: 100 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws_instr, 'Hướng dẫn');
  XLSX.utils.book_append_sheet(wb, ws, 'Giao dịch');
  XLSX.utils.book_append_sheet(wb, ws_cat, 'Danh mục');

  const outPath = resolve(OUT_DIR, 'AGRIBANK-sample-classified.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(`✅ AGRIBANK sample: ${outPath}`);
}

// ═══ Run ═══
generateBIDV();
generateAGRIBANK();
console.log('\n🎉 Done! Files generated in project root.');
