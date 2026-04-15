import { lazy, Suspense, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useAppStore } from '@/lib/store';
import { useStudentStore, type StudentInfo } from '@/lib/studentStore';
import { useTuitionStore, type TuitionRecord, type ExtractionStatus } from '@/lib/tuitionStore';
import {
  Download, UserSearch, Loader2, Upload, Trash2, Users,
  CheckCircle2, AlertTriangle, XCircle, Clock, CheckCheck, RotateCcw,
  Search, Archive,
} from 'lucide-react';
import type { BankTab } from '@/lib/store';
import { extractNameWithRegex, extractNamesWithAI } from '@/services/nameExtraction';
import { loadXLSX } from '@/lib/lazyVendors';

const HPSavedView = lazy(async () => {
  const module = await import('./HPSavedView');
  return { default: module.HPSavedView };
});

const BANK_BUTTONS: { key: BankTab; label: string }[] = [
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'AGRIBANK' },
];

function getBankButtonStyle(activeBank: BankTab, buttonBank: BankTab) {
  const isActive = activeBank === buttonBank;
  const isAgribank = buttonBank === 'AGRIBANK';

  if (!isActive) {
    return {
      backgroundColor: '#ffffff',
      borderColor: 'var(--border)',
      color: 'var(--text-main)',
    };
  }

  return {
    backgroundColor: isAgribank ? 'var(--agribank)' : 'var(--primary)',
    borderColor: isAgribank ? 'var(--agribank)' : 'var(--primary)',
    color: '#ffffff',
  };
}

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

type ExtractionMode = 'regex' | 'ai';
type StatusFilter = 'all' | ExtractionStatus;
type ActiveTab = 'extraction' | 'saved';

const STATUS_LABELS: Record<ExtractionStatus, string> = {
  chua_trich_xuat: 'Chưa trích xuất',
  khong_trich_xuat_duoc: 'Không trích xuất được',
  da_trich_xuat_chua_xac_nhan: 'Đã trích xuất - chưa xác nhận',
  da_trich_xuat_trung_thong_tin: 'Trùng thông tin - cần chọn',
  da_xac_nhan: 'Đã xác nhận',
};

const STATUS_COLORS: Record<ExtractionStatus, string> = {
  chua_trich_xuat: 'bg-gray-100 text-gray-600',
  khong_trich_xuat_duoc: 'bg-red-100 text-red-700',
  da_trich_xuat_chua_xac_nhan: 'bg-yellow-100 text-yellow-700',
  da_trich_xuat_trung_thong_tin: 'bg-orange-100 text-orange-700',
  da_xac_nhan: 'bg-green-100 text-green-700',
};

const STATUS_ICONS: Record<ExtractionStatus, React.ReactNode> = {
  chua_trich_xuat: <Clock className="w-3.5 h-3.5" />,
  khong_trich_xuat_duoc: <XCircle className="w-3.5 h-3.5" />,
  da_trich_xuat_chua_xac_nhan: <AlertTriangle className="w-3.5 h-3.5" />,
  da_trich_xuat_trung_thong_tin: <AlertTriangle className="w-3.5 h-3.5" />,
  da_xac_nhan: <CheckCircle2 className="w-3.5 h-3.5" />,
};

const DEFAULT_REGEX = String.raw`VND\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})`;

// ─── Inline manual student search component ────────────────────────────────

function ManualStudentSearch({
  transactionId,
  description,
  onSelect,
}: {
  transactionId: string;
  description: string;
  onSelect: (transactionId: string, student: StudentInfo) => void;
}) {
  const students = useStudentStore((s) => s.students);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.hoTen.toLowerCase().includes(q) ||
        s.maHoSo.toLowerCase().includes(q) ||
        (s.nganh && s.nganh.toLowerCase().includes(q)),
    ).slice(0, 10);
  }, [query, students]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn btn-sm btn-secondary rounded-md"
      >
        <Search className="w-3 h-3" /> Tìm SV thủ công
      </button>
    );
  }

  return (
    <div className="space-y-2 min-w-[260px]">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-500 max-h-16 overflow-hidden" title={description}>
        <span className="font-medium text-gray-700">Nội dung:</span> {description.slice(0, 120)}{description.length > 120 ? '...' : ''}
      </div>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập tên, MHS, hoặc lớp..."
          autoFocus
          className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      {query.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs text-gray-400 italic px-1">Không tìm thấy kết quả</p>
      )}
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {results.map((st, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
              onClick={() => {
                onSelect(transactionId, st);
                setOpen(false);
                setQuery('');
              }}
            >
              <div className="text-sm font-semibold text-gray-900">{st.hoTen}</div>
              <div className="text-xs text-gray-600">{st.maHoSo} · {st.ngaySinh}</div>
              <div className="text-xs text-gray-500">{st.nganh}</div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => { setOpen(false); setQuery(''); }}
        className="btn btn-sm btn-ghost justify-start px-0"
      >
        ✕ Đóng
      </button>
    </div>
  );
}

