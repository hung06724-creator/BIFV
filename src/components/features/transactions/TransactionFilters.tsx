import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import type { TransactionFilters as TFilters, CategoryOption, BatchOption } from './types';
import { EMPTY_FILTERS } from './types';

interface TransactionFiltersProps {
  filters: TFilters;
  categories: CategoryOption[];
  batches: BatchOption[];
  onFilterChange: (patch: Partial<TFilters>) => void;
  onReset: () => void;
}

export function TransactionFilters({
  filters,
  categories,
  batches,
  onFilterChange,
  onReset,
}: TransactionFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => val !== '' && val !== EMPTY_FILTERS[key as keyof TFilters]
  ).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Search bar + toggle */}
      <div className="p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mô tả, người chuyển, mã GD..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
            expanded
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          )}
        >
          <Filter className="w-4 h-4" />
          Bộ lọc
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Batch */}
            <FilterSelect
              label="Batch"
              value={filters.batch_id}
              onChange={(v) => onFilterChange({ batch_id: v })}
              options={batches.map((b) => ({ value: b.id, label: b.filename }))}
            />

            {/* Status */}
            <FilterSelect
              label="Trạng thái"
              value={filters.status}
              onChange={(v) => onFilterChange({ status: v as TFilters['status'] })}
              options={[
                { value: 'pending_classification', label: 'Chờ phân loại' },
                { value: 'classified', label: 'Đã phân loại' },
                { value: 'confirmed', label: 'Đã xác nhận' },
                { value: 'exported', label: 'Đã xuất' },
              ]}
            />

            {/* Review Status */}
            <FilterSelect
              label="Trạng thái duyệt"
              value={filters.review_status}
              onChange={(v) => onFilterChange({ review_status: v as TFilters['review_status'] })}
              options={[
                { value: 'pending', label: 'Chờ duyệt' },
                { value: 'approved', label: 'Đã duyệt' },
                { value: 'rejected', label: 'Từ chối' },
              ]}
            />

            {/* Type */}
            <FilterSelect
              label="Loại"
              value={filters.type}
              onChange={(v) => onFilterChange({ type: v as TFilters['type'] })}
              options={[
                { value: 'credit', label: 'Thu (Credit)' },
                { value: 'debit', label: 'Chi (Debit)' },
              ]}
            />

            {/* Suggested Category */}
            <FilterSelect
              label="Gợi ý đầu mục"
              value={filters.suggested_category_id}
              onChange={(v) => onFilterChange({ suggested_category_id: v })}
              options={categories.map((c) => ({ value: c.id, label: `${c.code} – ${c.name}` }))}
            />

            {/* Confirmed Category */}
            <FilterSelect
              label="Đầu mục xác nhận"
              value={filters.confirmed_category_id}
              onChange={(v) => onFilterChange({ confirmed_category_id: v })}
              options={categories.map((c) => ({ value: c.id, label: `${c.code} – ${c.name}` }))}
            />

            {/* Date range */}
            <FilterDate
              label="Từ ngày"
              value={filters.date_from}
              onChange={(v) => onFilterChange({ date_from: v })}
            />
            <FilterDate
              label="Đến ngày"
              value={filters.date_to}
              onChange={(v) => onFilterChange({ date_to: v })}
            />

            {/* Amount range */}
            <FilterNumber
              label="Số tiền từ"
              value={filters.amount_min}
              onChange={(v) => onFilterChange({ amount_min: v })}
              placeholder="0"
            />
            <FilterNumber
              label="Số tiền đến"
              value={filters.amount_max}
              onChange={(v) => onFilterChange({ amount_max: v })}
              placeholder="999,999,999"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Tất cả</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function FilterNumber({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
