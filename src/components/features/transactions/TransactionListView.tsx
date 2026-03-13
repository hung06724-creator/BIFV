import clsx from 'clsx';
import { useTransactionList } from './useTransactionList';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable } from './TransactionTable';
import { BulkActions } from './BulkActions';
import type { BankTab } from '@/lib/store';

const BANK_TABS: { key: BankTab; label: string }[] = [
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'Agribank' },
];

export function TransactionListView() {
  const {
    transactions,
    pagination,
    filters,
    selectedIds,
    categories,
    batches,
    loading,
    activeBank,
    setActiveBank,
    bidvCount,
    agribankCount,
    updateFilters,
    resetFilters,
    goToPage,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    bulkAssignCategory,
    bulkChangeReviewStatus,
    bulkConfirm,
  } = useTransactionList();

  const bankCounts: Record<BankTab, number> = { BIDV: bidvCount, AGRIBANK: agribankCount };

  return (
    <div className="space-y-4">
      {/* Bank tabs */}
      <div className="flex gap-2">
        {BANK_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveBank(tab.key)}
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
              activeBank === tab.key
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-500'
            )}>
              {bankCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        <StatBadge label="Tổng" value={pagination.total_items} color="gray" />
        <StatBadge
          label="Chờ phân loại"
          value={transactions.filter((t) => t.status === 'pending_classification').length}
          color="yellow"
        />
        <StatBadge
          label="Đã phân loại"
          value={transactions.filter((t) => t.status === 'classified').length}
          color="blue"
        />
        <StatBadge
          label="Đã xác nhận"
          value={transactions.filter((t) => t.status === 'confirmed').length}
          color="green"
        />
      </div>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        categories={categories}
        batches={batches}
        onFilterChange={updateFilters}
        onReset={resetFilters}
      />

      {/* Table */}
      <TransactionTable
        transactions={transactions}
        pagination={pagination}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onGoToPage={goToPage}
      />

      {/* Bulk Actions (sticky bottom bar) */}
      <BulkActions
        selectedCount={selectedIds.size}
        categories={categories}
        loading={loading}
        onAssignCategory={bulkAssignCategory}
        onChangeReviewStatus={bulkChangeReviewStatus}
        onConfirm={bulkConfirm}
        onClearSelection={clearSelection}
      />
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'gray' | 'yellow' | 'blue' | 'green';
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
  }[color];

  return (
    <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${colorClasses}`}>
      {label}: <span className="font-bold">{value}</span>
    </div>
  );
}