export function HPReportView() {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState<ActiveTab>('extraction');
  const [bank, setBank] = useState<BankTab>('AGRIBANK');
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('ai');
  const [regexPattern, setRegexPattern] = useState(DEFAULT_REGEX);
  const [regexError, setRegexError] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [showStudentPanel, setShowStudentPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['HOC_PHI']));
  const [savedSearch, setSavedSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const bidvTransactions = useAppStore((s) => s.bidvTransactions);
  const agribankTransactions = useAppStore((s) => s.agribankTransactions);
  const categories = useAppStore((s) => s.categories);

  const students = useStudentStore((s) => s.students);
  const findByName = useStudentStore((s) => s.findByName);
  const importFromFile = useStudentStore((s) => s.importFromFile);
  const addFromFile = useStudentStore((s) => s.addFromFile);
  const setStudentsFromClipboard = useStudentStore((s) => s.setStudents);
  const addStudentsFromClipboard = useStudentStore((s) => s.addStudents);
  const clearStudents = useStudentStore((s) => s.clearStudents);

  const tuitionRecords = useTuitionStore((s) => s.records);
  const savedRecords = useTuitionStore((s) => s.savedRecords);
  const setTuitionRecords = useTuitionStore((s) => s.setRecords);
  const updateExtractionResult = useTuitionStore((s) => s.updateExtractionResult);
  const confirmRecord = useTuitionStore((s) => s.confirmRecord);
  const selectStudent = useTuitionStore((s) => s.selectStudent);
  const manualAssignStudent = useTuitionStore((s) => s.manualAssignStudent);
  const confirmAll = useTuitionStore((s) => s.confirmAll);
  const resetRecord = useTuitionStore((s) => s.resetRecord);

  // Available categories from allocations
  const availableCategories = useMemo(() => {
    const availableMap = new Map<string, string>();
    const transactions = bank === 'BIDV' ? bidvTransactions : agribankTransactions;

    for (const category of categories) {
      if (category.code) {
        availableMap.set(category.code, category.name || category.code);
      }
    }

    for (const t of transactions) {
      for (const a of t.allocations) {
        const code = a.confirmed_category_code || a.suggested_category_code;
        const name = a.confirmed_category_name || a.suggested_category_name;
        if (!code) continue;
        if (!availableMap.has(code)) {
          availableMap.set(code, name || code);
        }
      }
    }

    return Array.from(availableMap.entries())
      .filter(([code]) =>
        transactions.some((t) =>
          t.allocations.some((a) => (a.confirmed_category_code || a.suggested_category_code) === code)
        )
      )
      .sort(([codeA], [codeB]) => codeA.localeCompare(codeB))
      .map(([code, name]) => ({ code, name }));
  }, [bank, bidvTransactions, agribankTransactions, categories]);

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    for (const t of [...bidvTransactions, ...agribankTransactions]) {
      const y = parseInt(t.normalized_date.substring(0, 4), 10);
      if (!isNaN(y)) yearSet.add(y);
    }
    const years = [...yearSet].sort((a, b) => b - a);
    return years.length > 0 ? years : [currentDate.getFullYear()];
  }, [bidvTransactions, agribankTransactions]);

  // Build working records from transactions when filters change
  useEffect(() => {
    const transactions = bank === 'BIDV' ? bidvTransactions : agribankTransactions;
    const existingMap = new Map(tuitionRecords.map((r) => [r.transactionId, r]));
    const newRecords: TuitionRecord[] = [];

    for (const txn of transactions) {
      const txnYear = parseInt(txn.normalized_date.substring(0, 4), 10);
      const txnMonth = parseInt(txn.normalized_date.substring(5, 7), 10);
      if (txnYear !== year || txnMonth !== month) continue;

      const matchingAlloc = txn.allocations.find((a) => {
        const code = a.confirmed_category_code || a.suggested_category_code;
        return code && selectedCategories.has(code);
      });
      if (!matchingAlloc) continue;

      const categoryCode = matchingAlloc.confirmed_category_code || matchingAlloc.suggested_category_code || 'HOC_PHI';

      const existing = existingMap.get(txn.id);
      if (existing) {
        newRecords.push({ ...existing, date: txn.raw_date || formatDate(txn.normalized_date), normalizedDate: txn.normalized_date, amount: matchingAlloc.amount ?? txn.normalized_amount, description: txn.raw_desc || '', categoryCode, bankCode: bank, rawReference: txn.raw_reference || '' });
      } else {
        newRecords.push({
          transactionId: txn.id,
          date: txn.raw_date || formatDate(txn.normalized_date),
          normalizedDate: txn.normalized_date,
          amount: matchingAlloc.amount ?? txn.normalized_amount,
          description: txn.raw_desc || '',
          extractedName: '',
          status: 'chua_trich_xuat',
          matchedStudents: [],
          confirmedStudent: null,
          categoryCode,
          bankCode: bank,
          rawReference: txn.raw_reference || '',
        });
      }
    }

    newRecords.sort((a, b) => a.normalizedDate.localeCompare(b.normalizedDate));
    // setRecords will auto-exclude already-saved transactions
    setTuitionRecords(newRecords);
  }, [bank, month, year, bidvTransactions, agribankTransactions, selectedCategories]);

  // Filtered working records
  const filteredRecords = useMemo(() => {
    if (statusFilter === 'all') return tuitionRecords;
    return tuitionRecords.filter((r) => r.status === statusFilter);
  }, [tuitionRecords, statusFilter]);

  const totalAmount = useMemo(() => filteredRecords.reduce((s, r) => s + r.amount, 0), [filteredRecords]);

  // Stats for working records
  const stats = useMemo(() => {
    const counts: Record<ExtractionStatus, number> = {
      chua_trich_xuat: 0,
      khong_trich_xuat_duoc: 0,
      da_trich_xuat_chua_xac_nhan: 0,
      da_trich_xuat_trung_thong_tin: 0,
      da_xac_nhan: 0,
    };
    for (const r of tuitionRecords) counts[r.status]++;
    return { ...counts, total: tuitionRecords.length };
  }, [tuitionRecords]);

  // Saved records - filtered by search
  const filteredSaved = useMemo(() => {
    if (!savedSearch.trim()) return savedRecords;
    const q = savedSearch.trim().toLowerCase();
    return savedRecords.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.extractedName.toLowerCase().includes(q) ||
        r.confirmedStudent?.hoTen.toLowerCase().includes(q) ||
        r.confirmedStudent?.maHoSo.toLowerCase().includes(q) ||
        r.confirmedStudent?.lop?.toLowerCase().includes(q),
    );
  }, [savedRecords, savedSearch]);

  const savedTotal = useMemo(() => filteredSaved.reduce((s, r) => s + r.amount, 0), [filteredSaved]);

  const validateRegex = useCallback((value: string) => {
    try {
      new RegExp(value);
      setRegexError('');
      return true;
    } catch (e: any) {
      setRegexError(e.message);
      return false;
    }
  }, []);

  const handleExtractAll = useCallback(async () => {
    if (isExtracting) return;
    const pending = tuitionRecords.filter(
      (r) => r.status === 'chua_trich_xuat' || r.status === 'khong_trich_xuat_duoc'
    );
    if (pending.length === 0) {
      alert('Không có giao dịch nào cần trích xuất');
      return;
    }

    if (extractionMode === 'regex') {
      if (!validateRegex(regexPattern)) return;
      const pattern = new RegExp(regexPattern);
      for (const rec of pending) {
        const name = extractNameWithRegex(rec.description, pattern) || 'NULL';
        const matched = name && name !== 'NULL' && name !== 'ERROR' ? findByName(name) : [];
        updateExtractionResult(rec.transactionId, name, matched);
      }
      return;
    }

    if (!apiKey.trim()) {
      alert('Vui lòng nhập Groq API Key');
      return;
    }
    localStorage.setItem('groq_api_key', apiKey);

    setIsExtracting(true);
    setProgress({ done: 0, total: pending.length });

    const items = pending.map((r) => ({ id: r.transactionId, message: r.description }));

    try {
      const results = await extractNamesWithAI(items, apiKey, (_batch, done, total) => {
        setProgress({ done, total });
      });

      for (const r of results) {
        const name = r.fullName === 'NULL' ? 'NULL' : r.fullName;
        const matched = name && name !== 'NULL' && name !== 'ERROR' ? findByName(name) : [];
        updateExtractionResult(r.id, name, matched);
      }
    } catch (e: any) {
      alert('Lỗi trích xuất: ' + e.message);
    } finally {
      setIsExtracting(false);
    }
  }, [isExtracting, tuitionRecords, extractionMode, regexPattern, apiKey, validateRegex, findByName, updateExtractionResult]);

  const handleConfirmAll = useCallback(() => {
    const count = tuitionRecords.filter((r) => r.status === 'da_trich_xuat_chua_xac_nhan' && r.confirmedStudent).length;
    if (count === 0) {
      alert('Không có bản ghi nào đủ điều kiện xác nhận');
      return;
    }
    if (confirm(`Xác nhận và lưu ${count} bản ghi?`)) {
      confirmAll();
    }
  }, [tuitionRecords, confirmAll]);

  const toggleCategory = (code: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        if (next.size > 1) next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // ─── Student import handlers ────────────────────────────────────────────

  async function handlePasteStudents(mode: 'replace' | 'add') {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) { alert('Clipboard trống'); return; }
      const count = text.split('\n').filter((l) => l.trim()).length;
      const confirmed = confirm(
        mode === 'replace'
          ? `Nhập lại toàn bộ ${count} sinh viên? (Dữ liệu cũ sẽ bị thay thế)`
          : `Thêm ${count} sinh viên mới?`,
      );
      if (!confirmed) return;
      if (mode === 'replace') setStudentsFromClipboard(text);
      else addStudentsFromClipboard(text);
    } catch { alert('Không thể đọc clipboard'); }
  }

  function handleFileImport(mode: 'replace' | 'add') {
    const input = fileInputRef.current;
    if (!input) return;
    input.dataset.mode = mode;
    input.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const mode = (e.target.dataset.mode || 'replace') as 'replace' | 'add';

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await loadXLSX();
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { header: 1 });

        let startIdx = 0;
        const firstRow = jsonData[0] as any[];
        if (firstRow && typeof firstRow[0] === 'string' &&
          /^(stt|ma|mã|ho|họ|#)/i.test(firstRow[0])) {
          startIdx = 1;
        }

        const parsed: StudentInfo[] = [];
        for (let i = startIdx; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length < 2) continue;
          let maHoSo: string, hoTen: string, ngaySinh: string, nganh: string, lop: string = '';
          if (row.length >= 5 && typeof row[0] === 'number') {
            maHoSo = String(row[1] ?? '').trim();
            hoTen = String(row[2] ?? '').trim();
            ngaySinh = String(row[3] ?? '').trim();
            nganh = String(row[4] ?? '').trim();
          } else if (row.length >= 4) {
            maHoSo = String(row[0] ?? '').trim();
            hoTen = String(row[1] ?? '').trim();
            ngaySinh = String(row[2] ?? '').trim();
            nganh = String(row[3] ?? '').trim();
          } else {
            maHoSo = String(row[0] ?? '').trim();
            hoTen = String(row[1] ?? '').trim();
            ngaySinh = String(row[2] ?? '').trim();
            nganh = '';
          }
          if (hoTen) parsed.push({ maHoSo, hoTen, ngaySinh, nganh, lop });
        }

        if (parsed.length === 0) { alert('Không tìm thấy dữ liệu sinh viên trong file'); return; }
        const confirmed = confirm(
          mode === 'replace'
            ? `Nhập ${parsed.length} sinh viên? (Dữ liệu cũ sẽ bị thay thế)`
            : `Thêm ${parsed.length} sinh viên mới?`,
        );
        if (!confirmed) return;
        if (mode === 'replace') importFromFile(parsed);
        else addFromFile(parsed);
      } catch (err: any) { alert('Lỗi đọc file: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  // ─── Download Excel (saved records) ─────────────────────────────────────

  async function handleDownloadSaved() {
    const XLSX = await loadXLSX();
    const header = ['STT', 'Thời gian', 'Số tiền', 'Danh mục', 'Nội dung', 'MHS', 'Họ và tên', 'Ngày tháng năm sinh', 'Lớp'];
    const data: any[][] = filteredSaved.map((r, i) => {
      const st = r.confirmedStudent;
      return [
        i + 1,
        r.date,
        r.amount,
        r.categoryCode,
        r.description,
        st?.maHoSo ?? '',
        st?.hoTen ?? r.extractedName,
        st?.ngaySinh ?? '',
        st?.nganh ?? '',
      ];
    });
    data.push(['', 'TỔNG CỘNG', savedTotal, '', '', '', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 60 },
      { wch: 14 }, { wch: 25 }, { wch: 16 }, { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lưu trữ GD');

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Luu-tru-giao-dich_${dateStr}.xlsx`);
  }

  // ─── Render helpers ─────────────────────────────────────────────────────

  function renderStatusBadge(status: ExtractionStatus) {
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status])}>
        {STATUS_ICONS[status]}
        {STATUS_LABELS[status]}
      </span>
    );
  }

  function renderStudentCell(rec: TuitionRecord) {
    if (rec.status === 'chua_trich_xuat') return <span className="text-gray-300 text-xs">—</span>;

    if (rec.status === 'khong_trich_xuat_duoc') {
      return (
        <div className="space-y-1">
          <span className="text-red-400 text-xs italic">Không trích xuất được</span>
          <ManualStudentSearch
            transactionId={rec.transactionId}
            description={rec.description}
            onSelect={manualAssignStudent}
          />
        </div>
      );
    }

    if (rec.status === 'da_trich_xuat_chua_xac_nhan') {
      if (rec.confirmedStudent) {
        const st = rec.confirmedStudent;
        return (
          <div className="space-y-1">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 space-y-0.5">
              <div className="text-sm font-semibold text-blue-800">{st.hoTen}</div>
              <div className="text-xs text-gray-600">{st.maHoSo} · {st.ngaySinh}</div>
              <div className="text-xs text-gray-500">{st.nganh}</div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => confirmRecord(rec.transactionId)}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                ✓ Xác nhận & lưu
              </button>
              <button
                onClick={() => resetRecord(rec.transactionId)}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3 inline" /> Đặt lại
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <span className="text-sm font-medium text-indigo-700">{rec.extractedName}</span>
          <div className="text-xs text-orange-500 italic">Không khớp SV trong danh sách</div>
          <ManualStudentSearch
            transactionId={rec.transactionId}
            description={rec.description}
            onSelect={manualAssignStudent}
          />
        </div>
      );
    }

    if (rec.status === 'da_trich_xuat_trung_thong_tin') {
      return (
        <div className="space-y-1.5">
          <div className="text-xs text-orange-600 font-medium">⚠ Trùng {rec.matchedStudents.length} SV — chọn đúng:</div>
          {rec.matchedStudents.map((st, i) => (
            <div
              key={i}
              className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
              onClick={() => selectStudent(rec.transactionId, st)}
            >
              <div className="text-sm font-semibold">{st.hoTen}</div>
              <div className="text-xs text-gray-600">{st.maHoSo} · {st.ngaySinh}</div>
              <div className="text-xs text-gray-500">{st.nganh}</div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-gray-300 text-xs">—</span>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFileSelected}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng hợp học phí</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Trích xuất thông tin sinh viên từ giao dịch học phí & đối chiếu HSSV
          </p>
        </div>
        <button
          onClick={() => setShowStudentPanel(!showStudentPanel)}
          className={clsx(
            'btn btn-md',
            showStudentPanel
              ? 'btn-secondary'
              : 'btn-neutral',
          )}
        >
          <Users className="w-4 h-4" />
          HSSV ({students.length})
        </button>
      </div>

      {/* Student import panel */}
      {showStudentPanel && (
        <div className="bg-[var(--btn-secondary-bg)] border border-[var(--btn-secondary-border)] rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-indigo-800">👨‍🎓 Dữ liệu sinh viên ({students.length} SV)</h2>
            {students.length > 0 && (
              <button
                onClick={() => { if (confirm('Xóa toàn bộ dữ liệu sinh viên?')) clearStudents(); }}
                className="btn btn-sm btn-danger"
              >
                <Trash2 className="w-3 h-3" /> Xóa tất cả
              </button>
            )}
          </div>
          <p className="text-xs text-indigo-600">Nhập dữ liệu sinh viên từ Excel (Mã hồ sơ | Họ tên | Ngày sinh | Lớp)</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleFileImport('replace')} className="btn btn-sm btn-primary"><Upload className="w-3 h-3" /> Nhập từ file Excel</button>
            <button onClick={() => handleFileImport('add')} className="btn btn-sm btn-secondary"><Upload className="w-3 h-3" /> Thêm từ file Excel</button>
            <button onClick={() => handlePasteStudents('replace')} className="btn btn-sm btn-neutral">📋 Dán từ clipboard</button>
            <button onClick={() => handlePasteStudents('add')} className="btn btn-sm btn-neutral">✨ Thêm từ clipboard</button>
          </div>
          {students.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-indigo-200 rounded-lg bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--primary-light)] sticky top-0">
                    <th className="px-2 py-1.5 text-left font-semibold text-indigo-800 w-10">STT</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-indigo-800">Mã hồ sơ</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-indigo-800">Họ tên</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-indigo-800">Ngày sinh</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-indigo-800">Lớp</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 100).map((s, i) => (
                    <tr key={i} className="border-t border-indigo-100 hover:bg-indigo-50/50">
                      <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                      <td className="px-2 py-1">{s.maHoSo}</td>
                      <td className="px-2 py-1 font-medium">{s.hoTen}</td>
                      <td className="px-2 py-1">{s.ngaySinh}</td>
                      <td className="px-2 py-1">{s.nganh}</td>
                    </tr>
                  ))}
                  {students.length > 100 && (
                    <tr><td colSpan={5} className="px-2 py-1.5 text-center text-gray-400 italic">... và {students.length - 100} sinh viên khác</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Tabs ═══ */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('extraction')}
          className={clsx(
            'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'extraction'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          )}
        >
          <UserSearch className="w-4 h-4" />
          Trích xuất giao dịch
          {stats.total > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">{stats.total}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={clsx(
            'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'saved'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          )}
        >
          <Archive className="w-4 h-4" />
          Lưu trữ giao dịch
          {savedRecords.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{savedRecords.length}</span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: Trích xuất giao dịch                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'extraction' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Ngân hàng</label>
                <div className="flex items-center gap-2">
                  {BANK_BUTTONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setBank(option.key)}
                      className="btn btn-md"
                      style={getBankButtonStyle(bank, option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Tháng</label>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1}</option>))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Năm</label>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {availableYears.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
              <div className="ml-auto text-sm text-gray-600">
                Tổng: <span className="font-semibold">{tuitionRecords.length}</span> giao dịch
              </div>
            </div>
            {availableCategories.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium text-gray-700">Danh mục:</label>
                {availableCategories.map(({ code, name }) => (
                  <button
                    key={code}
                    onClick={() => toggleCategory(code)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                      selectedCategories.has(code)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <span>{name || code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Extraction panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Trích xuất tên người học</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1 rounded-lg border border-gray-300 p-0.5">
                <button onClick={() => setExtractionMode('ai')} className={clsx('btn btn-sm border-0 shadow-none', extractionMode === 'ai' ? 'btn-primary' : 'btn-ghost')}>🤖 AI (Groq)</button>
                <button onClick={() => setExtractionMode('regex')} className={clsx('btn btn-sm border-0 shadow-none', extractionMode === 'regex' ? 'btn-primary' : 'btn-ghost')}>🔤 Regex</button>
              </div>
              {extractionMode === 'ai' && (
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Groq API Key..." className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
              {extractionMode === 'regex' && (
                <div className="flex-1 min-w-[300px]">
                  <input type="text" value={regexPattern} onChange={(e) => { setRegexPattern(e.target.value); validateRegex(e.target.value); }} placeholder="Regex pattern..." className={clsx('w-full border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2', regexError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500')} />
                  {regexError && <p className="text-xs text-red-500 mt-1">{regexError}</p>}
                </div>
              )}
              <button
                onClick={handleExtractAll}
                disabled={isExtracting || (stats.chua_trich_xuat + stats.khong_trich_xuat_duoc) === 0}
                className="btn btn-md btn-primary"
              >
                {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserSearch className="w-4 h-4" />}
                {isExtracting
                  ? `Đang xử lý ${progress.done}/${progress.total}...`
                  : `Trích xuất (${stats.chua_trich_xuat + stats.khong_trich_xuat_duoc} chưa xử lý / lỗi)`}
              </button>
              {stats.da_trich_xuat_chua_xac_nhan > 0 && (
                <button onClick={handleConfirmAll} className="btn btn-md btn-secondary">
                  <CheckCheck className="w-4 h-4" /> Xác nhận & lưu tất cả
                </button>
              )}
            </div>
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {([
              ['all', 'Tất cả', stats.total, 'bg-white border-gray-200 text-gray-800'],
              ['chua_trich_xuat', STATUS_LABELS.chua_trich_xuat, stats.chua_trich_xuat, 'bg-gray-50 border-gray-200 text-gray-600'],
              ['khong_trich_xuat_duoc', STATUS_LABELS.khong_trich_xuat_duoc, stats.khong_trich_xuat_duoc, 'bg-red-50 border-red-200 text-red-700'],
              ['da_trich_xuat_chua_xac_nhan', 'Chưa xác nhận', stats.da_trich_xuat_chua_xac_nhan, 'bg-yellow-50 border-yellow-200 text-yellow-700'],
              ['da_trich_xuat_trung_thong_tin', 'Trùng thông tin', stats.da_trich_xuat_trung_thong_tin, 'bg-orange-50 border-orange-200 text-orange-700'],
            ] as [StatusFilter, string, number, string][]).map(([key, label, count, colors]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={clsx('border rounded-xl px-4 py-3 text-left transition-all', colors, statusFilter === key ? 'ring-2 ring-[var(--primary)] shadow-md' : 'hover:shadow-sm')}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs mt-0.5">{label}</div>
              </button>
            ))}
          </div>

          {/* Extraction table */}
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
              <p className="text-gray-400 text-sm">
                {tuitionRecords.length === 0 ? 'Không có giao dịch thuộc danh mục đã chọn trong kỳ này.' : 'Không có giao dịch nào ở trạng thái này.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-center px-3 py-3 font-semibold text-gray-700 w-10">STT</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Thời gian</th>
                      <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Số tiền</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-700">Nội dung</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Tên trích xuất</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Trạng thái</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-700 whitespace-nowrap min-w-[280px]">Thông tin SV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((rec, idx) => (
                      <tr key={rec.transactionId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="text-center px-3 py-2.5 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-800">{rec.date}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums text-gray-900 font-medium">{formatNumber(rec.amount)}</td>
                        <td className="px-3 py-2.5 text-gray-700" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{rec.description}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {!rec.extractedName ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : rec.extractedName === 'NULL' ? (
                            <span className="text-yellow-500 text-xs italic">Không tìm thấy</span>
                          ) : rec.extractedName === 'ERROR' ? (
                            <span className="text-red-500 text-xs italic">Lỗi</span>
                          ) : (
                            <span className="font-medium text-indigo-700">{rec.extractedName}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">{renderStatusBadge(rec.status)}</td>
                        <td className="px-3 py-2.5">{renderStudentCell(rec)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-300">
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 font-bold text-gray-900">Tổng cộng</td>
                      <td className="text-right px-3 py-3 font-bold tabular-nums text-gray-900">{formatNumber(totalAmount)}</td>
                      <td colSpan={4} className="px-3 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: Lưu trữ giao dịch                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'saved' && (
        <Suspense fallback={<div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Đang tải lưu trữ giao dịch...</div>}>
          <HPSavedView />
        </Suspense>
      )}
    </div>
  );
}
