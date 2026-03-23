import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import clsx from 'clsx';
import { Brain, Split, ChevronDown, ChevronRight, Calendar, TrendingUp, TrendingDown, FileUp, Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTransactionList } from './useTransactionList';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable } from './TransactionTable';
import type { TransactionListItem } from './types';
import type { BankTab } from '@/lib/store';
import { useImportClassified } from '@/components/features/imports/useImportClassified';
import { exportTransactionsToExcel } from '@/services/export.service';

const VN = new Intl.NumberFormat('vi-VN');

const BANK_TABS: { key: BankTab; label: string }[] = [
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'Agribank' },
];

interface MonthGroup {
  key: string;
  label: string;
  transactions: TransactionListItem[];
  totalCredit: number;
  totalDebit: number;
  count: number;
}

function groupByMonth(transactions: TransactionListItem[]): MonthGroup[] {
  const map = new Map<string, TransactionListItem[]>();

  for (const t of transactions) {
    const monthKey = t.normalized_date.substring(0, 7);
    if (!monthKey || monthKey.length < 7) continue;
    const arr = map.get(monthKey) || [];
    arr.push(t);
    map.set(monthKey, arr);
  }

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

export function TransactionListView() {
  const {
    allTransactions,
    filteredTransactions,
    pagination,
    filters,
    categories,
    activeBank,
    setActiveBank,
    bidvCount,
    agribankCount,
    updateFilters,
    resetFilters,
    goToPage,
    updateCategory,
    confirmTransaction,
    updateSplitMode,
    reclassify,
  } = useTransactionList();
  const [searchParams] = useSearchParams();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const classifiedInputRef = useRef<HTMLInputElement>(null);
  const { loading: classifiedLoading, error: classifiedError, importedCount, importFile } = useImportClassified();

  useEffect(() => {
    const batch = searchParams.get('batch');
    if (batch && filters.batch_id !== batch) {
      updateFilters({ batch_id: batch });
    }
  }, [searchParams, filters.batch_id, updateFilters]);

  // Extract available years and auto-select the latest
  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    for (const t of filteredTransactions) {
      const year = t.normalized_date.substring(0, 4);
      if (year.length === 4) yearSet.add(year);
    }
    return [...yearSet].sort((a, b) => b.localeCompare(a));
  }, [filteredTransactions]);

  useEffect(() => {
    if (availableYears.length > 0 && (!selectedYear || !availableYears.includes(selectedYear))) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Filter transactions by selected year, then group by month
  const yearFilteredTransactions = useMemo(
    () => selectedYear ? filteredTransactions.filter((t) => t.normalized_date.startsWith(selectedYear)) : filteredTransactions,
    [filteredTransactions, selectedYear]
  );

  const months = useMemo(() => groupByMonth(yearFilteredTransactions), [yearFilteredTransactions]);

  // Auto-expand if only one month
  useEffect(() => {
    if (months.length === 1) {
      setExpandedMonths(new Set([months[0].key]));
    }
  }, [months]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const bankCounts: Record<BankTab, number> = { BIDV: bidvCount, AGRIBANK: agribankCount };

  // Stat counts scoped to selected year
  const yearTransactions = useMemo(
    () => selectedYear ? allTransactions.filter((t) => t.normalized_date.startsWith(selectedYear)) : allTransactions,
    [allTransactions, selectedYear]
  );
  const pendingCount = yearTransactions.filter((t) => t.status === 'pending_classification').length;
  const classifiedCount = yearTransactions.filter((t) => t.status === 'classified').length;
  const horizontalCount = yearTransactions.filter((t) => t.split_mode === 'horizontal').length;
  const verticalCount = yearTransactions.filter((t) => t.split_mode === 'vertical').length;
  const splitReviewCount = yearTransactions.filter((t) => t.split_mode !== 'direct').length;

  type BadgeFilter = { status?: string; split_mode?: string; needs_review?: boolean };

  const handleBadgeClick = (badge: BadgeFilter) => {
    // Toggle: if already active, clear
    const isStatusActive = badge.status && filters.status === badge.status;
    const isSplitActive = badge.split_mode && filters.split_mode === badge.split_mode;
    const isReviewActive = Boolean(badge.needs_review && filters.needs_review);

    if (badge.status) {
      updateFilters({ status: isStatusActive ? '' : badge.status as any, split_mode: '', needs_review: false });
    } else if (badge.split_mode) {
      updateFilters({ split_mode: isSplitActive ? '' : badge.split_mode as any, status: '', needs_review: false });
    } else if (badge.needs_review) {
      updateFilters({ needs_review: !isReviewActive, status: '', split_mode: '' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {BANK_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveBank(tab.key)}
            className={clsx(
              'rounded-lg border px-5 py-2 text-sm font-medium transition-colors',
              activeBank === tab.key
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            {tab.label}
            <span
              className={clsx(
                'ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold',
                activeBank === tab.key ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
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
              onClick={() => { setSelectedYear(year); setExpandedMonths(new Set()); }}
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

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <StatBadge label="Tổng" value={yearTransactions.length} color="gray" />
        <StatBadge
          label="Chờ phân loại"
          value={pendingCount}
          color="yellow"
          active={filters.status === 'pending_classification'}
          onClick={() => handleBadgeClick({ status: 'pending_classification' })}
        />
        <StatBadge
          label="Đã phân loại"
          value={classifiedCount}
          color="blue"
          active={filters.status === 'classified'}
          onClick={() => handleBadgeClick({ status: 'classified' })}
        />
        <StatBadge
          label="Ngang"
          value={horizontalCount}
          color="blue"
          icon={Split}
          active={filters.split_mode === 'horizontal'}
          onClick={() => handleBadgeClick({ split_mode: 'horizontal' })}
        />
        <StatBadge
          label="Dọc"
          value={verticalCount}
          color="yellow"
          icon={Split}
          active={filters.split_mode === 'vertical'}
          onClick={() => handleBadgeClick({ split_mode: 'vertical' })}
        />
        <StatBadge
          label="Cần xem phân bổ"
          value={splitReviewCount}
          color="red"
          icon={Split}
          active={filters.needs_review}
          onClick={() => handleBadgeClick({ needs_review: true })}
        />
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={classifiedInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                importFile(file, activeBank);
                e.target.value = '';
              }
            }}
          />
          <button
            onClick={() => classifiedInputRef.current?.click()}
            disabled={classifiedLoading}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
          >
            <FileUp className="h-3.5 w-3.5" />
            {classifiedLoading ? 'Đang import...' : 'Nhập dữ liệu đã phân loại'}
          </button>
          <button
            onClick={() => exportTransactionsToExcel(yearFilteredTransactions, categories, activeBank)}
            disabled={yearFilteredTransactions.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất Excel
          </button>
          <button
            onClick={reclassify}
            className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
          >
            <Brain className="h-3.5 w-3.5" />
            Phân loại tự động
          </button>
        </div>
        {classifiedError && (
          <div className="w-full text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            Lỗi: {classifiedError}
          </div>
        )}
        {importedCount !== null && !classifiedError && (
          <div className="w-full text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            Đã import thành công {importedCount} giao dịch đã phân loại.
          </div>
        )}
      </div>

      <TransactionFilters
        filters={filters}
        categories={categories}
        onFilterChange={updateFilters}
        onReset={resetFilters}
      />

      {months.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">Không có giao dịch nào khớp bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((month) => {
            const isExpanded = expandedMonths.has(month.key);
            const monthPaged = month.transactions;

            return (
              <div key={month.key} className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <button
                  onClick={() => toggleMonth(month.key)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
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

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                      <TransactionTable
                        transactions={monthPaged}
                        pagination={{
                          page: 1,
                          page_size: monthPaged.length,
                          total_items: monthPaged.length,
                          total_pages: 1,
                        }}
                        categories={categories}
                        onUpdateCategory={updateCategory}
                        onConfirmTransaction={confirmTransaction}
                        onUpdateSplitMode={updateSplitMode}
                        onGoToPage={() => {}}
                        isInsideScrollContext={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: 'gray' | 'yellow' | 'blue' | 'green' | 'red';
  icon?: ComponentType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  }[color];

  const activeRing = active ? 'ring-2 ring-indigo-500 ring-offset-1' : '';
  const clickable = onClick ? 'cursor-pointer hover:opacity-80' : '';

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${colorClasses} ${activeRing} ${clickable}`}
      onClick={onClick}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
