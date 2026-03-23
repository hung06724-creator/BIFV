import { useState, useRef, useEffect, useMemo, useId, useCallback } from 'react';
import { Check, FileOutput, Clock, HelpCircle, Search, ArrowRight, X, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { TransactionListItem, Pagination, CategoryOption } from './types';
import { TransactionDetailView } from './detail/TransactionDetailView';
import { InlineCategorySearch, categoryFrequency, recordCategoryUsage } from '@/components/shared/InlineCategorySearch';

interface TransactionTableProps {
  transactions: TransactionListItem[];
  pagination: Pagination;
  categories: CategoryOption[];
  onUpdateCategory: (transactionId: string, categoryId: string) => void;
  onConfirmTransaction?: (transactionId: string) => void;
  onUpdateSplitMode: (transactionId: string, splitMode: TransactionListItem['split_mode']) => void;
  onGoToPage: (page: number) => void;
  onDeleteTransactions?: (ids: Set<string>) => void;
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

function formatAmount(amount: number): string {
  return VN_NUMBER.format(amount);
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold',
        pct >= 85 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
      )}
    >
      {pct}%
    </span>
  );
}

function StatusBadge({ status }: { status: TransactionListItem['status'] }) {
  const config = {
    pending_classification: { label: 'Chờ phân loại', icon: Clock, cls: 'bg-gray-100 text-gray-600' },
    classified: { label: 'Đã phân loại', icon: HelpCircle, cls: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'Đã xác nhận', icon: Check, cls: 'bg-green-100 text-green-700' },
    exported: { label: 'Đã xuất', icon: FileOutput, cls: 'bg-purple-100 text-purple-700' },
    matched: { label: 'Đã khớp', icon: CheckCircle2, cls: 'bg-green-100 text-green-700' },
    mismatched: { label: 'Sai sót', icon: AlertCircle, cls: 'bg-red-100 text-red-600' },
  }[status];

  const Icon = config.icon;

  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.cls)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}



