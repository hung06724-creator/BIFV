import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Calendar, ChevronDown, ChevronRight, Download, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useAppStore, type BankTab } from '@/lib/store';
import type { TransactionListItem } from '@/components/features/transactions/types';
import { exportTransactionsToExcel } from '@/services/export.service';

const VN = new Intl.NumberFormat('vi-VN');

const BANK_TABS: { key: BankTab; label: string }[] = [
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'AGRIBANK' },
];

function getBankButtonClass(activeBank: BankTab, buttonBank: BankTab) {
  if (activeBank !== buttonBank) {
    return 'btn-neutral';
  }

  return buttonBank === 'AGRIBANK' ? 'border-[var(--agribank)] bg-[var(--agribank)] text-white' : 'btn-primary';
}

function getBankCountBadgeClass(activeBank: BankTab, buttonBank: BankTab) {
  if (activeBank !== buttonBank) {
    return 'bg-[var(--primary-light)] text-[var(--primary)]';
  }

  return buttonBank === 'AGRIBANK' ? 'bg-[var(--agribank-dark)] text-white' : 'bg-white/20 text-white';
}

interface MonthGroup {
  key: string;
  label: string;
  transactions: TransactionListItem[];
  totalCredit: number;
  totalDebit: number;
  count: number;
}

function getConfirmedCategorySummary(transaction: TransactionListItem): string | null {
  if (transaction.status !== 'confirmed' && transaction.status !== 'exported') {
    return null;
  }

  const confirmedNames = Array.from(
    new Set(
      transaction.allocations
        .map((allocation) => allocation.confirmed_category_name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  );

  if (confirmedNames.length > 0) {
    return confirmedNames.join(', ');
  }

  return transaction.match?.confirmed_category_name?.trim() || null;
}

function groupByMonth(transactions: TransactionListItem[]): MonthGroup[] {
  const map = new Map<string, TransactionListItem[]>();

  for (const transaction of transactions) {
    const monthKey = transaction.normalized_date.substring(0, 7);
    if (!monthKey || monthKey.length < 7) continue;

    const current = map.get(monthKey) || [];
    current.push(transaction);
    map.set(monthKey, current);
  }

  const sortedMonths = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return sortedMonths.map(([key, monthTransactions]) => {
    const [year, month] = key.split('-');

    return {
      key,
      label: `Tháng ${month}/${year}`,
      transactions: [...monthTransactions].sort((a, b) => {
        const normalizedCompare = a.normalized_date.localeCompare(b.normalized_date);
        if (normalizedCompare !== 0) return normalizedCompare;
        return a.raw_date.localeCompare(b.raw_date);
      }),
      totalCredit: monthTransactions
        .filter((transaction) => transaction.type === 'credit')
        .reduce((sum, transaction) => sum + transaction.normalized_amount, 0),
      totalDebit: monthTransactions
        .filter((transaction) => transaction.type === 'debit')
        .reduce((sum, transaction) => sum + transaction.normalized_amount, 0),
      count: monthTransactions.length,
    };
  });
}

const HIST_ROW_H = 56;
const HIST_H = 520;
const HIST_OVSC = 6;

interface VirtualHistoryTableProps {
  transactions: TransactionListItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

function VirtualHistoryTable({
  transactions,
  selectedIds,
  onToggle,
  onToggleAll,
  allSelected,
  someSelected,
}: VirtualHistoryTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef<number | null>(null);

  const onScroll = useCallback(() => {
    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
    });
  }, []);

  const startIdx = Math.max(0, Math.floor(scrollTop / HIST_ROW_H) - HIST_OVSC);
  const endIdx = Math.min(
    transactions.length - 1,
    Math.ceil((scrollTop + HIST_H) / HIST_ROW_H) + HIST_OVSC
  );
  const visible = transactions.slice(startIdx, endIdx + 1);
  const paddingTop = startIdx * HIST_ROW_H;
  const paddingBottom = Math.max(0, (transactions.length - endIdx - 1) * HIST_ROW_H);
  const clampTwoLinesStyle = {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical' as const,
    WebkitLineClamp: 2,
    overflow: 'hidden',
  };

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ height: HIST_H, overflowY: 'auto', overflowX: 'auto' }}
      className="border-t border-gray-100"
    >
      <table className="min-w-full divide-y divide-gray-200 text-sm" style={{ tableLayout: 'fixed', minWidth: 880 }}>
        <colgroup>
          <col style={{ width: 40 }} />
          <col style={{ width: 36 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 130 }} />
          <col style={{ width: 130 }} />
          <col style={{ width: 210 }} />
          <col />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            <th className="w-10 bg-gray-50 px-4 py-2.5 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={onToggleAll}
                className="h-3.5 w-3.5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
            </th>
            <th className="bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">#</th>
            <th className="bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Thời gian</th>
            <th className="bg-gray-50 px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500">Tiền ra</th>
            <th className="bg-gray-50 px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500">Tiền vào</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Danh mục</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Nội dung</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paddingTop > 0 && (
            <tr style={{ height: paddingTop }}>
              <td colSpan={7} />
            </tr>
          )}

          {visible.map((transaction, relativeIndex) => {
            const index = startIdx + relativeIndex;
            const confirmedCategory = getConfirmedCategorySummary(transaction);

            return (
              <tr
                key={transaction.id}
                style={{ height: HIST_ROW_H }}
                className={clsx('hover:bg-gray-50', selectedIds.has(transaction.id) && 'bg-red-50/50')}
              >
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(transaction.id)}
                    onChange={() => onToggle(transaction.id)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-400">
                  {index + 1}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                  {transaction.raw_date}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {transaction.debit_amount > 0 ? (
                    <span className="font-medium text-red-600">{VN.format(transaction.debit_amount)}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {transaction.credit_amount > 0 ? (
                    <span className="font-medium text-green-600">{VN.format(transaction.credit_amount)}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-gray-700" title={confirmedCategory || undefined}>
                  {confirmedCategory ? (
                    <span className="font-medium leading-5 text-[var(--primary)]" style={clampTwoLinesStyle}>
                      {confirmedCategory}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs leading-5 text-gray-700" title={transaction.raw_desc}>
                  <span style={clampTwoLinesStyle}>{transaction.raw_desc}</span>
                </td>
              </tr>
            );
          })}

          {paddingBottom > 0 && (
            <tr style={{ height: paddingBottom }}>
              <td colSpan={7} />
            </tr>
          )}
        </tbody>
        <tfoot className="sticky bottom-0 border-t border-gray-200 bg-gray-50">
          <tr>
            <td colSpan={7} className="px-4 py-1.5 text-xs text-gray-400">
              {transactions.length} giao dịch
              {transactions.length > 50 && ` · hiển thị ${visible.length} trong viewport (cuộn để xem thêm)`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function TransactionHistory() {
  const bidv = useAppStore((state) => state.bidvTransactions);
  const agri = useAppStore((state) => state.agribankTransactions);
  const categories = useAppStore((state) => state.categories);
  const deleteTransactions = useAppStore((state) => state.deleteTransactions);
  const [activeBank, setActiveBank] = useState<BankTab>('BIDV');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');

  const transactions = activeBank === 'BIDV' ? bidv : agri;

  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    for (const transaction of transactions) {
      const year = transaction.normalized_date.substring(0, 4);
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
    () =>
      selectedYear
        ? transactions.filter((transaction) => transaction.normalized_date.startsWith(selectedYear))
        : transactions,
    [transactions, selectedYear]
  );

  const months = useMemo(() => groupByMonth(yearFiltered), [yearFiltered]);

  useEffect(() => {
    if (!selectedMonthKey) return;
    if (!months.some((month) => month.key === selectedMonthKey)) {
      setSelectedMonthKey(null);
    }
  }, [months, selectedMonthKey]);

  const toggleMonth = (key: string) => {
    const isExpanded = expandedMonths.has(key);

    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (isExpanded) next.delete(key);
      else next.add(key);
      return next;
    });

    if (isExpanded) {
      setSelectedMonthKey((current) => (current === key ? null : current));
    } else {
      setSelectedMonthKey(key);
    }
  };

  const exportTransactions = useMemo(() => {
    if (!selectedMonthKey) return yearFiltered;
    return months.find((month) => month.key === selectedMonthKey)?.transactions || yearFiltered;
  }, [months, selectedMonthKey, yearFiltered]);

  const exportLabel = selectedMonthKey
    ? `Xuất Excel tháng ${selectedMonthKey.slice(5, 7)}/${selectedMonthKey.slice(0, 4)}`
    : `Xuất Excel năm ${selectedYear || ''}`.trim();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMonthAll = (month: MonthGroup) => {
    const monthIds = month.transactions.map((transaction) => transaction.id);
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
      <div className="flex gap-2">
        {BANK_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveBank(tab.key);
              setExpandedMonths(new Set());
              setSelectedMonthKey(null);
              setSelectedIds(new Set());
            }}
            className={clsx(
              'btn btn-md',
              getBankButtonClass(activeBank, tab.key)
            )}
          >
            {tab.label}
            <span
              className={clsx(
                'ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold',
                getBankCountBadgeClass(activeBank, tab.key)
              )}
            >
              {bankCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {availableYears.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Năm:</span>
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => {
                setSelectedYear(year);
                setExpandedMonths(new Set());
                setSelectedMonthKey(null);
                setSelectedIds(new Set());
              }}
              className={clsx(
                'btn btn-md',
                selectedYear === year
                  ? 'btn-primary'
                  : 'btn-neutral'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => exportTransactionsToExcel(exportTransactions, categories, activeBank)}
          disabled={exportTransactions.length === 0}
          className="btn btn-sm btn-secondary"
        >
          <Download className="h-3.5 w-3.5" />
          {exportLabel}
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-red-700">Đã chọn {selectedIds.size} giao dịch</span>

          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="btn btn-sm btn-danger"
            >
              <Trash2 className="h-3 w-3" />
              Xóa
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">Xác nhận xóa?</span>
              <button
                onClick={handleDelete}
                className="btn btn-sm btn-danger"
              >
                Xóa {selectedIds.size} giao dịch
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="btn btn-sm btn-neutral"
              >
                Hủy
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setSelectedIds(new Set());
              setConfirmingDelete(false);
            }}
            className="btn btn-sm btn-ghost ml-auto text-[var(--danger)]"
          >
            Bỏ chọn tất cả
          </button>
        </div>
      )}

      {months.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-400">Chưa có dữ liệu {activeBank}. Hãy nhập sổ phụ trước.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((month) => {
            const isExpanded = expandedMonths.has(month.key);
            const isSelectedMonth = selectedMonthKey === month.key;
            const monthIds = month.transactions.map((transaction) => transaction.id);
            const selectedInMonth = monthIds.filter((id) => selectedIds.has(id)).length;
            const allMonthSelected = selectedInMonth === monthIds.length;

            return (
              <div
                key={month.key}
                className={clsx(
                  'overflow-hidden rounded-xl border bg-white shadow-sm',
                  isSelectedMonth ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'
                )}
              >
                <div className="flex items-center transition-colors hover:bg-gray-50">
                  <div className="flex items-center pl-4">
                    <input
                      type="checkbox"
                      checked={allMonthSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedInMonth > 0 && !allMonthSelected;
                      }}
                      onChange={() => toggleMonthAll(month)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    onClick={() => toggleMonth(month.key)}
                    className={clsx(
                      'flex flex-1 items-center justify-between px-3 py-4',
                      isSelectedMonth && 'bg-indigo-50/60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-semibold text-gray-800">{month.label}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                        {month.count} giao dịch
                      </span>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        <span className="font-mono font-semibold text-green-600">{VN.format(month.totalCredit)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        <span className="font-mono font-semibold text-red-600">{VN.format(month.totalDebit)}</span>
                      </div>
                      <div className="text-xs font-bold text-gray-700">
                        Ròng:{' '}
                        <span className={month.totalCredit - month.totalDebit >= 0 ? 'text-green-600' : 'text-red-600'}>
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
