import { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { Search } from 'lucide-react';

export interface CategoryOption {
  id: string;
  code: string;
  name: string;
  group?: string;
  ledger_account?: string;
}

// Global frequency map persisted across renders
export const categoryFrequency: Record<string, number> = {};

export function recordCategoryUsage(categoryId: string) {
  categoryFrequency[categoryId] = (categoryFrequency[categoryId] || 0) + 1;
}

export function InlineCategorySearch({
  currentName,
  currentCode,
  categories,
  onSelect,
  transactionId,
  shouldAutoActivate,
  onAutoActivated,
  containerClassName = '',
  forceUpward = false,
}: {
  currentName: string | null;
  currentCode: string | null;
  categories: CategoryOption[];
  onSelect: (categoryId: string) => void;
  transactionId?: string;
  shouldAutoActivate?: boolean;
  onAutoActivated?: () => void;
  containerClassName?: string;
  forceUpward?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sorted = useMemo(() => {
    const q = query.toLowerCase();

    if (!q) {
      return [...categories].sort((a, b) => (categoryFrequency[b.id] || 0) - (categoryFrequency[a.id] || 0));
    }

    const startsWith: CategoryOption[] = [];
    const contains: CategoryOption[] = [];

    for (const c of categories) {
      const name = c.name.toLowerCase();
      const code = c.code.toLowerCase();
      if (name.startsWith(q) || code.startsWith(q)) {
        startsWith.push(c);
      } else if (name.includes(q) || code.includes(q)) {
        contains.push(c);
      }
    }

    startsWith.sort((a, b) => (categoryFrequency[b.id] || 0) - (categoryFrequency[a.id] || 0));
    contains.sort((a, b) => (categoryFrequency[b.id] || 0) - (categoryFrequency[a.id] || 0));

    return [...startsWith, ...contains];
  }, [categories, query]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [sorted.length, query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-cat-item]');
    items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  useEffect(() => {
    if (!shouldAutoActivate || !inputRef.current) return;

    inputRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
      setOpen(true);
      setQuery('');
      setHighlightIndex(0);
      onAutoActivated?.();
    });
  }, [shouldAutoActivate, onAutoActivated]);

  useEffect(() => {
    if (forceUpward) {
      setOpenUpward(true);
      return;
    }
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 220);
    }
  }, [open, forceUpward]);

  const focusNextRow = () => {
    // Only applies inside tables that support it (like TransactionTable)
    if (!inputRef.current || !transactionId) return;
    const tableEl = inputRef.current.closest('[data-table-id]');
    const tableId = tableEl?.getAttribute('data-table-id');
    if (!tableId) return;

    window.setTimeout(() => {
      const freshTable = document.querySelector(`[data-table-id="${tableId}"]`);
      if (!freshTable) return;
      const inputs = Array.from(
        freshTable.querySelectorAll<HTMLInputElement>('[data-cat-input="true"]')
      );
      const currentIndex = inputs.findIndex(
        (input) => input.getAttribute('data-transaction-id') === transactionId
      );
      const next = currentIndex >= 0 ? inputs[currentIndex + 1] : null;
      if (next) {
        const nextTransactionId = next.getAttribute('data-transaction-id');
        if (nextTransactionId) {
          next.dispatchEvent(
            new CustomEvent('category-autofocus', {
              bubbles: true,
              detail: { transactionId: nextTransactionId },
            })
          );
        }
      }
    }, 30);
  };

  const selectItem = (cat: CategoryOption) => {
    recordCategoryUsage(cat.id);
    onSelect(cat.id);
    setOpen(false);
    setQuery('');
    focusNextRow();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < sorted.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (sorted[highlightIndex]) {
        selectItem(sorted[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const displayValue = open ? query : currentName || '';

  return (
    <div ref={ref} className={clsx("relative", containerClassName)}>
      <div className="relative h-full">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          data-cat-input="true"
          data-transaction-id={transactionId}
          type="text"
          value={displayValue}
          placeholder="Chọn hoặc tìm danh mục..."
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={clsx(
            'w-full h-full rounded-md border py-1.5 pl-8 pr-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
            currentName ? 'border-indigo-200 bg-indigo-50/50 text-indigo-700 font-medium' : 'border-gray-200 text-gray-600'
          )}
          title={currentName || ''}
        />
      </div>
      {open && (
        <div
          ref={listRef}
          className={clsx(
            'absolute left-0 z-50 max-h-48 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl',
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {sorted.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">Không tìm thấy</div>
          ) : (
            sorted.map((cat, idx) => (
              <button
                key={cat.id}
                data-cat-item
                onClick={() => selectItem(cat)}
                className={clsx(
                  'w-full border-b border-gray-50 px-3 py-2 text-left text-xs transition-colors last:border-0',
                  idx === highlightIndex
                    ? 'bg-indigo-100 text-indigo-800 font-semibold'
                    : 'hover:bg-indigo-50 hover:text-indigo-700',
                  currentCode === cat.code && idx !== highlightIndex && 'bg-indigo-50 font-medium text-indigo-700'
                )}
              >
                <div className="font-medium">{cat.name}</div>
                {(categoryFrequency[cat.id] || 0) > 0 && (
                  <div className="text-[10px] text-gray-400 mt-0.5">Sử dụng: {categoryFrequency[cat.id]} lần</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
