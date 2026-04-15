import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import type { TransactionFilters as TFilters, CategoryOption } from './types';
import { EMPTY_FILTERS } from './types';

interface TransactionFiltersProps {
  filters: TFilters;
  categories: CategoryOption[];
  onFilterChange: (patch: Partial<TFilters>) => void;
  onReset: () => void;
}

export function TransactionFilters({
  filters,
  categories,
  onFilterChange,
  onReset,
}: TransactionFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => val !== EMPTY_FILTERS[key as keyof TFilters]
  ).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
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
          onClick={() => setExpanded((prev) => !prev)}
          className={clsx(
            'btn btn-md',
            expanded
              ? 'btn-secondary'
              : 'btn-neutral'
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
            className="btn btn-md btn-danger"
          >
            <X className="w-3.5 h-3.5" />
            Xóa lọc
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FilterSelect
              label="Trạng thái"
              value={filters.status}
              onChange={(v) => onFilterChange({ status: v as TFilters['status'] })}
              options={[
                { value: 'pending_classification', label: 'Chờ phân loại' },
                { value: 'classified', label: 'Đã phân loại' },
                { value: 'confirmed', label: 'Đã xác nhận' },
                { value: 'exported', label: 'Đã xuất' },
                { value: 'matched', label: 'Đã khớp' },
                { value: 'mismatched', label: 'Sai sót' },
              ]}
            />

            <SearchableCategoryFilter
              label="Gợi ý danh mục"
              value={filters.suggested_category_id}
              onChange={(v) => onFilterChange({ suggested_category_id: v })}
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
                code: category.code,
              }))}
            />

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

function SearchableCategoryFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; code?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value) ?? null;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    const startsWith: typeof options = [];
    const contains: typeof options = [];

    for (const option of options) {
      const labelValue = option.label.toLowerCase();
      const codeValue = option.code?.toLowerCase() ?? '';

      if (labelValue.startsWith(normalizedQuery) || codeValue.startsWith(normalizedQuery)) {
        startsWith.push(option);
      } else if (labelValue.includes(normalizedQuery) || codeValue.includes(normalizedQuery)) {
        contains.push(option);
      }
    }

    return [...startsWith, ...contains];
  }, [options, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, filteredOptions.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-category-filter-item]');
    items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, open]);

  const displayValue = open ? query : selectedOption?.label ?? '';
  const totalItemCount = filteredOptions.length + 1;

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        setOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, totalItemCount - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (highlightIndex === 0) {
        selectValue('');
        return;
      }

      const highlightedOption = filteredOptions[highlightIndex - 1];
      if (highlightedOption) {
        selectValue(highlightedOption.value);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={displayValue}
          placeholder="Tất cả hoặc gõ để tìm..."
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {value && (
          <button
            type="button"
            onClick={() => selectValue('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Xóa lọc danh mục"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {open && (
          <div
            ref={listRef}
            className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <button
              type="button"
              data-category-filter-item
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectValue('')}
              className={clsx(
                'w-full border-b border-gray-100 px-3 py-2 text-left text-sm transition-colors',
                highlightIndex === 0
                  ? 'bg-indigo-50 font-medium text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              Tất cả
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">Không tìm thấy danh mục</div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  data-category-filter-item
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectValue(option.value)}
                  className={clsx(
                    'w-full border-b border-gray-50 px-3 py-2 text-left transition-colors last:border-b-0',
                    highlightIndex === index + 1
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-50',
                    value === option.value && highlightIndex !== index + 1 && 'bg-indigo-50/60'
                  )}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
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
