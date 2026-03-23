import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTuitionStore, TuitionRecord } from '@/lib/tuitionStore';
import { Download, RotateCcw, Search, ChevronDown, ChevronRight, Calendar, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { clsx } from 'clsx';
import type { BankTab } from '@/lib/store';

const BANK_TABS: { key: BankTab; label: string }[] = [
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'Agribank' },
];

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

interface MonthGroup {
  key: string;       // "2026-03"
  label: string;     // "Tháng 03/2026"
  records: TuitionRecord[];
  totalAmount: number;
  count: number;
}

function groupByMonth(records: TuitionRecord[]): MonthGroup[] {
  const map = new Map<string, TuitionRecord[]>();

  for (const r of records) {
    if (!r.normalizedDate || r.normalizedDate.length < 7) continue;
    const monthKey = r.normalizedDate.substring(0, 7); // "YYYY-MM"
    const arr = map.get(monthKey) || [];
    arr.push(r);
    map.set(monthKey, arr);
  }

  // Sort months descending (newest first)
  const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return sorted.map(([key, txns]) => {
    const [year, month] = key.split('-');
    return {
      key,
      label: `Tháng ${month}/${year}`,
      records: txns.sort((a, b) => b.date.localeCompare(a.date)),
      totalAmount: txns.reduce((s, t) => s + t.amount, 0),
      count: txns.length,
    };
  });
}

// ─── Virtual-scroll table (renders only visible rows) ──────────────────────
const ROW_HEIGHT = 40;   // px – must match the <tr> height below
const CONTAINER_H = 480; // px – visible scroll area height
const OVERSCAN = 5;      // extra rows rendered above & below viewport

interface VirtualTableProps {
  records: TuitionRecord[];
  onReset: (id: string) => void;
}

