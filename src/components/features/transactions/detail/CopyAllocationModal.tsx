import { useState, useMemo } from 'react';
import { Search, Copy, X } from 'lucide-react';
import clsx from 'clsx';
import type { TransactionListItem } from '../types';
import { useAppStore } from '@/lib/store';

interface CopyAllocationModalProps {
  currentTransactionId: string;
  currentAmount: number;
  onSelect: (donor: TransactionListItem) => void;
  onClose: () => void;
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

export function CopyAllocationModal({
  currentTransactionId,
  currentAmount,
  onSelect,
  onClose,
}: CopyAllocationModalProps) {
  const [query, setQuery] = useState('');

  const bidvTransactions = useAppStore((s) => s.bidvTransactions);
  const agribankTransactions = useAppStore((s) => s.agribankTransactions);

  const candidates = useMemo(() => {
    const all = [...bidvTransactions, ...agribankTransactions];

    const confirmed = all.filter(
      (t) =>
        t.id !== currentTransactionId &&
        t.split_mode === 'horizontal' &&
        t.status === 'confirmed' &&
        t.type === 'credit' &&
        t.allocations.length > 1
    );

    const q = query.toLowerCase();
    const filtered = q
      ? confirmed.filter(
          (t) =>
            t.raw_desc?.toLowerCase().includes(q) ||
            t.sender_name?.toLowerCase().includes(q) ||
            String(t.normalized_amount).includes(q)
        )
      : confirmed;

    return filtered.sort(
      (a, b) =>
        Math.abs(a.normalized_amount - currentAmount) -
        Math.abs(b.normalized_amount - currentAmount)
    );
  }, [bidvTransactions, agribankTransactions, currentTransactionId, currentAmount, query]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Sao chép phân bổ</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Chọn giao dịch ngang đã xác nhận để sao chép cấu trúc phân bổ. Ưu tiên số tiền gần nhất.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo mô tả, người chuyển, hoặc số tiền..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Số tiền giao dịch hiện tại: <strong className="text-gray-600">{VN_NUMBER.format(currentAmount)} đ</strong>
          </p>
        </div>

        <div className="max-h-[400px] overflow-y-auto px-5 py-3">
          {candidates.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Không tìm thấy giao dịch ngang đã xác nhận nào.
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((t) => {
                const amountDiff = Math.abs(t.normalized_amount - currentAmount);
                const isExact = amountDiff === 0;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelect(t);
                      onClose();
                    }}
                    className={clsx(
                      'group w-full rounded-lg border p-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50',
                      isExact ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-800" title={t.raw_desc || ''}>
                          {t.raw_desc}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                          <span>{t.raw_date.split(' ')[0]}</span>
                          {t.sender_name && (
                            <>
                              <span>·</span>
                              <span>{t.sender_name}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{t.allocations.length} phân bổ</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {t.allocations.map((a) => (
                            <span
                              key={a.id}
                              className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                            >
                              {a.confirmed_category_name || a.suggested_category_name || '?'}:{' '}
                              {VN_NUMBER.format(a.amount)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-sm font-semibold text-green-600">
                          {VN_NUMBER.format(t.normalized_amount)}
                        </span>
                        {isExact ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                            Bằng số tiền
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            Chênh lệch: {VN_NUMBER.format(amountDiff)}
                          </span>
                        )}
                        <Copy className="mt-1 h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-500" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
