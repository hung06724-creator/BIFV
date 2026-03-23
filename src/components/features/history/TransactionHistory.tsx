import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Calendar, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { useAppStore, type BankTab } from '@/lib/store';
import type { TransactionListItem } from '@/components/features/transactions/types';

const VN = new Intl.NumberFormat('vi-VN');

const BANK_TABS: { key: BankTab; label: string }[] = [
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'Agribank' },
];

interface MonthGroup {
  key: string;       // "2026-03"
  label: string;     // "Tháng 03/2026"
  transactions: TransactionListItem[];
  totalCredit: number;
  totalDebit: number;
  count: number;
}

function groupByMonth(transactions: TransactionListItem[]): MonthGroup[] {
  const map = new Map<string, TransactionListItem[]>();

  for (const t of transactions) {
    // normalized_date = "YYYY-MM-DD"
    const monthKey = t.normalized_date.substring(0, 7); // "YYYY-MM"
    if (!monthKey || monthKey.length < 7) continue;
    const arr = map.get(monthKey) || [];
    arr.push(t);
    map.set(monthKey, arr);
  }

  // Sort months descending (newest first)
  const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return sorted.map(([key, txns]) => {
    const [year, month] = key.split('-');
    return {
      key,
      label: `Tháng ${month}/${year}`,
      transactions: txns.sort((a, b) => b.raw_date.localeCompare(a.raw_date)),
      totalCredit: txns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.normalized_amount, 0),
      totalDebit: txns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.normalized_amount, 0),
      count: txns.length,
    };
  });
}

// ─── Virtual scroll for history table ─────────────────────────────────
const HIST_ROW_H  = 40;
const HIST_H      = 520;
const HIST_OVSC   = 6;