function VirtualTable({ records, onReset }: VirtualTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef<number | null>(null);

  const onScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
    });
  }, []);

  const totalHeight = records.length * ROW_HEIGHT;

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx   = Math.min(
    records.length - 1,
    Math.ceil((scrollTop + CONTAINER_H) / ROW_HEIGHT) + OVERSCAN,
  );

  const visibleRecords = records.slice(startIdx, endIdx + 1);
  const paddingTop    = startIdx * ROW_HEIGHT;
  const paddingBottom = Math.max(0, (records.length - endIdx - 1) * ROW_HEIGHT);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ height: CONTAINER_H, overflowY: 'auto', overflowX: 'auto' }}
      className="border-t border-gray-200"
    >
      <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: 1200 }}>
        <colgroup>
          <col style={{ width: 44 }} />{/* STT */}
          <col style={{ width: 110 }} />{/* Thời gian */}
          <col style={{ width: 130 }} />{/* Số tiền */}
          <col />{/* Nội dung – flexible */}
          <col style={{ width: 130 }} />{/* MHS */}
          <col style={{ width: 180 }} />{/* Họ và tên */}
          <col style={{ width: 110 }} />{/* Ngày sinh */}
          <col style={{ width: 100 }} />{/* Lớp */}
          <col style={{ width: 80 }} />{/* Action */}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr className="bg-green-50 border-b border-green-200">
            <th className="text-center px-3 py-3 font-semibold text-green-800">STT</th>
            <th className="text-left px-3 py-3 font-semibold text-green-800 whitespace-nowrap">Thời gian</th>
            <th className="text-right px-3 py-3 font-semibold text-green-800 whitespace-nowrap">Số tiền</th>
            <th className="text-left px-3 py-3 font-semibold text-green-800">Nội dung</th>
            <th className="text-left px-3 py-3 font-semibold text-green-800 whitespace-nowrap">MHS</th>
            <th className="text-left px-3 py-3 font-semibold text-green-800 whitespace-nowrap">Họ và tên</th>
            <th className="text-left px-3 py-3 font-semibold text-green-800 whitespace-nowrap">Ngày sinh</th>
            <th className="text-left px-3 py-3 font-semibold text-green-800 whitespace-nowrap">Lớp</th>
            <th className="text-center px-3 py-3 font-semibold text-green-800"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paddingTop > 0 && (
            <tr style={{ height: paddingTop }}><td colSpan={9} /></tr>
          )}
          {visibleRecords.map((rec, relIdx) => {
            const idx = startIdx + relIdx;
            const st = rec.confirmedStudent;
            return (
              <tr key={rec.transactionId} style={{ height: ROW_HEIGHT }} className="hover:bg-green-50/50">
                <td className="text-center px-3 py-2.5 text-gray-500 font-mono text-xs">{idx + 1}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-800 text-xs">{rec.date}</td>
                <td className="text-right px-3 py-2.5 tabular-nums text-gray-900 font-medium">{formatNumber(rec.amount)}</td>
                <td className="px-3 py-2.5 text-gray-700 text-xs truncate" title={rec.description}>{rec.description}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-800 font-mono text-xs">{st?.maHoSo ?? ''}</td>
                <td className="px-3 py-2.5 whitespace-nowrap font-medium text-green-800 text-xs">{st?.hoTen ?? rec.extractedName}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs">{st?.ngaySinh ?? ''}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs">{st?.nganh ?? ''}</td>
                <td className="px-3 py-2.5 text-center">
                  <button
                    onClick={() => onReset(rec.transactionId)}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                    title="Đặt lại về bước chọn SV"
                  >
                    <RotateCcw className="w-3 h-3 inline mr-0.5" />Đặt lại
                  </button>
                </td>
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr style={{ height: paddingBottom }}><td colSpan={9} /></tr>
          )}
        </tbody>
        <tfoot className="sticky bottom-0 bg-green-50 border-t-2 border-green-200">
          <tr>
            <td colSpan={2} className="px-3 py-2 text-xs font-bold text-green-800">Tổng tháng</td>
            <td className="text-right px-3 py-2 font-bold tabular-nums text-green-900" style={{ width: 120 }}>
              {formatNumber(records.reduce((s, r) => s + r.amount, 0))}
            </td>
            <td colSpan={6} className="px-3 py-2 text-xs text-gray-500">
              {records.length} giao dịch &nbsp;·&nbsp; Đang hiển thị {visibleRecords.length} trong viewport
              {records.length > 50 && ' (cuộn để xem thêm)'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
// ───────────────────────────────────────────────────────────────────────────

export function HPSavedView() {
  const savedRecordsStore = useTuitionStore((s) => s.savedRecords);
  const resetRecord = useTuitionStore((s) => s.resetRecord);
  const removeAllSaved = useTuitionStore((s) => s.removeAllSaved);

  const [search, setSearch] = useState('');
  const [activeBank, setActiveBank] = useState<BankTab>('BIDV');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // 1. Bank
  const bankFiltered = useMemo(() => {
    return savedRecordsStore.filter(r => r.bankCode === activeBank);
  }, [savedRecordsStore, activeBank]);

  // 2. Extract years
  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    for (const r of bankFiltered) {
      if (r.normalizedDate && r.normalizedDate.length >= 4) {
        yearSet.add(r.normalizedDate.substring(0, 4));
      }
    }
    return [...yearSet].sort((a, b) => b.localeCompare(a));
  }, [bankFiltered]);

  useEffect(() => {
    if (availableYears.length > 0 && (!selectedYear || !availableYears.includes(selectedYear))) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // 3. Year filter
  const yearFiltered = useMemo(
    () => selectedYear ? bankFiltered.filter((r) => r.normalizedDate.startsWith(selectedYear)) : bankFiltered,
    [bankFiltered, selectedYear]
  );

  // 4. Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return yearFiltered;
    const q = search.trim().toLowerCase();
    return yearFiltered.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.extractedName.toLowerCase().includes(q) ||
        r.confirmedStudent?.hoTen.toLowerCase().includes(q) ||
        r.confirmedStudent?.maHoSo.toLowerCase().includes(q) ||
        r.confirmedStudent?.nganh?.toLowerCase().includes(q)
    );
  }, [yearFiltered, search]);

  const totalAmountFiltered = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);

  // 5. Group by Month
  const months = useMemo(() => groupByMonth(filtered), [filtered]);

  const bankCounts = useMemo(() => {
    return {
      BIDV: savedRecordsStore.filter(r => r.bankCode === 'BIDV').length,
      AGRIBANK: savedRecordsStore.filter(r => r.bankCode === 'AGRIBANK').length,
    };
  }, [savedRecordsStore]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  function handleDownload() {
    const header = ['STT', 'Thời gian', 'Số tiền', 'Nội dung', 'MHS', 'Họ và tên', 'Ngày tháng năm sinh', 'Lớp'];
    const data: any[][] = filtered.map((r, i) => {
      const st = r.confirmedStudent;
      return [
        i + 1,
        r.date,
        r.amount,
        r.description,
        st?.maHoSo ?? '',
        st?.hoTen ?? r.extractedName,
        st?.ngaySinh ?? '',
        st?.nganh ?? '',
      ];
    });
    data.push(['', 'TỔNG CỘNG', totalAmountFiltered, '', '', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 18 }, { wch: 60 },
      { wch: 14 }, { wch: 25 }, { wch: 16 }, { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lưu trữ HP');

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Luu-tru-HP_${activeBank}_${selectedYear}_${dateStr}.xlsx`);
  }

  return (
    <div className="space-y-6">
      {/* Tabs Ngân hàng & Export */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {BANK_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveBank(tab.key); setExpandedMonths(new Set()); }}
              className={clsx(
                'px-5 py-2 text-sm font-medium rounded-lg border transition-colors',
                activeBank === tab.key
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              )}
            >
              {tab.label}
              <span className={clsx(
                'ml-2 px-1.5 py-0.5 text-xs rounded-full font-bold',
                activeBank === tab.key ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                {bankCounts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (confirm('Bạn có chắc chắn muốn XÓA TẤT CẢ giao dịch đã lưu trữ không? (Không thể hoàn tác)')) {
                removeAllSaved();
              }
            }}
            disabled={savedRecordsStore.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Xóa tất cả
          </button>
          <button
            onClick={handleDownload}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Tabs Năm & Tìm kiếm */}
      <div className="flex items-center gap-4 flex-wrap bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        {availableYears.length > 0 && (
          <div className="flex items-center gap-2 mr-4">
            <span className="text-xs font-medium text-gray-500">Năm:</span>
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => { setSelectedYear(year); setExpandedMonths(new Set()); }}
                className={clsx(
                  'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                  selectedYear === year
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {year}
              </button>
            ))}
          </div>
        )}
        
        <div className={clsx("flex items-center gap-2 flex-1 min-w-[250px]", availableYears.length > 0 && "border-l border-gray-200 pl-4")}>
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, MHS, nội dung, lớp..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="text-sm text-gray-600">
          Tổng: <span className="font-semibold text-green-700">{filtered.length}</span> giao dịch
        </div>
      </div>

      {/* Bảng dữ liệu theo Tháng */}
      {months.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">
            {savedRecordsStore.length === 0
              ? 'Chưa có giao dịch nào được lưu trữ. Hãy xác nhận giao dịch ở trang Tổng hợp học phí.'
              : 'Không tìm thấy kết quả phù hợp.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((month) => {
            const isExpanded = expandedMonths.has(month.key);

            return (
              <div key={month.key} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleMonth(month.key)}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded
                      ? <ChevronDown className="w-5 h-5 text-gray-400" />
                      : <ChevronRight className="w-5 h-5 text-gray-400" />
                    }
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-800">{month.label}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {month.count} giao dịch
                    </span>
                  </div>
                  <div className="text-sm font-bold text-green-700 tabular-nums">
                    {formatNumber(month.totalAmount)} đ
                  </div>
                </button>

                {isExpanded && (
                  <VirtualTable records={month.records} onReset={resetRecord} />
                )}
              </div>
            );
          })}

          <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="font-bold text-green-900 uppercase">Tổng cộng {availableYears.length > 0 ? `năm ${selectedYear}` : ''}</span>
            <span className="text-lg font-bold tabular-nums text-green-900">{formatNumber(totalAmountFiltered)} đ</span>
          </div>
        </div>
      )}
    </div>
  );
}
