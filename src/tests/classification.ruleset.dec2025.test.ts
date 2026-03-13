import { ClassificationService } from '../services/classification.service';
import { BankTransaction, ClassificationRule } from '../domain/types';

const service = new ClassificationService();

const mockTx = (raw_desc: string, normalized_amount = 0): BankTransaction => ({
  id: 'tx-sample',
  batch_id: 'batch-dec2025',
  raw_date: '01/12/2025',
  raw_desc,
  raw_amount: normalized_amount.toString(),
  normalized_date: '2025-12-01',
  normalized_amount,
  type: 'credit',
  status: 'pending_classification',
  created_at: '',
  updated_at: '',
});

const rules: ClassificationRule[] = [
  {
    id: 'r-lai-hd',
    category_id: 'cat-lai-hd',
    category_code: 'LAI_HD',
    keyword: 'thanh toan lai tai khoan tien gui|lai tai khoan tien gui',
    type: 'keyword',
    priority: 1,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-co-thuong',
    category_id: 'cat-co-thuong',
    category_code: 'CO_THUONG',
    keyword: 'tat toan tai khoan tien gui|@@|_chiho_|trich quan ly ban quan ly du an',
    type: 'keyword',
    priority: 2,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-lien-doanh',
    category_id: 'cat-lien-doanh',
    category_code: 'LIEN_DOANH',
    keyword: 'qlxd &tk bao lam|thiet ke bao lam|nop hd so 869|nop hd so 870',
    type: 'keyword',
    priority: 3,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-thuc-tap-dn',
    category_id: 'cat-thuc-tap-dn',
    category_code: 'THUC_TAP_DN',
    keyword: 'thanh toan pql|cung ung nhan luc xanh|thanh toan hd 6758',
    type: 'keyword',
    priority: 4,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-ngan-han',
    category_id: 'cat-ngan-han',
    category_code: 'NGAN_HAN',
    keyword: 'thanh toan chi phi dao tao|hoc phi daikin|lap dat, sua chua, bao tri sa|thanh toan tien lop hoc bao tri sa',
    type: 'keyword',
    priority: 5,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-nvsp',
    category_id: 'cat-nvsp',
    category_code: 'NVSP',
    keyword: 'nvsp|so cap 25spsc|07/hd-cdncn',
    type: 'keyword',
    priority: 6,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-hoc-phi-k49',
    category_id: 'cat-hoc-phi-k49',
    category_code: 'HOC_PHI_K49',
    keyword: 'thu hoc phi k49 hki 25/26|2510679|2510788|ngo thi thuy duong',
    type: 'keyword',
    priority: 7,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-bhyt',
    category_id: 'cat-bhyt',
    category_code: 'BHYT',
    keyword: 'bhyt|bao hiem y te|bao hiem|mua bo sung',
    type: 'keyword',
    priority: 8,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-hoc-lai',
    category_id: 'cat-hoc-lai',
    category_code: 'HOC_LAI',
    keyword: 'hoc lai|hl ',
    type: 'keyword',
    priority: 9,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-chua-ro',
    category_id: 'cat-chua-ro',
    category_code: 'CHUA_RO',
    keyword: 'le anh tuan chuyen tien',
    type: 'keyword',
    priority: 10,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'r-fallback',
    category_id: 'cat-other',
    category_code: 'OTHER',
    keyword: '',
    type: 'fallback',
    priority: 999,
    stop_on_match: true,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

describe('Dec 2025 labeled ruleset - classification smoke tests', () => {
  it('classifies representative samples for each main category', () => {
    const samples = [
      { desc: 'Thanh toan lai tai khoan tien gui 812012099185 so tien 120328767 VND', expect: 'cat-lai-hd' },
      { desc: 'Tat toan tai khoan tien gui so 818011720696 dao han ngay 10/12/2025, tien goc 5000000000 (VND)', expect: 'cat-co-thuong' },
      { desc: 'REM ... CONG TY TNHH QUAN LY VA XAY DUNG THIET KE BAO LAM NOP HD SO 870', expect: 'cat-lien-doanh' },
      { desc: 'CTY CP PT NGHE NGHIEP TUOI TRE VIET THANH TOAN PQL', expect: 'cat-thuc-tap-dn' },
      { desc: 'ACH/CONG TY CP DAU TU TAN THANH AN THANH TOAN CHI PHI DAO TAO CHO TRUONG', expect: 'cat-ngan-han' },
      { desc: 'DUONG THI THANH HOA Chuyen tien 2 hv nvsp so cap 25spsc16', expect: 'cat-nvsp' },
      { desc: '2510679pham thuy linh0985209163', expect: 'cat-hoc-phi-k49' },
      { desc: 'Mua bo sung BHYT lop k48-6Q0101', expect: 'cat-bhyt' },
      { desc: 'LE QUANG LONG hoc lai autocad', expect: 'cat-hoc-lai' },
      { desc: '1221700374 LE ANH TUAN Chuyen tien', expect: 'cat-chua-ro' },
      { desc: 'Giao dich khong nhan dien', expect: 'cat-other' },
    ];

    for (const s of samples) {
      const result = service.evaluateRules(mockTx(s.desc), rules);
      expect(result.suggested_category_id).toBe(s.expect);
    }
  });

  it('keeps BHYT above Học lại when both keywords appear together', () => {
    const tx = mockTx('Hoc lai mon html css, mua bo sung bhyt cho sinh vien');
    const result = service.evaluateRules(tx, rules);
    expect(result.suggested_category_id).toBe('cat-bhyt');
  });
});