interface VirtualHistoryTableProps {
  transactions: TransactionListItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

function VirtualHistoryTable({ transactions, selectedIds, onToggle, onToggleAll, allSelected, someSelected }: VirtualHistoryTableProps) {
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

  const startIdx = Math.max(0, Math.floor(scrollTop / HIST_ROW_H) - HIST_OVSC);
  const endIdx   = Math.min(
    transactions.length - 1,
    Math.ceil((scrollTop + HIST_H) / HIST_ROW_H) + HIST_OVSC,
  );
  const visible      = transactions.slice(startIdx, endIdx + 1);
  const paddingTop    = startIdx * HIST_ROW_H;
  const paddingBottom = Math.max(0, (transactions.length - endIdx - 1) * HIST_ROW_H);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ height: HIST_H, overflowY: 'auto', overflowX: 'auto' }}
      className="border-t border-gray-100"
    >
      <table className="min-w-full divide-y divide-gray-200 text-sm" style={{ tableLayout: 'fixed', minWidth: 700 }}>
        <colgroup>
          <col style={{ width: 40 }} />
          <col style={{ width: 36 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 130 }} />
          <col style={{ width: 130 }} />
          <col />
        </colgroup>
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="w-10 px-4 py-2.5 text-center">
              <input type="checkbox" checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={onToggleAll}
                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Tiền ra</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Tiền vào</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nội dung</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paddingTop > 0 && <tr style={{ height: paddingTop }}><td colSpan={6} /></tr>}
          {visible.map((t, relIdx) => {
            const idx = startIdx + relIdx;
            return (
              <tr key={t.id} style={{ height: HIST_ROW_H }}
                className={clsx('hover:bg-gray-50', selectedIds.has(t.id) && 'bg-red-50/50')}>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => onToggle(t.id)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                </td>
                <td className="px-4 py-2 text-xs text-gray-400 font-mono">{idx + 1}</td>
                <td className="px-4 py-2 text-xs text-gray-700 whitespace-nowrap">{t.raw_date}</td>
                <td className="px-4 py-2 text-xs text-right font-mono">
                  {t.debit_amount > 0
                    ? <span className="text-red-600 font-medium">{VN.format(t.debit_amount)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2 text-xs text-right font-mono">
                  {t.credit_amount > 0
                    ? <span className="text-green-600 font-medium">{VN.format(t.credit_amount)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2 text-xs text-gray-700 truncate" title={t.raw_desc}>{t.raw_desc}</td>
              </tr>
            );
          })}
          {paddingBottom > 0 && <tr style={{ height: paddingBottom }}><td colSpan={6} /></tr>}
        </tbody>
        <tfoot className="sticky bottom-0 bg-gray-50 border-t border-gray-200">
          <tr>
            <td colSpan={6} className="px-4 py-1.5 text-xs text-gray-400">
              {transactions.length} giao dịch
              {transactions.length > 50 && ` · hiển thị ${visible.length} trong viewport (cuộn để xem thêm)`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
// ───────────────────────────────────────────────────────────────

export function TransactionHistory() {
  const bidv = useAppStore((s) => s.bidvTransactions);
  const agri = useAppStore((s) => s.agribankTransactions);
  const deleteTransactions = useAppStore((s) => s.deleteTransactions);
  const [activeBank, setActiveBank] = useState<BankTab>('BIDV');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');

  const transactions = activeBank === 'BIDV' ? bidv : agri;

  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    for (const t of transactions) {
      const year = t.normalized_date.substring(0, 4);
      if (year.length === 4) yearSet.add(year);
    }
    return [...yearSet].sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  useEffect(() => {
    if (availableYears.length > 0 && (!selectedYear || !availableYears.includes(selectedYear))) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const yearFiltered = useMemo(
    () => selectedYear ? transactions.filter((t) => t.normalized_date.startsWith(selectedYear)) : transactions,
    [transactions, selectedYear]
  );
  const months = useMemo(() => groupByMonth(yearFiltered), [yearFiltered]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMonthAll = (month: MonthGroup) => {
    const monthIds = month.transactions.map((t) => t.id);
    const allSelected = monthIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of monthIds) next.delete(id);
      } else {
        for (const id of monthIds) next.add(id);
      }
      return next;
    });
  };

  const handleDelete = () => {
    deleteTransactions(activeBank, selectedIds);
    setSelectedIds(new Set());
    setConfirmingDelete(false);
  };

  const bankCounts = { BIDV: bidv.length, AGRIBANK: agri.length };

  return (
    <div className="space-y-4">
      {/* Bank tabs */}
      <div className="flex gap-2">
        {BANK_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveBank(tab.key); setExpandedMonths(new Set()); setSelectedIds(new Set()); }}
            className={clsx(
              'px-5 py-2 text-sm font-medium rounded-lg border transition-colors',
              activeBank === tab.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            {tab.label}
            <span className={clsx(
              'ml-2 px-1.5 py-0.5 text-xs rounded-full font-bold',
              activeBank === tab.key ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
            )}>
              {bankCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Year tabs */}
      {availableYears.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Năm:</span>
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => { setSelectedYear(year); setExpandedMonths(new Set()); setSelectedIds(new Set()); }}
              className={clsx(
                'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                selectedYear === year
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-red-700">
            Đã chọn {selectedIds.size} giao dịch
          </span>
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
              Xóa
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">Xác nhận xóa?</span>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Xóa {selectedIds.size} giao dịch
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          )}
          <button
            onClick={() => { setSelectedIds(new Set()); setConfirmingDelete(false); }}
            className="ml-auto text-xs text-red-500 hover:text-red-700"
          >
            Bỏ chọn tất cả
          </button>
        </div>
      )}

      {months.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">Chưa có dữ liệu {activeBank}. Hãy nhập sổ phụ trước.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((month) => {
            const isExpanded = expandedMonths.has(month.key);
            const monthIds = month.transactions.map((t) => t.id);
            const selectedInMonth = monthIds.filter((id) => selectedIds.has(id)).length;
            const allMonthSelected = selectedInMonth === monthIds.length;

            return (
              <div key={month.key} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Month header */}
                <div className="flex items-center hover:bg-gray-50 transition-colors">
                  <div className="flex items-center pl-4">
                    <input
                      type="checkbox"
                      checked={allMonthSelected}
                      ref={(el) => { if (el) el.indeterminate = selectedInMonth > 0 && !allMonthSelected; }}
                      onChange={() => toggleMonthAll(month)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => toggleMonth(month.key)}
                    className="flex-1 px-3 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded
                        ? <ChevronDown className="w-5 h-5 text-gray-400" />
                        : <ChevronRight className="w-5 h-5 text-gray-400" />
                      }
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-semibold text-gray-800">{month.label}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {month.count} giao dịch
                      </span>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                        <span className="font-mono font-semibold text-green-600">{VN.format(month.totalCredit)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-mono font-semibold text-red-600">{VN.format(month.totalDebit)}</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-gray-700">
                        Ròng: <span className={month.totalCredit - month.totalDebit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {VN.format(month.totalCredit - month.totalDebit)}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                {isExpanded && (
                  <VirtualHistoryTable
                    transactions={month.transactions}
                    selectedIds={selectedIds}
                    onToggle={toggleSelect}
                    onToggleAll={() => toggleMonthAll(month)}
                    allSelected={allMonthSelected}
                    someSelected={selectedInMonth > 0 && !allMonthSelected}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