function BulkCategoryDropdown({
  categories,
  onSelect,
  onClose,
}: {
  categories: CategoryOption[];
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) {
      return [...categories].sort((a, b) => (categoryFrequency[b.id] || 0) - (categoryFrequency[a.id] || 0));
    }
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [categories, query]);

  return (
    <div ref={ref} className="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-xl">
      <div className="border-b border-gray-100 p-2">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm danh mục..."
          className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-400">Không tìm thấy</div>
        ) : (
          filtered.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="w-full border-b border-gray-50 px-3 py-1.5 text-left text-xs transition-colors last:border-0 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {cat.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function TransactionTable({
  transactions,
  pagination,
  categories,
  onUpdateCategory,
  onConfirmTransaction,
  onUpdateSplitMode,
  onGoToPage,
  onDeleteTransactions,
  isInsideScrollContext,
}: TransactionTableProps & { isInsideScrollContext?: boolean }) {
  const tableId = useId();
  const [reviewTransactionId, setReviewTransactionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [autoFocusTransactionId, setAutoFocusTransactionId] = useState<string | null>(null);

  // Virtual Scroll State
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants
  const ROW_H = 84; // Fixed height per row allowing for multi-line content
  const VIEWPORT_H = 560; // Max height of scroll context
  const OVERSCAN = 5;

  // Track scrolling if we are inside a scrollable div
  useEffect(() => {
    if (!isInsideScrollContext) return;
    const parentContainer = document.querySelector(`[data-table-id="${tableId}"]`)?.closest('div[style*="overflow"]');
    if (!parentContainer) return;

    const handleScroll = (e: Event) => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setScrollTop((e.target as HTMLDivElement).scrollTop);
      });
    };

    parentContainer.addEventListener('scroll', handleScroll);
    return () => parentContainer.removeEventListener('scroll', handleScroll);
  }, [isInsideScrollContext, tableId]);

  // Compute virtual slicing
  const startIdx = isInsideScrollContext ? Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN) : 0;
  const endIdx = isInsideScrollContext
    ? Math.min(transactions.length - 1, Math.ceil((scrollTop + VIEWPORT_H) / ROW_H) + OVERSCAN)
    : transactions.length - 1;

  const visible = transactions.slice(startIdx, endIdx + 1);
  const paddingTop = isInsideScrollContext ? startIdx * ROW_H : 0;
  const paddingBottom = isInsideScrollContext ? Math.max(0, (transactions.length - endIdx - 1) * ROW_H) : 0;

  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const applyBulkCategory = (categoryId: string) => {
    for (const id of selectedIds) {
      onUpdateCategory(id, categoryId);
    }
    setSelectedIds(new Set());
    setBulkCategoryOpen(false);
  };

  const handleDelete = () => {
    if (!onDeleteTransactions) return;
    onDeleteTransactions(selectedIds);
    setSelectedIds(new Set());
    setConfirmingDelete(false);
  };

  useEffect(() => {
    if (!reviewTransactionId) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setReviewTransactionId(null);
      }
    }

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [reviewTransactionId]);

  useEffect(() => {
    function handleCategoryAutofocus(event: Event) {
      const customEvent = event as CustomEvent<{ transactionId?: string }>;
      const nextTransactionId = customEvent.detail?.transactionId;
      if (nextTransactionId) {
        setAutoFocusTransactionId(nextTransactionId);
      }
    }

    document.addEventListener('category-autofocus', handleCategoryAutofocus as EventListener);
    return () => {
      document.removeEventListener('category-autofocus', handleCategoryAutofocus as EventListener);
    };
  }, []);

  return (
    <>
      {someSelected && (
        <div className="flex items-center gap-3 border-b border-indigo-100 bg-indigo-50 px-4 py-2">
          <span className="text-xs font-semibold text-indigo-700">
            Đã chọn {selectedIds.size} giao dịch
          </span>
          <div className="relative">
            <button
              onClick={() => setBulkCategoryOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-white px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
            >
              <Search className="h-3 w-3" />
              Gán danh mục
            </button>
            {bulkCategoryOpen && (
              <BulkCategoryDropdown
                categories={categories}
                onSelect={applyBulkCategory}
                onClose={() => setBulkCategoryOpen(false)}
              />
            )}
          </div>
          {onDeleteTransactions && (
            confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Xác nhận xóa {selectedIds.size} giao dịch?</span>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                >
                  Xóa
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
                Xóa
              </button>
            )
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-indigo-500 hover:text-indigo-700"
          >
            Bỏ chọn tất cả
          </button>
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div>
          <table data-table-id={tableId} className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Thời gian</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Số tiền</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nội dung</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Phân bổ</th>
                <th className="w-[180px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Danh mục</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Trạng thái</th>
                <th className="w-10 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paddingTop > 0 && <tr style={{ height: paddingTop }}><td colSpan={8} /></tr>}
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Không có giao dịch nào khớp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                visible.map((t) => (
                  <tr
                    key={t.id}
                    style={{ height: ROW_H }}
                    className={clsx(
                      'transition-colors hover:bg-gray-50',
                      selectedIds.has(t.id) && 'bg-indigo-50/50'
                    )}
                  >
                    <td className="px-3 py-2.5 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500 align-middle">{t.raw_date}</td>
                    <td className={clsx('whitespace-nowrap px-3 py-2.5 text-right font-mono text-xs font-semibold align-middle', t.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                      {t.type === 'credit' ? '+' : '-'}{formatAmount(t.normalized_amount)}
                    </td>
                    <td className="px-3 py-2.5 max-w-lg align-middle">
                      <p className="text-xs text-gray-800 line-clamp-3" title={t.raw_desc || ''}>
                        {t.raw_desc}
                      </p>
                      {t.sender_name && (
                        <p className="mt-0.5 text-[10px] text-gray-400 truncate">{t.sender_name}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center align-middle">
                      <select
                        value={t.split_mode}
                        onChange={(e) =>
                          onUpdateSplitMode(
                            t.id,
                            e.target.value as TransactionListItem['split_mode']
                          )
                        }
                        className={clsx(
                          'rounded-md border px-2 py-1 text-xs font-medium cursor-pointer',
                          t.split_mode === 'direct' && 'border-gray-200 bg-gray-50 text-gray-600',
                          t.split_mode === 'horizontal' && 'border-blue-200 bg-blue-50 text-blue-700',
                          t.split_mode === 'vertical' && 'border-amber-200 bg-amber-50 text-amber-700',
                        )}
                      >
                        <option value="direct">Trực tiếp</option>
                        <option value="horizontal">Ngang</option>
                        <option value="vertical">Dọc</option>
                      </select>
                      {t.allocations.length > 1 && (
                        <span className="block mt-0.5 text-[10px] text-gray-400">{t.allocations.length} phân bổ</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <InlineCategorySearch
                        currentName={t.match?.suggested_category_name || null}
                        currentCode={t.match?.suggested_category_code || null}
                        categories={categories}
                        onSelect={(catId) => onUpdateCategory(t.id, catId)}
                        transactionId={t.id}
                        shouldAutoActivate={autoFocusTransactionId === t.id}
                        onAutoActivated={() => {
                          if (autoFocusTransactionId === t.id) {
                            setAutoFocusTransactionId(null);
                          }
                        }}
                      />
                      {t.match && t.match.confidence_score > 0 && (
                        <ConfidenceBadge score={t.match.confidence_score} />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        <StatusBadge status={t.status} />
                        {onConfirmTransaction && t.split_mode === 'direct' && t.status === 'classified' && (
                          <button
                            type="button"
                            onClick={() => onConfirmTransaction(t.id)}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-green-300 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors"
                            title="Xác nhận giao dịch"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => setReviewTransactionId(t.id)}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Xem chi tiết"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {paddingBottom > 0 && <tr style={{ height: paddingBottom }}><td colSpan={8} /></tr>}
            </tbody>
          </table>
          {isInsideScrollContext && transactions.length > 0 && (
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-1.5 text-xs text-gray-400">
              {transactions.length} giao dịch
              {transactions.length > OVERSCAN && ` · hiển thị ${visible.length} trong viewport (cuộn để xem thêm)`}
            </div>
          )}
        </div>

        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">
              Hiển thị {(pagination.page - 1) * pagination.page_size + 1}-
              {Math.min(pagination.page * pagination.page_size, pagination.total_items)} / {pagination.total_items} giao dịch
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onGoToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                .filter((p) => {
                  if (pagination.total_pages <= 7) return true;
                  if (p === 1 || p === pagination.total_pages) return true;
                  return Math.abs(p - pagination.page) <= 1;
                })
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <span key={p}>
                      {showEllipsis && <span className="px-1 text-xs text-gray-400">...</span>}
                      <button
                        onClick={() => onGoToPage(p)}
                        className={clsx(
                          'rounded border px-2.5 py-1 text-xs font-medium',
                          p === pagination.page ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}
              <button
                onClick={() => onGoToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
                className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}

        {pagination.total_pages <= 1 && pagination.total_items > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Tổng cộng {pagination.total_items} giao dịch</p>
          </div>
        )}
      </div>

      {reviewTransactionId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8"
          onClick={() => setReviewTransactionId(null)}
        >
          <div
            className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setReviewTransactionId(null)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50"
              aria-label="Dong popup"
            >
              <X className="h-4 w-4" />
            </button>
            <TransactionDetailView
              transactionId={reviewTransactionId}
              variant="modal"
              onClose={() => setReviewTransactionId(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
